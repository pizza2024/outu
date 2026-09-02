import { View, Text, Input, Picker, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { TEMPLATES, TripTemplate } from '../../data/templates'
import { getHistory, saveDraft, savePlan } from '../../store/plan'
import { TravelPlan } from '../../types'
import './index.scss'

const DAY_OPTIONS = ['1-3 天', '3-7 天', '7-15 天', '15 天以上']
const DAY_VALUES: Array<[number, number]> = [[1, 3], [3, 7], [7, 15], [15, 30]]
const BUDGET_OPTIONS = ['¥3000 以内', '¥3000 - 8000', '¥8000 - 15000', '¥15000 以上']

export default function Index() {
  const [dest, setDest] = useState('')
  const [dayIdx, setDayIdx] = useState(1)
  const [budgetIdx, setBudgetIdx] = useState(1)
  const [recent, setRecent] = useState<TravelPlan[]>([])

  useDidShow(() => {
    setRecent(getHistory().slice(0, 1))
  })

  /** 开始规划：把首页快捷选择写入问卷草稿 */
  const start = () => {
    const [minD] = DAY_VALUES[dayIdx]
    saveDraft({
      ...(dest.trim()
        ? { destinations: [{ city: dest.trim(), country: '中国', days: minD }] }
        : {}),
      travel_dates: {
        departure_date: '',
        return_date: '',
        total_days: minD
      }
    })
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  /** 从模板开始：预填偏好进入问卷 */
  const startFromTemplate = (t: TripTemplate) => {
    saveDraft({
      template_id: t.id,
      preferences: { styles: t.tags, pace: 'comfortable', accommodation: [], food: [] }
    })
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  const openPlan = (p: TravelPlan) => {
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  return (
    <View className='home'>
      {/* Hero 区 */}
      <View className='hero'>
        <View className='hero-deco hero-deco-1'>✈️</View>
        <View className='hero-deco hero-deco-2'>🕊️</View>
        <Text className='hero-title'>去哪里，{'\n'}由你决定</Text>
        <Text className='hero-sub'>AI 帮你把想法变成可执行的旅行计划</Text>
      </View>

      {/* 快捷规划表单卡 */}
      <View className='form-card'>
        <View className='form-row'>
          <Text className='form-icon'>📍</Text>
          <View className='form-main'>
            <Text className='form-label'>想去哪里？</Text>
            <Input
              className='form-input'
              placeholder='搜索目的地 / 城市 / 国家'
              placeholderClass='form-ph'
              value={dest}
              onInput={(e) => setDest(e.detail.value)}
            />
          </View>
        </View>
        <View className='form-divider' />
        <Picker mode='selector' range={DAY_OPTIONS} value={dayIdx} onChange={(e) => setDayIdx(Number(e.detail.value))}>
          <View className='form-row'>
            <Text className='form-icon'>📅</Text>
            <View className='form-main'>
              <Text className='form-label'>旅行天数</Text>
            </View>
            <Text className='form-value'>{DAY_OPTIONS[dayIdx]}</Text>
            <Text className='form-arrow'>›</Text>
          </View>
        </Picker>
        <View className='form-divider' />
        <Picker mode='selector' range={BUDGET_OPTIONS} value={budgetIdx} onChange={(e) => setBudgetIdx(Number(e.detail.value))}>
          <View className='form-row'>
            <Text className='form-icon'>💰</Text>
            <View className='form-main'>
              <Text className='form-label'>预算（人均）</Text>
            </View>
            <Text className='form-value'>{BUDGET_OPTIONS[budgetIdx]}</Text>
            <Text className='form-arrow'>›</Text>
          </View>
        </Picker>

        <View className='cta' onClick={start}>
          <Text className='cta-text'>开始规划 ✈️</Text>
        </View>
      </View>

      {/* 热门灵感 */}
      <View className='section'>
        <View className='section-head'>
          <Text className='section-title'>热门灵感</Text>
          <Text className='section-sub'>一键套用模板</Text>
        </View>
        <ScrollView className='tpl-scroll' scrollX enhanced showScrollbar={false}>
          <View className='tpl-row'>
            {TEMPLATES.map((t) => (
              <View key={t.id} className='tpl-card' onClick={() => startFromTemplate(t)}>
                <View className='tpl-cover' style={{ background: t.color }}>
                  <Text className='tpl-emoji'>{t.emoji}</Text>
                </View>
                <View className='tpl-body'>
                  <Text className='tpl-name'>{t.name}</Text>
                  <Text className='tpl-desc'>{t.description}</Text>
                  <Text className='tpl-days'>{t.days}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 最近行程 */}
      {recent.length > 0 && (
        <View className='section'>
          <View className='section-head'>
            <Text className='section-title'>最近行程</Text>
          </View>
          {recent.map((p) => (
            <View key={p.plan_id} className='recent-card' onClick={() => openPlan(p)}>
              <View className='recent-info'>
                <Text className='recent-title'>{p.summary.title}</Text>
                <Text className='recent-date'>{p.generated_at.slice(0, 10)} 生成 · {p.summary.duration_label}</Text>
              </View>
              <Text className='recent-arrow'>›</Text>
            </View>
          ))}
        </View>
      )}

      <View className='bottom-space' />
    </View>
  )
}
