import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getHistory, getUser, savePlan } from '../../store/plan'
import { TravelPlan, UserInfo } from '../../types'
import logo from '../../assets/logo.png'
import './profile.scss'

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [history, setHistory] = useState<TravelPlan[]>([])

  useDidShow(() => {
    setUser(getUser())
    setHistory(getHistory())
  })

  const openPlan = (p: TravelPlan) => {
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  return (
    <View className='profile'>
      {/* 用户卡片 */}
      <View className='user-card'>
        <Image className='avatar' src={user?.avatar || logo} mode='aspectFit' />
        <View className='user-info'>
          <Text className='nickname'>{user?.nickname || '海鸥旅行者'}</Text>
          <Text className='bio'>不懂 AI，也能拥有完美旅行</Text>
        </View>
      </View>

      {/* 历史行程 */}
      <View className='section'>
        <Text className='section-title'>历史行程</Text>
        {history.length === 0 && (
          <View className='empty'>
            <Text className='empty-text'>还没有行程，去首页创建一个吧 🕊️</Text>
          </View>
        )}
        {history.map((p) => (
          <View key={p.plan_id} className='trip-card' onClick={() => openPlan(p)}>
            <View className='trip-info'>
              <Text className='trip-title'>{p.summary.title}</Text>
              <Text className='trip-meta'>
                {p.summary.duration_label} · 预算 ¥{p.budget_breakdown.total_estimated} · {p.generated_at.slice(0, 10)}
              </Text>
            </View>
            <Text className='trip-arrow'>›</Text>
          </View>
        ))}
      </View>

      {/* 其他菜单 */}
      <View className='menu'>
        {[
          { icon: '⭐', label: '收藏模板' },
          { icon: '💬', label: '意见反馈' },
          { icon: '⚙️', label: '设置' }
        ].map((m) => (
          <View key={m.label} className='menu-item'>
            <Text className='menu-icon'>{m.icon}</Text>
            <Text className='menu-label'>{m.label}</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        ))}
      </View>

      <View className='footer'>
        <Text className='footer-text'>鸥途 v1.0.0 · AI 旅行规划引擎</Text>
      </View>
    </View>
  )
}
