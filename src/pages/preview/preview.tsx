import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useState } from 'react'
import { getPlan, recalcBudget, savePlan } from '../../store/plan'
import { ScheduleItem, TravelPlan } from '../../types'
import './preview.scss'

const ACT_ICON: Record<string, string> = {
  sightseeing: '📍', dining: '🍜', transport: '🚌',
  accommodation: '🏨', shopping: '🛍️', entertainment: '🎡', rest: '☕'
}

export default function Preview() {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [day, setDay] = useState(0)
  const [expanded, setExpanded] = useState(-1)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useDidShow(() => {
    setPlan(getPlan())
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

  const current = plan.daily_plans[day] || plan.daily_plans[0]

  const update = (next: TravelPlan) => {
    recalcBudget(next)
    setPlan({ ...next })
    savePlan(next)
  }

  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...current.schedule]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    current.schedule = arr
    update(plan)
  }

  const remove = (idx: number) => {
    current.schedule = current.schedule.filter((_, i) => i !== idx)
    update(plan)
  }

  const addNode = () => {
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
    current.schedule = [...current.schedule, node]
    setNewTitle('')
    setAdding(false)
    update(plan)
  }

  return (
    <View className='preview'>
      {/* 方案头 */}
      <View className='plan-head'>
        <Text className='plan-title'>{plan.summary.title}</Text>
        <Text className='plan-meta'>
          {plan.summary.duration_label} · 预算约 ¥{plan.budget_breakdown.total_estimated}
        </Text>
      </View>

      {/* 每日 Tab */}
      <ScrollView className='day-tabs' scrollX>
        {plan.daily_plans.map((d, i) => (
          <View key={d.day} className={`day-tab ${i === day ? 'day-tab-on' : ''}`} onClick={() => { setDay(i); setExpanded(-1) }}>
            <Text className={`day-tab-text ${i === day ? 'day-tab-text-on' : ''}`}>D{d.day}</Text>
            <Text className={`day-tab-date ${i === day ? 'day-tab-text-on' : ''}`}>{d.date.slice(5)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 时间轴 */}
      <ScrollView className='timeline' scrollY>
        <Text className='day-theme'>{current.theme} · {current.highlights.join(' / ')}</Text>
        {current.schedule.map((s, i) => (
          <View key={i} className='node'>
            <View className='node-time'>
              <Text className='node-start'>{s.start_time}</Text>
              <View className='node-line' />
            </View>
            <View className='node-card' onClick={() => !editing && setExpanded(expanded === i ? -1 : i)}>
              <View className='node-head'>
                <Text className='node-icon'>{ACT_ICON[s.activity_type] || '📌'}</Text>
                <Text className='node-title'>{s.title}</Text>
                {s.estimated_cost.amount > 0 && (
                  <Text className='node-cost'>¥{s.estimated_cost.amount}</Text>
                )}
              </View>
              {expanded === i && (
                <View className='node-detail'>
                  <Text className='node-desc'>{s.description}</Text>
                  {!!s.location.address && <Text className='node-sub'>📍 {s.location.address}</Text>}
                  {!!s.tips && <Text className='node-tips'>💡 {s.tips}</Text>}
                </View>
              )}
              {editing && (
                <View className='node-tools'>
                  <Text className='tool' onClick={() => move(i, -1)}>↑ 上移</Text>
                  <Text className='tool' onClick={() => move(i, 1)}>↓ 下移</Text>
                  <Text className='tool tool-danger' onClick={() => remove(i)}>✕ 删除</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {editing && (
          <View className='add-area'>
            {adding ? (
              <View className='add-form'>
                <Input
                  className='add-input'
                  placeholder='输入自定义行程，如：傍晚去夜市'
                  placeholderClass='add-ph'
                  value={newTitle}
                  onInput={(e) => setNewTitle(e.detail.value)}
                />
                <View className='add-ok' onClick={addNode}>
                  <Text className='add-ok-text'>添加</Text>
                </View>
              </View>
            ) : (
              <View className='add-trigger' onClick={() => setAdding(true)}>
                <Text className='add-trigger-text'>＋ 添加自定义节点</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ height: '160px' }} />
      </ScrollView>

      {/* 底部操作栏 */}
      <View className='actions'>
        <View className={`act ${editing ? 'act-on' : ''}`} onClick={() => setEditing(!editing)}>
          <Text className={`act-text ${editing ? 'act-text-on' : ''}`}>{editing ? '完成' : '微调'}</Text>
        </View>
        <View className='act act-primary' onClick={() => Taro.navigateTo({ url: '/pages/pdf/pdf' })}>
          <Text className='act-text act-text-light'>生成PDF</Text>
        </View>
        <View className='act' onClick={() => Taro.showToast({ title: '点右上角「···」分享', icon: 'none' })}>
          <Text className='act-text'>分享</Text>
        </View>
      </View>
    </View>
  )
}
