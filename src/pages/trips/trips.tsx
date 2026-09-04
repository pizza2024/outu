import { View, Text, ITouchEvent } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useRef, useState } from 'react'
import { deleteHistory, getHistory, pushHistory, savePlan } from '../../store/plan'
import { GenTask, getTasks, removeTask, updateTask } from '../../store/task'
import { apiPost } from '../../utils/api'
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
  const [tasks, setTasks] = useState<GenTask[]>([])
  /** 当前滑开的卡片 id */
  const [openId, setOpenId] = useState<string | null>(null)
  /** 拖拽中的位移 {id, x}，松手后由 openId 决定最终位置 */
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null)
  const touch = useRef({ startX: 0, startY: 0, baseX: 0, swiping: false })
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = () => {
    setHistory(getHistory())
    setTasks(getTasks())
  }

  /** 轮询生成中的任务：完成则入库并刷新（pushHistory 按 plan_id 去重，重复轮询安全） */
  const pollTasks = async () => {
    const pending = getTasks().filter((t) => t.status === 'generating')
    if (!pending.length) return
    for (const t of pending) {
      // 超时兜底：超过 8 分钟未完成的任务标记失败（后端重启丢任务、LLM 挂起等情况）
      if (Date.now() - t.created_at > 8 * 60 * 1000) {
        updateTask(t.job_id, { status: 'error', error: '生成超时，请重新生成' })
        continue
      }
      try {
        const r = await apiPost<{ status: string; plan?: TravelPlan; error?: string }>(
          '/api/plan/result',
          { job_id: t.job_id }
        )
        if (r?.status === 'done' && r.plan) {
          pushHistory(r.plan)
          updateTask(t.job_id, { status: 'done', plan_id: r.plan.plan_id })
        } else if (r?.status === 'error') {
          updateTask(t.job_id, { status: 'error', error: r.error })
        }
      } catch {
        /* 网络波动，下一轮再试 */
      }
    }
    refresh()
  }

  useDidShow(() => {
    refresh()
    setOpenId(null)
    setDrag(null)
    pollTasks()
    pollTimer.current = setInterval(pollTasks, 5000)
  })

  useDidHide(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  })

  /** 任务卡片点击：已生成→打开方案；失败→重新填写；生成中→提示 */
  const onTaskClick = (t: GenTask) => {
    if (t.status === 'done') {
      const plan = getHistory().find((p) => p.plan_id === t.plan_id)
      removeTask(t.job_id)
      refresh()
      if (plan) openPlan(plan)
      return
    }
    if (t.status === 'error') {
      removeTask(t.job_id)
      refresh()
      Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
      return
    }
    Taro.showToast({ title: '仍在生成中，请稍候…', icon: 'none' })
  }

  const dismissTask = (t: GenTask) => {
    removeTask(t.job_id)
    refresh()
  }

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

      {/* 生成任务卡片：生成中 / 已生成 / 失败 */}
      {tasks.map((t) => (
        <View key={t.job_id} className={`task-card task-${t.status}`} onClick={() => onTaskClick(t)}>
          <Text className='task-icon'>
            {t.status === 'generating' ? '🕊️' : t.status === 'done' ? '✅' : '❌'}
          </Text>
          <View className='task-main'>
            <Text className='task-title'>
              {t.status === 'generating'
                ? `正在生成「${t.dest}」行程…`
                : t.status === 'done'
                  ? `「${t.dest}」行程已生成`
                  : `「${t.dest}」生成失败`}
            </Text>
            <Text className='task-sub'>
              {t.status === 'generating'
                ? '可以先去别处逛逛，完成后这里会提醒你'
                : t.status === 'done'
                  ? '点击查看完整方案'
                  : '点击重新填写问卷'}
            </Text>
          </View>
          {t.status === 'generating' ? (
            <View className='task-spinner' />
          ) : (
            <Text
              className='task-close'
              onClick={(e) => {
                e.stopPropagation()
                dismissTask(t)
              }}
            >
              ✕
            </Text>
          )}
        </View>
      ))}

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
