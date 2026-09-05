/** 官方精选行程模板：问卷页一键预填，降低新用户门槛 */
export interface TripTemplate {
  id: string
  city: string
  days: number
  emoji: string
  title: string
  styles: string[]
  pace: 'intensive' | 'comfortable' | 'relaxed'
}

export const TEMPLATES: TripTemplate[] = [
  { id: 'beijing', city: '北京', days: 3, emoji: '🏛️', title: '帝都经典', styles: ['文化古迹'], pace: 'comfortable' },
  { id: 'chengdu', city: '成都', days: 3, emoji: '🍜', title: '巴适慢生活', styles: ['美食探店', '休闲度假'], pace: 'relaxed' },
  { id: 'xian', city: '西安', days: 4, emoji: '🗿', title: '穿越千年', styles: ['文化古迹', '美食探店'], pace: 'comfortable' },
  { id: 'hangzhou', city: '杭州', days: 2, emoji: '🍃', title: '西湖慢游', styles: ['自然风光', '休闲度假'], pace: 'relaxed' },
  { id: 'chongqing', city: '重庆', days: 3, emoji: '🌶️', title: '山城烟火', styles: ['美食探店'], pace: 'comfortable' },
  { id: 'dali', city: '大理', days: 4, emoji: '🌊', title: '风花雪月', styles: ['自然风光', '休闲度假'], pace: 'relaxed' },
  { id: 'qingdao', city: '青岛', days: 3, emoji: '⛵', title: '海滨假日', styles: ['自然风光'], pace: 'comfortable' },
  { id: 'changsha', city: '长沙', days: 3, emoji: '🦞', title: '湘味夜未央', styles: ['美食探店', '亲子娱乐'], pace: 'comfortable' }
]
