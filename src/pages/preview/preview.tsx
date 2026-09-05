import { View, Text, ScrollView, Input, Button, Image, Canvas } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useRef, useState } from 'react'
import { getPlan, getTodoDone, recalcBudget, savePlan, toggleTodoDone } from '../../store/plan'
import { apiPost } from '../../utils/api'
import { ScheduleItem, TodoItem, TravelPlan } from '../../types'
import './preview.scss'

const ACT_ICON: Record<string, string> = {
  sightseeing: '📍', dining: '🍜', transport: '🚌',
  accommodation: '🏨', shopping: '🛍️', entertainment: '🎡', rest: '☕'
}

const TODO_ICON: Record<string, string> = {
  booking: '🎫', document: '🪪', packing: '🧳', other: '✅'
}

/** 本地时区 YYYY-MM-DD */
function todayLocal(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function nowHM(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

export default function Preview() {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [doneTodos, setDoneTodos] = useState<string[]>([])
  const [expanded, setExpanded] = useState('')
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(-1)
  const [newTitle, setNewTitle] = useState('')
  /** scroll-into-view 目标锚点 */
  const [anchor, setAnchor] = useState('')
  /** 海报弹层 */
  const [posterUrl, setPosterUrl] = useState('')
  const [posterOpen, setPosterOpen] = useState(false)
  const [posterLoading, setPosterLoading] = useState(false)
  /** 当前虚线锚点 id（旅行进行中才有值） */
  const nowAnchor = useRef('')
  /** 进行中节点 id */
  const ongoingId = useRef('')

  useDidShow(() => {
    const p = getPlan()
    setPlan(p)
    if (p) {
      setDoneTodos(getTodoDone(p.plan_id))
      nowAnchor.current = locateNow(p)
      ongoingId.current = locateOngoing(p)
      // 旅行进行中：渲染完成后自动滚动到当前时间；未开始则停留在顶部
      if (nowAnchor.current) {
        setAnchor('')
        setTimeout(() => setAnchor(nowAnchor.current), 400)
      }
    }
  })

  useShareAppMessage(() => ({
    title: plan ? `我的${plan.summary.destination_label}旅行方案，鸥途帮我规划好了` : '鸥途 · AI 旅行助手',
    path: '/pages/launch/launch'
  }))
  useShareTimeline(() => ({
    title: plan
      ? `${plan.summary.destination_label}${plan.summary.duration_label}旅行方案 · 鸥途 AI 规划`
      : '鸥途 · AI 旅行助手'
  }))

  if (!plan) {
    return (
      <View className='empty'>
        <Text className='empty-text'>暂无行程方案，先去创建一个吧</Text>
      </View>
    )
  }

  /** 计算当前时间在全程时间线中的位置，返回应滚动到的节点 id；不在旅行期间返回 '' */
  function locateNow(p: TravelPlan): string {
    const today = todayLocal()
    const hm = nowHM()
    const dayIdx = p.daily_plans.findIndex((d) => d.date === today)
    if (dayIdx < 0) return ''
    const schedule = p.daily_plans[dayIdx].schedule
    for (let i = 0; i < schedule.length; i++) {
      // 虚线贴在「第一个还没开始的节点」之前
      if (schedule[i].start_time > hm) return `n-${dayIdx}-${i}`
    }
    return `day-end-${dayIdx}`
  }

  /** 正在进行中的节点 id（start <= now <= end），用于高亮；没有则返回 '' */
  function locateOngoing(p: TravelPlan): string {
    const today = todayLocal()
    const hm = nowHM()
    const dayIdx = p.daily_plans.findIndex((d) => d.date === today)
    if (dayIdx < 0) return ''
    const schedule = p.daily_plans[dayIdx].schedule
    for (let i = 0; i < schedule.length; i++) {
      const s = schedule[i]
      if (s.start_time <= hm && hm <= (s.end_time || s.start_time)) return `n-${dayIdx}-${i}`
    }
    return ''
  }

  const backToNow = () => {
    if (!nowAnchor.current) return
    setAnchor('')
    setTimeout(() => setAnchor(nowAnchor.current), 50)
  }

  /* ===== 待办 ===== */
  const todos: TodoItem[] = plan.preparation?.length
    ? plan.preparation!
    : [
        { title: '预订往返大交通', detail: '锁定车票/机票', due_date: '', category: 'booking' },
        { title: '预订酒店', detail: '确认住宿并支付', due_date: '', category: 'booking' },
        { title: '预约热门景点', detail: '部分场馆需实名预约', due_date: '', category: 'booking' },
        { title: '准备行李', detail: '按打包清单逐项核对', due_date: '', category: 'packing' }
      ]

  const toggleTodo = (key: string) => {
    setDoneTodos(toggleTodoDone(plan.plan_id, key))
  }

  /* ===== 微调编辑 ===== */
  const update = (next: TravelPlan) => {
    recalcBudget(next)
    setPlan({ ...next })
    savePlan(next)
  }

  const move = (dayIdx: number, idx: number, dir: -1 | 1) => {
    const arr = [...plan.daily_plans[dayIdx].schedule]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    plan.daily_plans[dayIdx].schedule = arr
    update(plan)
  }

  const remove = (dayIdx: number, idx: number) => {
    plan.daily_plans[dayIdx].schedule = plan.daily_plans[dayIdx].schedule.filter((_, i) => i !== idx)
    update(plan)
  }

  const addNode = (dayIdx: number) => {
    const title = newTitle.trim()
    if (!title) return
    const node: ScheduleItem = {
      time_slot: 'afternoon', start_time: '14:00', end_time: '16:00',
      activity_type: 'sightseeing', title, description: '手动添加的自定义行程节点',
      location: { name: title, address: '', latitude: 0, longitude: 0 },
      estimated_cost: { amount: 0, currency: 'CNY', per_person: true },
      booking_info: { provider: '', deep_link: '', booking_type: 'none' },
      tips: '', image_url: ''
    }
    plan.daily_plans[dayIdx].schedule = [...plan.daily_plans[dayIdx].schedule, node]
    setNewTitle('')
    setAdding(-1)
    update(plan)
  }

  /* ===== 分享海报：canvas 绘制 600x960（逻辑 300x480，按 dpr 放大保证清晰） ===== */
  const makePoster = async () => {
    if (posterLoading || !plan) return
    setPosterLoading(true)
    try {
      // 1) 取小程序码（未发布的小程序接口会报错，降级为无码海报）
      let qrPath = ''
      try {
        const env = Taro.getAccountInfoSync().miniProgram.envVersion
        const qr = await apiPost<{ ok: boolean; image?: string; error?: string }>(
          '/api/poster/qrcode',
          { scene: plan.plan_id.slice(0, 32), env_version: env === 'release' ? 'release' : 'trial' }
        )
        if (qr?.ok && qr.image) {
          qrPath = `${(Taro as any).env?.USER_DATA_PATH}/qr_${Date.now()}.png`
          await new Promise<void>((resolve, reject) => {
            Taro.getFileSystemManager().writeFile({
              filePath: qrPath, data: qr.image!, encoding: 'base64',
              success: () => resolve(), fail: reject
            })
          })
        }
      } catch { /* 无码降级 */ }

      // 2) 绘制
      const node: any = await new Promise((resolve, reject) => {
        Taro.createSelectorQuery()
          .select('#posterCv')
          .fields({ node: true, size: true } as any)
          .exec((res) => (res?.[0]?.node ? resolve(res[0].node) : reject(new Error('canvas 未就绪'))))
      })
      const dpr = Taro.getWindowInfo().pixelRatio || 2
      const W = 300
      const H = 480
      node.width = W * dpr
      node.height = H * dpr
      const ctx = node.getContext('2d')
      ctx.scale(dpr, dpr)

      // 白底
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, W, H)

      // 顶部蓝色渐变区
      const grad = ctx.createLinearGradient(0, 0, W, 170)
      grad.addColorStop(0, '#4DA3FF')
      grad.addColorStop(1, '#1F63E0')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, 170)

      const ellipsize = (text: string, maxW: number, font: string): string => {
        ctx.font = font
        if (ctx.measureText(text).width <= maxW) return text
        let t = text
        while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
        return t + '…'
      }

      // 头部文案
      ctx.fillStyle = '#FFFFFF'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = 'bold 26px sans-serif'
      ctx.fillText(ellipsize(plan.summary.destination_label, 200, 'bold 26px sans-serif'), 20, 56)
      ctx.font = '16px sans-serif'
      ctx.fillText(plan.summary.duration_label, 20, 92)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(ellipsize(plan.summary.theme_tags.join(' · ') || 'AI 定制行程', 240, '12px sans-serif'), 20, 122)
      // 海鸥标记
      ctx.font = '34px sans-serif'
      ctx.fillText('🕊️', 238, 60)

      // 行程亮点
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('行程亮点', 20, 200)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#444444'
      plan.daily_plans.slice(0, 5).forEach((d, i) => {
        ctx.fillText(ellipsize(`Day${d.day} · ${d.theme}`, 250, '12px sans-serif'), 20, 228 + i * 26)
      })

      // 预算
      ctx.font = 'bold 14px sans-serif'
      ctx.fillStyle = '#2E7CF6'
      ctx.fillText(`人均预算 ¥${perPerson.toLocaleString()}`, 20, 376)

      // 底部分隔线
      ctx.strokeStyle = '#EEEEEE'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(20, 400)
      ctx.lineTo(280, 400)
      ctx.stroke()

      // 底部品牌 + 小程序码
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('鸥途 · AI 旅行助手', 20, 428)
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#999999'
      ctx.fillText(qrPath ? '长按识别小程序码，规划同款行程' : '微信搜索「鸥途」小程序，规划同款行程', 20, 452)

      if (qrPath) {
        const img = node.createImage()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = qrPath
        })
        ctx.drawImage(img, 216, 408, 64, 64)
      }

      // 3) 导出图片
      const out = await new Promise<string>((resolve, reject) => {
        Taro.canvasToTempFilePath({
          canvas: node,
          success: (r) => resolve(r.tempFilePath),
          fail: reject
        } as any)
      })
      setPosterUrl(out)
      setPosterOpen(true)
    } catch (e: any) {
      Taro.showToast({ title: '海报生成失败，请重试', icon: 'none' })
    } finally {
      setPosterLoading(false)
    }
  }

  const perPerson = plan.budget_breakdown.total_estimated
  const inTrip = !!nowAnchor.current
  const today = todayLocal()
  const nowId = nowAnchor.current

  return (
    <View className='preview'>
      <ScrollView
        className='preview-scroll'
        scrollY
        scrollWithAnimation
        scrollIntoView={anchor}
        enhanced
        showScrollbar={false}
      >
        {/* 头部概要卡：缩略图 + 标题 + 标签 + 人均预算 */}
        <View className='done-head' id='top'>
          {plan.summary.cover_image_url ? (
            <Image className='done-thumb' src={plan.summary.cover_image_url} mode='aspectFill' />
          ) : (
            <View className='done-thumb done-thumb-ph'>
              <Text className='done-thumb-emoji'>🏞️</Text>
            </View>
          )}
          <View className='done-main'>
            <View className='done-row'>
              <Text className='done-title'>{plan.summary.duration_label} · {plan.summary.destination_label}</Text>
              <Text className='done-budget'>人均预算 ¥{perPerson.toLocaleString()}</Text>
            </View>
            {plan.summary.theme_tags.length > 0 && (
              <View className='done-tags'>
                {plan.summary.theme_tags.slice(0, 4).map((t) => (
                  <Text key={t} className='done-tag'>{t}</Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 行前待办：订票预约等事项，全部排在时间线最开头 */}
        <View className='todo-card'>
          <View className='todo-head'>
            <Text className='todo-title'>🧾 出发前待办</Text>
            <Text className='todo-progress'>{doneTodos.length}/{todos.length}</Text>
          </View>
          {todos.map((t, i) => {
            const key = `${i}-${t.title}`
            const done = doneTodos.includes(key)
            return (
              <View key={key} className={`todo-item ${done ? 'todo-item-done' : ''}`} onClick={() => toggleTodo(key)}>
                <View className={`todo-check ${done ? 'todo-check-done' : ''}`}>
                  {done && <Text className='todo-check-mark'>✓</Text>}
                </View>
                <View className='todo-main'>
                  <Text className={`todo-name ${done ? 'todo-name-done' : ''}`}>
                    {TODO_ICON[t.category] || TODO_ICON.other} {t.title}
                  </Text>
                  {!!t.detail && <Text className='todo-detail'>{t.detail}</Text>}
                </View>
                {!!t.due_date && <Text className='todo-due'>{t.due_date.slice(5)} 前</Text>}
                <Text className='todo-chevron'>›</Text>
              </View>
            )
          })}
        </View>

        {/* 全程时间线（所有天连续一条竖线，可上下滑动） */}
        <View className='timeline'>
          {plan.daily_plans.map((d, dayIdx) => {
            const isToday = d.date === today
            return (
              <View key={d.day} className='tl-day'>
                {/* 天标记 */}
                <View className='tl-day-head' id={`day-${dayIdx}`}>
                  <View className={`tl-day-dot ${isToday ? 'tl-day-dot-today' : ''}`} />
                  <View className='tl-day-info'>
                    <Text className={`tl-day-title ${isToday ? 'tl-day-title-today' : ''}`}>
                      Day {d.day} · {d.theme}
                    </Text>
                    <Text className='tl-day-date'>{d.date}{isToday ? ' · 今天' : ''}</Text>
                  </View>
                </View>

                {/* 当日时间节点 */}
                {d.schedule.map((s, i) => {
                  const nodeId = `n-${dayIdx}-${i}`
                  const isNow = nowId === nodeId
                  const ongoing = ongoingId.current === nodeId
                  const open = expanded === nodeId
                  return (
                    <View key={nodeId}>
                      {isNow && (
                        <View className='now-line' id='now-line'>
                          <Text className='now-label'>现在 {nowHM()}</Text>
                          <View className='now-dash' />
                        </View>
                      )}
                      <View className='tl-node' id={nodeId}>
                        <View className='tl-time'>
                          <Text className='tl-time-text'>{s.start_time}</Text>
                        </View>
                        <View className='tl-track'>
                          <View className={`tl-node-dot ${ongoing ? 'tl-node-dot-on' : ''}`} />
                        </View>
                        <View className={`tl-card ${ongoing ? 'tl-card-on' : ''}`} onClick={() => !editing && setExpanded(open ? '' : nodeId)}>
                          <View className='tl-card-head'>
                            <Text className='tl-icon'>{ACT_ICON[s.activity_type] || '📌'}</Text>
                            <Text className='tl-name'>{s.title}</Text>
                            {ongoing && <Text className='tl-ongoing'>进行中</Text>}
                            {s.estimated_cost.amount > 0 && (
                              <Text className='tl-cost'>¥{s.estimated_cost.amount}</Text>
                            )}
                          </View>
                          {open && (
                            <View className='tl-detail'>
                              <Text className='tl-time-range'>{s.start_time} - {s.end_time}</Text>
                              {!!s.description && <Text className='tl-desc'>{s.description}</Text>}
                              {!!s.location.address && <Text className='tl-sub'>📍 {s.location.address}</Text>}
                              {!!s.tips && <Text className='tl-tips'>💡 {s.tips}</Text>}
                            </View>
                          )}
                          {editing && (
                            <View className='node-tools'>
                              <Text className='tool' onClick={() => move(dayIdx, i, -1)}>↑ 上移</Text>
                              <Text className='tool' onClick={() => move(dayIdx, i, 1)}>↓ 下移</Text>
                              <Text className='tool tool-danger' onClick={() => remove(dayIdx, i)}>✕ 删除</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}

                {/* 当前时间晚于当天所有节点时，虚线落在当天末尾 */}
                {nowId === `day-end-${dayIdx}` && (
                  <View className='now-line' id='now-line'>
                    <Text className='now-label'>现在 {nowHM()}</Text>
                    <View className='now-dash' />
                  </View>
                )}

                {/* 编辑模式：添加自定义节点 */}
                {editing && (
                  <View className='add-area'>
                    {adding === dayIdx ? (
                      <View className='add-form'>
                        <Input
                          className='add-input'
                          placeholder='输入自定义行程，如：傍晚去夜市'
                          placeholderClass='add-ph'
                          value={newTitle}
                          onInput={(e) => setNewTitle(e.detail.value)}
                        />
                        <View className='add-ok' onClick={() => addNode(dayIdx)}>
                          <Text className='add-ok-text'>添加</Text>
                        </View>
                      </View>
                    ) : (
                      <View className='add-trigger' onClick={() => setAdding(dayIdx)}>
                        <Text className='add-trigger-text'>＋ 添加自定义节点</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <View style={{ height: '220px' }} />
      </ScrollView>

      {/* 旅行进行中：回到当前时间 */}
      {inTrip && (
        <View className='now-fab' onClick={backToNow}>
          <Text className='now-fab-text'>回到当前</Text>
        </View>
      )}

      {/* 底部操作栏 */}
      <View className='actions'>
        <View className='actions-row'>
          <View className={`act ${editing ? 'act-on' : ''}`} onClick={() => { setEditing(!editing); setAdding(-1) }}>
            <Text className={`act-text ${editing ? 'act-text-on' : ''}`}>{editing ? '✓ 完成' : '🎚 微调'}</Text>
          </View>
          <View className='act act-primary' onClick={() => Taro.showToast({ title: '已保存到行程', icon: 'success' })}>
            <Text className='act-text act-text-light'>💾 保存行程</Text>
          </View>
          <View className='act' onClick={() => Taro.navigateTo({ url: '/pages/pdf/pdf' })}>
            <Text className='act-text'>🖼 长图</Text>
          </View>
        </View>
        <Button className='share-btn' openType='share' hoverClass='share-btn-hover'>分享给伙伴 ›</Button>
        <View className='poster-btn' onClick={makePoster}>
          <Text className='poster-btn-text'>{posterLoading ? '海报生成中…' : '🎨 生成分享海报'}</Text>
        </View>
      </View>

      {/* 海报弹层：长按可保存或发送给朋友 */}
      {posterOpen && (
        <View className='poster-mask' onClick={() => setPosterOpen(false)}>
          <View className='poster-modal' onClick={(e) => e.stopPropagation()}>
            <Image className='poster-img' src={posterUrl} mode='widthFix' showMenuByLongpress />
            <Text className='poster-hint'>长按图片，保存或发送给朋友</Text>
            <View className='poster-close' onClick={() => setPosterOpen(false)}>
              <Text className='poster-close-text'>关闭</Text>
            </View>
          </View>
        </View>
      )}

      {/* 隐藏的海报画布 */}
      <Canvas type='2d' id='posterCv' className='poster-canvas' />
    </View>
  )
}
