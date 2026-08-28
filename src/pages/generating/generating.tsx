import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { API_TOKEN, CLOUD_ENV, CLOUD_SERVICE, IS_DEV, LOCAL_API_BASE } from '../../config'
import { getUser, mockPlan, pushHistory, savePlan } from '../../store/plan'
import { TravelPlan, TravelRequest } from '../../types'
import './generating.scss'

const TIPS = [
  '正在解析你的旅行偏好…',
  '正在检索目的地知识库…',
  '正在为你筛选高分景点…',
  '正在优化每日路线动线…',
  '正在匹配交通与住宿方案…',
  '正在核算整体预算…'
]

export default function Generating() {
  const [tipIdx, setTipIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 2000)
    generate().finally(() => clearInterval(timer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generate = async () => {
    const request: TravelRequest | null = Taro.getStorageSync('outu_request') || null
    if (!request) {
      Taro.showToast({ title: '需求信息丢失，请重新填写', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1200)
      return
    }
    request.user_id = getUser()?.openid || 'guest'

    let plan: TravelPlan | null = null
    let cloudError = ''
    try {
      if (IS_DEV) {
        // 本地开发：直接请求本机 NestJS 服务（需在开发者工具勾选「不校验合法域名」）
        const res = await Taro.request({
          url: `${LOCAL_API_BASE}/api/plan/generate`,
          method: 'POST',
          timeout: 290000,
          header: { 'x-outu-token': API_TOKEN, 'content-type': 'application/json' },
          data: { request }
        })
        const result = res.data as { plan?: TravelPlan; error?: string }
        plan = result?.plan || null
        if (!plan) cloudError = result?.error || `后端返回异常（HTTP ${res.statusCode}）`
      } else {
        // 线上：云托管内网调用（callContainer 免域名白名单，无 60s 限制）
        const res = await Taro.cloud.callContainer({
          config: { env: CLOUD_ENV },
          path: '/api/plan/generate',
          method: 'POST',
          header: {
            'X-WX-SERVICE': CLOUD_SERVICE,
            'x-outu-token': API_TOKEN,
            'content-type': 'application/json'
          },
          data: { request }
        })
        const result = res.data as { plan?: TravelPlan; error?: string }
        plan = result?.plan || null
        if (!plan) cloudError = result?.error || `后端返回异常（HTTP ${res.statusCode}）`
      }
    } catch (e: any) {
      plan = null
      cloudError = e?.errMsg || e?.message || String(e)
    }
    // 降级：本地示例方案
    if (!plan) {
      console.warn('[鸥途] 后端调用失败，降级为本地示例方案：', cloudError)
      // 开发模式下把失败原因弹出来，方便排查（线上保持静默降级）
      if (IS_DEV) {
        Taro.showModal({
          title: '后端调用失败（调试）',
          content: cloudError || '未知错误',
          showCancel: false,
          confirmText: '知道了'
        })
      }
      await new Promise((r) => setTimeout(r, 2500))
      plan = mockPlan(request)
    }

    savePlan(plan)
    pushHistory(plan)
    Taro.redirectTo({ url: '/pages/preview/preview' })
  }

  return (
    <View className='gen'>
      <View className='plane'>🕊️</View>
      <Text className='gen-title'>鸥途正在为你规划</Text>
      <Text className='gen-tip'>{TIPS[tipIdx]}</Text>
      <View className='gen-bar'>
        <View className='gen-bar-fill' />
      </View>
      <Text className='gen-note'>AI 正在深度规划，约需 1-2 分钟，请稍候</Text>
    </View>
  )
}
