import Taro from '@tarojs/taro'
import { TravelPlan, TravelRequest, UserInfo } from '../types'

const DRAFT_KEY = 'outu_draft'
const PLAN_KEY = 'outu_plan'
const HISTORY_KEY = 'outu_history'
const USER_KEY = 'outu_user'

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/* ===== 用户 ===== */
export function saveUser(user: UserInfo) {
  Taro.setStorageSync(USER_KEY, user)
}
export function getUser(): UserInfo | null {
  return Taro.getStorageSync(USER_KEY) || null
}

/* ===== 问卷草稿（支持断点续填） ===== */
export function saveDraft(draft: Partial<TravelRequest> & { __step?: number }) {
  Taro.setStorageSync(DRAFT_KEY, draft)
}
export function getDraft(): (Partial<TravelRequest> & { __step?: number }) | null {
  return Taro.getStorageSync(DRAFT_KEY) || null
}
export function clearDraft() {
  Taro.removeStorageSync(DRAFT_KEY)
}

/* ===== 当前方案 ===== */
export function savePlan(plan: TravelPlan) {
  Taro.setStorageSync(PLAN_KEY, plan)
}
export function getPlan(): TravelPlan | null {
  return Taro.getStorageSync(PLAN_KEY) || null
}

/* ===== 历史行程 ===== */
export function pushHistory(plan: TravelPlan) {
  const list: TravelPlan[] = Taro.getStorageSync(HISTORY_KEY) || []
  const next = [plan, ...list.filter((p) => p.plan_id !== plan.plan_id)].slice(0, 20)
  Taro.setStorageSync(HISTORY_KEY, next)
}
export function getHistory(): TravelPlan[] {
  return Taro.getStorageSync(HISTORY_KEY) || []
}
export function deleteHistory(planId: string) {
  const list: TravelPlan[] = Taro.getStorageSync(HISTORY_KEY) || []
  Taro.setStorageSync(HISTORY_KEY, list.filter((p) => p.plan_id !== planId))
}

/* ===== 预算实时重算（微调后调用） ===== */
export function recalcBudget(plan: TravelPlan): TravelPlan {
  let food = 0
  let tickets = 0
  let other = 0
  plan.daily_plans.forEach((d) => {
    d.schedule.forEach((s) => {
      const amt = s.estimated_cost?.amount || 0
      if (s.activity_type === 'dining') food += amt
      else if (s.activity_type === 'sightseeing' || s.activity_type === 'entertainment') tickets += amt
      else if (s.activity_type === 'shopping') other += amt
      else other += amt
    })
  })
  const b = plan.budget_breakdown
  b.food = food
  b.tickets = tickets
  b.other = other + (b.shopping || 0)
  b.total_estimated = b.transport + b.accommodation + b.food + b.tickets + b.other
  return plan
}

/* ===== 本地示例方案（云函数未接入大模型时的降级） ===== */
export function mockPlan(req: TravelRequest): TravelPlan {
  const city = req.destinations[0]?.city || '目的地'
  const totalDays = Math.min(Math.max(req.travel_dates.total_days || 2, 1), 5)
  const start = new Date(req.travel_dates.departure_date || Date.now())
  const styleText = req.preferences.styles[0] || '休闲度假'
  const pace = req.preferences.pace
  const perDay = pace === 'intensive' ? 5 : pace === 'relaxed' ? 3 : 4

  const spots = ['城市地标', '人气老街', '本地博物馆', '网红观景台', '城市公园', '特色市集', '文化古迹', '江滨步道']
  const foods = ['本地老字号', '人气小吃街', '高分本帮菜', '网红咖啡馆']

  const daily_plans: TravelPlan['daily_plans'] = []
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(start.getTime() + d * 86400000)
    const dateStr = date.toISOString().slice(0, 10)
    const schedule: TravelPlan['daily_plans'][0]['schedule'] = []
    const mk = (
      time_slot: any, start_time: string, end_time: string, activity_type: any,
      title: string, description: string, amount: number, tips: string
    ) => ({
      time_slot, start_time, end_time, activity_type, title, description,
      location: { name: title, address: `${city} · ${title}`, latitude: 0, longitude: 0 },
      estimated_cost: { amount, currency: 'CNY' as const, per_person: true },
      booking_info: { provider: '', deep_link: '', booking_type: 'none' as const },
      tips, image_url: ''
    })
    schedule.push(mk('morning', '09:00', '11:30', 'sightseeing',
      `${city} · ${spots[(d * 2) % spots.length]}`, `以「${styleText}」为主题的第一站，建议早到避开人流。`, 60, '携带身份证，部分场馆需预约'))
    schedule.push(mk('noon', '12:00', '13:30', 'dining',
      foods[d % foods.length], '本地人推荐的高分餐厅，品尝地道风味。', 80, '高峰期建议提前取号'))
    schedule.push(mk('afternoon', '14:00', '17:00', 'sightseeing',
      `${city} · ${spots[(d * 2 + 1) % spots.length]}`, '下午光线柔和，适合慢慢逛与拍照。', 45, '注意防晒补水'))
    if (perDay >= 4) {
      schedule.push(mk('evening', '18:00', '19:30', 'dining',
        '特色晚餐', '按你的餐饮偏好推荐的晚餐去处。', 100, '可提前在线排队'))
    }
    if (perDay >= 5) {
      schedule.push(mk('night', '20:00', '21:30', 'entertainment',
        '夜景漫步', '晚饭后沿江/沿街散步，感受城市夜色。', 0, '注意返程交通末班时间'))
    }
    daily_plans.push({
      day: d + 1,
      date: dateStr,
      theme: d === 0 ? '抵达与初印象' : d === totalDays - 1 ? '收官与返程' : `${styleText}深度体验`,
      highlights: [spots[(d * 2) % spots.length], spots[(d * 2 + 1) % spots.length]],
      schedule
    })
  }

  const nights = Math.max(totalDays - 1, 1)
  const plan: TravelPlan = {
    plan_id: uuid(),
    request_id: req.request_id,
    generated_at: new Date().toISOString(),
    summary: {
      title: `${city}${totalDays}天${nights}晚 · ${styleText}之旅`,
      destination_label: req.destinations.map((x) => x.city).join(' → '),
      duration_label: `${totalDays}天${nights}晚`,
      theme_tags: req.preferences.styles,
      cover_image_url: ''
    },
    daily_plans,
    transportation: {
      intercity: [{
        leg: `${req.origin?.city || '出发地'} → ${city}`,
        mode: 'train',
        recommendations: [{
          option: '高铁二等座', departure_time: '08:30', arrival_time: '12:10',
          duration: '约3.5小时', price_range: '¥300-600', booking_link: ''
        }]
      }],
      local: { recommendation: '建议以地铁+步行为主', tips: '可购买城市交通日票更划算' }
    },
    accommodation: [{
      name: `${city}市中心精选酒店`, address: `${city}市中心商圈`, price_range: '¥350-500/晚',
      rating: 4.6, reason: '位置便利，靠近地铁与主要景点，匹配你的预算偏好',
      booking_link: '', image_url: ''
    }],
    budget_breakdown: {
      transport: 500, accommodation: 400 * nights, food: 0, tickets: 0,
      shopping: 200, other: 0, total_estimated: 0, currency: 'CNY'
    },
    practical_info: {
      weather_tips: '出行前请查看目的地 7 日天气预报，备好雨具与防晒。',
      packing_list: ['身份证', '充电宝', '舒适运动鞋', '常用药', '雨具'],
      emergency_contacts: [{ name: '全国旅游服务热线', number: '12301' }],
      visa_info: '',
      insurance_tips: '建议购买短期旅行意外险。'
    }
  }
  return recalcBudget(plan)
}
