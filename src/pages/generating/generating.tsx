import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { IS_DEV } from '../../config'
import { getUser, mockPlan, pushHistory, savePlan } from '../../store/plan'
import { apiPost } from '../../utils/api'
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

/** 轮询间隔与上限：AI 生成约 1~4 分钟，放宽到 5 分钟 */
const POLL_INTERVAL = 4000
const POLL_MAX = 75

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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
    let failReason = ''
    try {
      // 1) 提交异步生成任务（立即返回 job_id，不会被网关超时掐断）
      const submit = await apiPost<{ job_id: string | null; error?: string }>(
        '/api/plan/generate',
        { request }
      )
      if (!submit?.job_id) {
        failReason = submit?.error || '任务创建失败'
      } else {
        // 2) 轮询结果
        for (let i = 0; i < POLL_MAX; i++) {
          await sleep(POLL_INTERVAL)
          const r = await apiPost<{ status: string; plan?: TravelPlan; error?: string }>(
            '/api/plan/result',
            { job_id: submit.job_id }
          )
          if (r?.status === 'done' && r.plan) {
            plan = r.plan
            break
          }
          if (r?.status === 'error') {
            failReason = r.error || '生成失败'
            break
          }
        }
        if (!plan && !failReason) failReason = '生成超时，请重试'
      }
    } catch (e: any) {
      failReason = e?.errMsg || e?.message || String(e)
    }

    // 降级：本地示例方案
    if (!plan) {
      console.warn('[鸥途] 后端生成失败，降级为本地示例方案：', failReason)
      // 开发模式下把失败原因弹出来，方便排查（线上保持静默降级）
      if (IS_DEV) {
        Taro.showModal({
          title: '后端调用失败（调试）',
          content: failReason || '未知错误',
          showCancel: false,
          confirmText: '知道了'
        })
      }
      await sleep(2000)
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
      <Text className='gen-note'>AI 正在深度规划，约需 1-3 分钟，请稍候</Text>
    </View>
  )
}
