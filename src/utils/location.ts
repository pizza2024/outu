import Taro from '@tarojs/taro'

export interface GeoCity {
  city: string
  latitude: number
  longitude: number
}

/**
 * 获取当前城市：getLocation 拿坐标 → Nominatim 逆地理编码出城市名
 * 注意：正式版需在小程序后台配置 request 合法域名 nominatim.openstreetmap.org，
 * 否则线上会静默失败降级为手动填写；有腾讯位置服务 key 时可在此替换实现。
 * 任何失败（拒绝授权/无网络/未配域名）都返回 null，不抛错。
 */
export async function getCurrentCity(): Promise<GeoCity | null> {
  try {
    const loc = await Taro.getLocation({ type: 'gcj02', isHighAccuracy: false })
    const res = await Taro.request({
      url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.latitude}&lon=${loc.longitude}&accept-language=zh-CN&zoom=10`,
      timeout: 8000
    })
    const addr = (res.data as any)?.address || {}
    const city: string = addr.city || addr.town || addr.county || addr.state || ''
    return city ? { city, latitude: loc.latitude, longitude: loc.longitude } : null
  } catch {
    return null
  }
}
