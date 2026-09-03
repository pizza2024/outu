import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getHistory, savePlan } from '../../store/plan'
import { TravelPlan } from '../../types'
import './trips.scss'

export default function Trips() {
  const [history, setHistory] = useState<TravelPlan[]>([])

  useDidShow(() => {
    setHistory(getHistory())
  })

  const openPlan = (p: TravelPlan) => {
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
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
        history.map((p) => (
          <View key={p.plan_id} className='trip-card' onClick={() => openPlan(p)}>
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
        ))
      )}

      {/* 悬浮新建按钮 */}
      <View className='fab' onClick={createNew}>
        <Text className='fab-icon'>＋</Text>
      </View>
    </View>
  )
}
