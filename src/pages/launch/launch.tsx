import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { getUser, saveUser, uuid } from '../../store/plan'
import logo from '../../assets/logo.png'
import './launch.scss'

export default function Launch() {
  const [agreed, setAgreed] = useState(false)

  const enter = () => {
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  const login = () => {
    if (!agreed) {
      Taro.showToast({ title: '请先同意隐私协议', icon: 'none' })
      return
    }
    // MVP：微信一键登录占位。正式版调用 Taro.login 拿 code → 云函数换 openid
    if (!getUser()) {
      saveUser({ openid: `guest_${uuid().slice(0, 8)}`, nickname: '海鸥旅行者', avatar: '' })
    }
    enter()
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
        <View className='login-btn' onClick={login}>
          <Text className='login-text'>微信一键登录</Text>
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
