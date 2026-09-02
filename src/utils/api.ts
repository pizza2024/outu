import Taro from '@tarojs/taro'
import { API_TOKEN, CLOUD_ENV, CLOUD_SERVICE, IS_DEV, LOCAL_API_BASE } from '../config'

/**
 * 统一后端 POST 请求：
 * 开发者工具/开发版 → 本地 NestJS（127.0.0.1:3100）
 * 体验版/正式版 → 微信云托管 callContainer（内网免域名白名单）
 */
export async function apiPost<T = any>(path: string, data: Record<string, any>): Promise<T> {
  if (IS_DEV) {
    const res = await Taro.request({
      url: `${LOCAL_API_BASE}${path}`,
      method: 'POST',
      timeout: 290000,
      header: { 'x-outu-token': API_TOKEN, 'content-type': 'application/json' },
      data
    })
    return res.data as T
  }
  const res = await Taro.cloud.callContainer({
    config: { env: CLOUD_ENV },
    path,
    method: 'POST',
    header: {
      'X-WX-SERVICE': CLOUD_SERVICE,
      'x-outu-token': API_TOKEN,
      'content-type': 'application/json'
    },
    data
  })
  return res.data as T
}
