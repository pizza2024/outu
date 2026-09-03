import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getHistory, savePlan } from '../../store/plan'
import { TravelPlan } from '../../types'
import './index.scss'

/** 从方案里取出发地（交通信息的 leg 形如「上海 → 杭州」） */
function originOf(p: TravelPlan): string {
  const leg = p.transportation?.intercity?.[0]?.leg || ''
  const from = leg.split('→')[0]?.trim()
  return from || '出发地'
}

export default function Index() {
  const [trips, setTrips] = useState<TravelPlan[]>([])

  useDidShow(() => {
    setTrips(getHistory())
  })

  const openPlan = (p: TravelPlan) => {
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  /* ===== 空行程状态 ===== */
  if (trips.length === 0) {
    return (
      <View className='home home-empty'>
        <View className='empty-card'>
          <Text className='empty-title'>去哪里，由你决定</Text>
          <Text className='empty-sub'>填一份简单问卷{'\n'}AI 帮你生成完整旅行计划</Text>
        </View>
        <View className='create-btn' onClick={createNew}>
          <Text className='create-btn-text'>开始制定行程 ✈️</Text>
        </View>
      </View>
    )
  }

  /* ===== 行程列表状态 ===== */
  return (
    <View className='home'>
      <ScrollView className='trip-scroll' scrollY>
        <View className='trip-list'>
          {trips.map((p) => (
            <View key={p.plan_id} className='trip-card' onClick={() => openPlan(p)}>
              <View className='trip-route'>
                <Text className='trip-city'>{originOf(p)}</Text>
                <Text className='trip-arrow'>→</Text>
                <Text className='trip-city'>{p.summary.destination_label}</Text>
              </View>
              <View className='trip-meta'>
                <Text className='trip-days'>{p.summary.duration_label}</Text>
                <Text className='trip-budget'>预算 ¥{p.budget_breakdown.total_estimated.toLocaleString()}</Text>
              </View>
              <Text className='trip-date'>{p.generated_at.slice(0, 10)} 创建</Text>
            </View>
          ))}
          <View style={{ height: '180px' }} />
        </View>
      </ScrollView>

      <View className='home-footer'>
        <View className='create-btn' onClick={createNew}>
          <Text className='create-btn-text'>＋ 新建行程</Text>
        </View>
      </View>
    </View>
  )
}
