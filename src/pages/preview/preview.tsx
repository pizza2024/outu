import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
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
  const [openDay, setOpenDay] = useState(0)
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
    setAdding(false)
    update(plan)
  }

  const perPerson = plan.budget_breakdown.total_estimated

  return (
    <View className='preview'>
      <ScrollView className='preview-scroll' scrollY>
        {/* 成功头 */}
        <View className='done-head'>
          <Text className='done-title'>你的专属行程已生成 🎉</Text>
          <View className='done-meta'>
            <Text className='done-route'>{plan.summary.duration_label} · {plan.summary.destination_label}之旅</Text>
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

        {/* 路线概览卡（地图占位） */}
        <View className='map-card'>
          <View className='map-route'>
            {plan.daily_plans.slice(0, 4).map((d, i) => (
              <View key={d.day} className='map-stop'>
                <View className={`map-dot ${i === 0 ? 'map-dot-start' : ''}`}>
                  <Text className='map-dot-num'>{d.day}</Text>
                </View>
                <Text className='map-stop-name'>{d.highlights[0] || d.theme}</Text>
                {i < Math.min(plan.daily_plans.length, 4) - 1 && <View className='map-line' />}
              </View>
            ))}
          </View>
          <Text className='map-hint'>🗺️ {plan.summary.destination_label} · 路线概览</Text>
        </View>

        {/* 每日行程卡 */}
        {plan.daily_plans.map((d, dayIdx) => {
          const open = openDay === dayIdx
          const firstSpot = d.schedule.find((s) => s.activity_type === 'sightseeing')
          return (
            <View key={d.day} className='day-card'>
              <View className='day-head' onClick={() => { setOpenDay(open ? -1 : dayIdx); setExpanded(-1) }}>
                <View className='day-head-main'>
                  <View className='day-badge'><Text className='day-badge-text'>DAY {d.day}</Text></View>
                  <Text className='day-theme'>{d.theme}</Text>
                  <Text className='day-spots'>{d.highlights.join(' → ')}</Text>
                  <Text className='day-date'>{d.date}</Text>
                </View>
                <View className='day-thumb'>
                  <Text className='day-thumb-emoji'>{ACT_ICON[firstSpot?.activity_type || 'sightseeing']}</Text>
                </View>
              </View>

              {open && (
                <View className='day-detail'>
                  {d.schedule.map((s, i) => (
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
                            <Text className='tool' onClick={() => move(dayIdx, i, -1)}>↑ 上移</Text>
                            <Text className='tool' onClick={() => move(dayIdx, i, 1)}>↓ 下移</Text>
                            <Text className='tool tool-danger' onClick={() => remove(dayIdx, i)}>✕ 删除</Text>
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
                          <View className='add-ok' onClick={() => addNode(dayIdx)}>
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
                </View>
              )}
            </View>
          )
        })}

        <View style={{ height: '200px' }} />
      </ScrollView>

      {/* 底部操作栏 */}
      <View className='actions'>
        <View className='actions-row'>
          <View className={`act ${editing ? 'act-on' : ''}`} onClick={() => setEditing(!editing)}>
            <Text className={`act-text ${editing ? 'act-text-on' : ''}`}>{editing ? '✓ 完成' : '✏️ 微调'}</Text>
          </View>
          <View className='act act-primary' onClick={() => Taro.showToast({ title: '已保存到行程', icon: 'success' })}>
            <Text className='act-text act-text-light'>💾 保存行程</Text>
          </View>
          <View className='act' onClick={() => Taro.navigateTo({ url: '/pages/pdf/pdf' })}>
            <Text className='act-text'>📄 长图</Text>
          </View>
        </View>
        <Button className='share-btn' openType='share' hoverClass='share-btn-hover'>分享给伙伴 ›</Button>
      </View>
    </View>
  )
}
