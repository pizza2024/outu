/** ===== 鸥途数据类型（按 PRD 第三节接口规范） ===== */

/** 用户需求 JSON（3.1） */
export interface TravelRequest {
  request_id: string
  user_id: string
  timestamp: string
  destinations: Array<{
    city: string
    country: string
    days: number
  }>
  travel_dates: {
    departure_date: string
    return_date: string
    total_days: number
  }
  travelers: {
    adults: number
    children: number
    elderly: number
    special_needs: string[]
  }
  budget: {
    total_range: [number, number]
    currency: 'CNY'
    priority: 'accommodation' | 'experience' | 'food' | 'transport' | 'balanced'
  }
  preferences: {
    styles: string[]
    pace: 'intensive' | 'comfortable' | 'relaxed'
    accommodation: string[]
    food: string[]
  }
  special_requests: string
  template_id?: string
}

/** 行程方案 JSON（3.2） */
export interface TravelPlan {
  plan_id: string
  request_id: string
  generated_at: string
  summary: {
    title: string
    destination_label: string
    duration_label: string
    theme_tags: string[]
    cover_image_url: string
  }
  daily_plans: DailyPlan[]
  transportation: {
    intercity: Array<{
      leg: string
      mode: 'flight' | 'train' | 'bus' | 'self_drive'
      recommendations: Array<{
        option: string
        departure_time: string
        arrival_time: string
        duration: string
        price_range: string
        booking_link: string
      }>
    }>
    local: {
      recommendation: string
      tips: string
    }
  }
  accommodation: Array<{
    name: string
    address: string
    price_range: string
    rating: number
    reason: string
    booking_link: string
    image_url: string
  }>
  budget_breakdown: {
    transport: number
    accommodation: number
    food: number
    tickets: number
    shopping: number
    other: number
    total_estimated: number
    currency: 'CNY'
  }
  practical_info: {
    weather_tips: string
    packing_list: string[]
    emergency_contacts: Array<{ name: string; number: string }>
    visa_info: string
    insurance_tips: string
  }
}

export interface DailyPlan {
  day: number
  date: string
  theme: string
  highlights: string[]
  schedule: ScheduleItem[]
}

export interface ScheduleItem {
  time_slot: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'
  start_time: string
  end_time: string
  activity_type: 'sightseeing' | 'dining' | 'transport' | 'accommodation' | 'shopping' | 'entertainment' | 'rest'
  title: string
  description: string
  location: {
    name: string
    address: string
    latitude: number
    longitude: number
  }
  estimated_cost: {
    amount: number
    currency: 'CNY'
    per_person: boolean
  }
  booking_info: {
    provider: string
    deep_link: string
    booking_type: 'hotel' | 'flight' | 'train' | 'ticket' | 'none'
  }
  tips: string
  image_url: string
}

/** 登录用户 */
export interface UserInfo {
  openid: string
  nickname: string
  avatar: string
}
