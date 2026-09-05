import { View, Text, Image, Button, Input } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useState } from 'react'
import { getHistory, getUser, saveUser } from '../../store/plan'
import { apiPost } from '../../utils/api'
import { UserInfo } from '../../types'
import logo from '../../assets/logo.png'
import './profile.scss'

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [tripCount, setTripCount] = useState(0)

  useDidShow(() => {
    setUser(getUser())
    setTripCount(getHistory().length)
  })

  /** 转发 / 朋友圈分享 */
  useShareAppMessage(() => ({
    title: '鸥途 · AI 旅行助手，填一份问卷就能生成完整旅行方案',
    path: '/pages/launch/launch'
  }))
  useShareTimeline(() => ({
    title: '鸥途 · AI 旅行助手，不懂 AI 也能拥有完美旅行'
  }))

  /** 微信头像选择（chooseAvatar 按钮回调，拿到临时头像路径） */
  const onChooseAvatar = (e: any) => {
    const avatar = e?.detail?.avatarUrl
    if (!avatar || !user) return
    const next = { ...user, avatar }
    setUser(next)
    saveUser(next)
    apiPost('/api/auth/profile', { openid: user.openid, avatar }).catch(() => {})
    Taro.showToast({ title: '头像已更新', icon: 'success' })
  }

  /** 微信昵称输入框失焦保存 */
  const onNickname = (e: any) => {
    const nickname = (e?.detail?.value || '').trim()
    if (!nickname || !user || nickname === user.nickname) return
    const next = { ...user, nickname }
    setUser(next)
    saveUser(next)
    apiPost('/api/auth/profile', { openid: user.openid, nickname }).catch(() => {})
    Taro.showToast({ title: '昵称已更新', icon: 'success' })
  }

  const menus = [
    { icon: '🗺️', label: '我的行程', badge: tripCount > 0 ? `${tripCount}` : '', action: () => Taro.switchTab({ url: '/pages/trips/trips' }) },
    { icon: '🧮', label: '旅行经费计算', badge: '', action: () => Taro.switchTab({ url: '/pages/budget/budget' }) },
    { icon: '⭐', label: '收藏模板', badge: '', action: () => Taro.showToast({ title: '敬请期待', icon: 'none' }) },
    { icon: '💬', label: '意见反馈', badge: '', action: () => Taro.showToast({ title: '敬请期待', icon: 'none' }) },
    { icon: '⚙️', label: '设置', badge: '', action: () => Taro.showToast({ title: '敬请期待', icon: 'none' }) }
  ]

  return (
    <View className='profile'>
      {/* 用户卡片：点头像换头像，点昵称改昵称 */}
      <View className='user-card'>
        <Button className='avatar-wrap' openType='chooseAvatar' onChooseAvatar={onChooseAvatar}>
          <Image className='avatar' src={user?.avatar || logo} mode='aspectFit' />
        </Button>
        <View className='user-info'>
          <Input
            className='nickname'
            type='nickname'
            value={user?.nickname || '海鸥旅行者'}
            placeholder='点击设置昵称'
            placeholderClass='nickname-ph'
            onBlur={onNickname}
          />
          <Text className='bio'>不懂 AI，也能拥有完美旅行</Text>
        </View>
      </View>

      {/* 数据概览 */}
      <View className='stats-card'>
        <View className='stat'>
          <Text className='stat-num'>{tripCount}</Text>
          <Text className='stat-label'>我的行程</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat'>
          <Text className='stat-num'>0</Text>
          <Text className='stat-label'>收藏模板</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat'>
          <Text className='stat-num'>0</Text>
          <Text className='stat-label'>旅行足迹</Text>
        </View>
      </View>

      {/* 菜单 */}
      <View className='menu-card'>
        {menus.map((m, i) => (
          <View key={m.label} className={`menu-item ${i > 0 ? 'menu-item-line' : ''}`} onClick={m.action}>
            <Text className='menu-icon'>{m.icon}</Text>
            <Text className='menu-label'>{m.label}</Text>
            {!!m.badge && <Text className='menu-badge'>{m.badge}</Text>}
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
