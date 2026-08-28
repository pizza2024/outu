import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { TEMPLATES, TripTemplate } from '../../data/templates'
import { getHistory, saveDraft, savePlan } from '../../store/plan'
import { TravelPlan } from '../../types'
import logo from '../../assets/logo.png'
import './index.scss'

export default function Index() {
  const [keyword, setKeyword] = useState('')
  const [recent, setRecent] = useState<TravelPlan[]>([])

  useDidShow(() => {
    setRecent(getHistory().slice(0, 1))
  })

  /** 从模板开始：预填偏好进入问卷 */
  const startFromTemplate = (t: TripTemplate) => {
    saveDraft({
      template_id: t.id,
      preferences: {
        styles: t.tags,
        pace: 'comfortable',
        accommodation: [],
        food: []
      }
    })
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  /** 从空白开始 */
  const startBlank = () => {
    saveDraft({ template_id: undefined })
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  const openPlan = (p: TravelPlan) => {
    savePlan(p)
    Taro.navigateTo({ url: '/pages/preview/preview' })
  }

  const onSearch = () => {
    if (!keyword.trim()) return
    saveDraft({
      destinations: [{ city: keyword.trim(), country: '中国', days: 2 }]
    })
    Taro.navigateTo({ url: '/pages/questionnaire/questionnaire' })
  }

  return (
    <View className='page'>
      {/* 顶部搜索 */}
      <View className='header'>
        <View className='brand-row'>
          <Image className='logo' src={logo} mode='aspectFit' />
          <Text className='brand-name'>鸥途</Text>
        </View>
        <View className='search-box'>
          <Text className='search-icon'>🔍</Text>
          <Input
            className='search-input'
            placeholder='搜索目的地，如：大理'
            placeholderClass='search-placeholder'
            value={keyword}
            confirmType='search'
            onInput={(e) => setKeyword(e.detail.value)}
            onConfirm={onSearch}
          />
        </View>
      </View>

      {/* 横幅 */}
      <View className='banner' onClick={startBlank}>
        <Text className='banner-title'>✨ 从空白开始，定制你的专属旅程</Text>
        <Text className='banner-sub'>6 个问题 · 30 秒填完 · AI 生成完整方案</Text>
      </View>

      {/* 模板网格 */}
      <View className='section'>
        <Text className='section-title'>热门模板</Text>
        <View className='grid'>
          {TEMPLATES.map((t) => (
            <View key={t.id} className='tpl-card' onClick={() => startFromTemplate(t)}>
              <View className='tpl-cover' style={{ background: t.color }}>
                <Text className='tpl-emoji'>{t.emoji}</Text>
              </View>
              <View className='tpl-body'>
                <Text className='tpl-name'>{t.name}</Text>
                <Text className='tpl-desc'>{t.description}</Text>
                <View className='tpl-meta'>
                  <Text className='tpl-days'>{t.days}</Text>
                  <Text className='tpl-audience'>{t.audience}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 最近行程 */}
      {recent.length > 0 && (
        <View className='section'>
          <Text className='section-title'>最近行程</Text>
          {recent.map((p) => (
            <View key={p.plan_id} className='recent-card' onClick={() => openPlan(p)}>
              <View className='recent-info'>
                <Text className='recent-title'>{p.summary.title}</Text>
                <Text className='recent-date'>{p.generated_at.slice(0, 10)} 生成</Text>
              </View>
              <Text className='recent-arrow'>›</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
