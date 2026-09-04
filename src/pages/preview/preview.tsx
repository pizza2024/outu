import { View, Text, ScrollView, Input, Button, Image } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useRef, useState } from 'react'
import { getPlan, getTodoDone, recalcBudget, savePlan, toggleTodoDone } from '../../store/plan'
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
      </View>
    </View>
  )
}
