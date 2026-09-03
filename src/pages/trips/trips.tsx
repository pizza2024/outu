import { View, Text, ITouchEvent } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useRef, useState } from 'react'
import { deleteHistory, getHistory, savePlan } from '../../store/plan'
import { TravelPlan } from '../../types'
import './trips.scss'

/**
 * 删除按钮宽度：scss 里写 160rpx，这里换算成物理 px。
 * 本项目 designWidth=750 且 deviceRatio 750:1，即 scss 1px=1rpx=screenWidth/750 物理 px，
 * 而触摸事件与内联 transform 用的是物理 px，必须换算，否则按钮区和滑动距离对不上。
 */
const ACTION_W = (160 * Taro.getWindowInfo().screenWidth) / 750

export default function Trips() {
  const [history, setHistory] = useState<TravelPlan[]>([])
  /** 当前滑开的卡片 id */
  const [openId, setOpenId] = useState<string | null>(null)
  /** 拖拽中的位移 {id, x}，松手后由 openId 决定最终位置 */
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null)
  const touch = useRef({ startX: 0, startY: 0, baseX: 0, swiping: false })

  useDidShow(() => {
    setHistory(getHistory())
    setOpenId(null)
    setDrag(null)
  })

  const openPlan = (p: TravelPlan) => {
    if (openId) {
      setOpenId(null)
      return
    }
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  /* ===== 左滑手势 ===== */
  const offsetOf = (id: string): number => {
    if (drag && drag.id === id) return drag.x
    return openId === id ? -ACTION_W : 0
  }

  const onTouchStart = (e: ITouchEvent, id: string) => {
    const t = e.touches[0]
    touch.current = {
      startX: t.clientX,
      startY: t.clientY,
      baseX: openId === id ? -ACTION_W : 0,
      swiping: false
    }
  }

  const onTouchMove = (e: ITouchEvent, id: string) => {
    const t = e.touches[0]
    const dx = t.clientX - touch.current.startX
    const dy = t.clientY - touch.current.startY
    // 水平位移明显大于垂直位移才判定为横向滑动，避免和页面滚动打架
    if (!touch.current.swiping) {
      if (Math.abs(dx) < 10) return
      if (Math.abs(dx) < Math.abs(dy)) return
      touch.current.swiping = true
    }
    const x = Math.min(0, Math.max(-ACTION_W, touch.current.baseX + dx))
    setDrag({ id, x })
  }

  const onTouchEnd = (id: string) => {
    if (!touch.current.swiping) return
    const x = drag && drag.id === id ? drag.x : touch.current.baseX
    setOpenId(x < -ACTION_W / 2 ? id : null)
    setDrag(null)
    touch.current.swiping = false
  }

  /* ===== 删除 ===== */
  const onDelete = (p: TravelPlan) => {
    Taro.showModal({
      title: '删除行程',
      content: `确定删除「${p.summary.title}」吗？`,
      confirmText: '删除',
      confirmColor: '#E8503A',
      success: (res) => {
        if (res.confirm) {
          deleteHistory(p.plan_id)
          setHistory(getHistory())
          setOpenId(null)
        }
      }
    })
  }

  return (
    <View className='trips'>
      <View className='trips-head'>
        <Text className='trips-title'>我的行程</Text>
        <Text className='trips-sub'>每一次出发，都值得好好规划</Text>
      </View>

      {history.length === 0 ? (
        <View className='trips-empty'>
          <Text className='trips-empty-emoji'>🕊️</Text>
          <Text className='trips-empty-text'>还没有行程</Text>
          <Text className='trips-empty-sub'>让 AI 帮你规划第一次旅行吧</Text>
          <View className='trips-empty-btn' onClick={createNew}>
            <Text className='trips-empty-btn-text'>去规划 →</Text>
          </View>
        </View>
      ) : (
        history.map((p) => {
          const offset = offsetOf(p.plan_id)
          const dragging = drag?.id === p.plan_id
          return (
            <View key={p.plan_id} className='swipe-wrap'>
              {/* 滑开后露出的删除按钮 */}
              <View className='swipe-actions'>
                <View className='swipe-btn swipe-delete' onClick={() => onDelete(p)}>
                  <Text className='swipe-btn-text'>删除</Text>
                </View>
              </View>

              {/* 卡片本体（随手势平移） */}
              <View
                className={`trip-card ${dragging ? '' : 'trip-card-anim'}`}
                style={{ transform: `translateX(${offset}px)` }}
                onTouchStart={(e) => onTouchStart(e, p.plan_id)}
                onTouchMove={(e) => onTouchMove(e, p.plan_id)}
                onTouchEnd={() => onTouchEnd(p.plan_id)}
                onClick={() => openPlan(p)}
              >
                <View className='trip-main'>
                  <Text className='trip-title'>{p.summary.title}</Text>
                  <View className='trip-meta-row'>
                    <Text className='trip-meta'>{p.summary.duration_label}</Text>
                    <Text className='trip-dot'>·</Text>
                    <Text className='trip-meta'>{p.generated_at.slice(0, 10)}</Text>
                  </View>
                  <View className='trip-tags'>
                    <Text className='trip-budget'>预算 ¥{p.budget_breakdown.total_estimated.toLocaleString()}</Text>
                    {p.summary.theme_tags.slice(0, 2).map((t) => (
                      <Text key={t} className='trip-tag'>{t}</Text>
                    ))}
                  </View>
                </View>
                <Text className='trip-arrow'>›</Text>
              </View>
            </View>
          )
        })
      )}

      {/* 悬浮新建按钮 */}
      <View className='fab' onClick={createNew}>
        <Text className='fab-icon'>＋</Text>
      </View>
    </View>
  )
}
