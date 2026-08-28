import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 云托管需要初始化云环境（callContainer 走微信内网，免域名白名单）
    // 初始化失败不能阻塞启动（白屏），降级为公网域名调用
    try {
      if (process.env.TARO_ENV === 'weapp' && Taro.cloud) {
        Taro.cloud.init({ env: 'prod-d9gj3mo751db3162d', traceUser: true })
      }
    } catch (e) {
      console.warn('[鸥途] 云环境初始化失败，将使用公网域名访问后端：', e)
    }
  })

  return children
}

export default App
