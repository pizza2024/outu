import Taro from '@tarojs/taro'
import { apiPost } from './api'

export interface GeoCity {
  city: string
  latitude: number
  longitude: number
}

/**
 * 获取当前城市：getLocation 拿坐标 → 后端逆地理编码出城市名。
 * 逆地理放在服务端：小程序 request 合法域名白名单配不了 nominatim，
 * 而 getLocation 只需在小程序后台「用户隐私保护指引」声明位置用途。
 * 任何失败（拒绝授权/无网络）都返回 null，不抛错，由调用方提示手动填写。
 */
export async function getCurrentCity(): Promise<GeoCity | null> {
  try {
    const loc = await Taro.getLocation({ type: 'gcj02', isHighAccuracy: false })
    const res = await apiPost<{ city: string | null }>('/api/geo/reverse', {
      latitude: loc.latitude,
      longitude: loc.longitude
    })
    if (!res?.city) return null
    return { city: res.city, latitude: loc.latitude, longitude: loc.longitude }
  } catch {
    return null
  }
}
