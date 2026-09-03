import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { IS_DEV } from '../../config'
import { getUser, saveUser, uuid } from '../../store/plan'
import { apiPost } from '../../utils/api'
import logo from '../../assets/logo.png'
import './launch.scss'

interface LoginResult {
  openid: string | null
  nickname?: string
  avatar?: string
  error?: string
}

export default function Launch() {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const enter = () => {
    Taro.reLaunch({ url: '/pages/trips/trips' })
  }

  /** 开发模式：跳过登录，用本地游客身份直接进入 */
  const skipLogin = () => {
    if (!getUser()) {
      saveUser({ openid: `guest_${uuid().slice(0, 8)}`, nickname: '海鸥旅行者', avatar: '' })
    }
    enter()
  }

  /** 微信一键登录：Taro.login 拿 code → 后端 jscode2session 换 openid */
  const login = async () => {
    // 开发模式直接跳过登录和协议确认
    if (IS_DEV) {
      skipLogin()
      return
    }
    if (!agreed) {
      Taro.showToast({ title: '请先同意隐私协议', icon: 'none' })
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const { code } = await Taro.login()
      if (!code) throw new Error('未获取到登录凭证')
      const res = await apiPost<LoginResult>('/api/auth/login', { code })
      if (res?.openid) {
        saveUser({
          openid: res.openid,
          nickname: res.nickname || '海鸥旅行者',
          avatar: res.avatar || ''
        })
        enter()
      } else {
        Taro.showModal({
          title: '登录失败',
          content: res?.error || '请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (e: any) {
      Taro.showModal({
        title: '登录失败',
        content: e?.errMsg || e?.message || '网络异常',
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='launch'>
      <View className='brand'>
        <Image className='logo' src={logo} mode='aspectFit' />
        <Text className='name'>鸥途</Text>
        <Text className='slogan'>不懂 AI，也能拥有完美旅行</Text>
        <Text className='sub'>填一份简单问卷，剩下的交给鸥途规划引擎</Text>
      </View>

      <View className='actions'>
        <View className={`login-btn ${loading ? 'login-btn-loading' : ''}`} onClick={login}>
          <Text className='login-text'>{loading ? '登录中…' : IS_DEV ? '开发模式 · 直接进入' : '微信一键登录'}</Text>
        </View>
        <View className='privacy' onClick={() => setAgreed(!agreed)}>
          <View className={`checkbox ${agreed ? 'checked' : ''}`}>
            {agreed && <Text className='check-mark'>✓</Text>}
          </View>
          <Text className='privacy-text'>我已阅读并同意《用户协议》和《隐私政策》</Text>
        </View>
      </View>
    </View>
  )
}
