import { View, Text, Image, ScrollView, Canvas } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useState } from 'react'
import { getPlan } from '../../store/plan'
import { drawPlanPoster } from '../../utils/poster'
import { TravelPlan } from '../../types'
import logo from '../../assets/logo.png'
import './pdf.scss'

export default function Pdf() {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [exporting, setExporting] = useState(false)

  useDidShow(() => setPlan(getPlan()))

  useShareAppMessage(() => ({
    title: plan ? `${plan.summary.title} · 鸥途旅行方案` : '鸥途 · AI 旅行助手',
    path: '/pages/launch/launch'
  }))

  /** 保存图片到相册（含权限引导） */
  const saveToAlbum = async (filePath: string) => {
    try {
      await Taro.saveImageToPhotosAlbum({ filePath })
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch {
      const setting = await Taro.getSetting()
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        const modal = await Taro.showModal({
          title: '需要相册权限',
          content: '请在设置中允许保存图片到相册',
          confirmText: '去设置',
          cancelText: '取消'
        })
        if (modal.confirm) Taro.openSetting()
      } else {
        Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    }
  }

  /** 生成 750px 宽长图并保存 */
  const saveImage = () => {
    if (!plan || exporting) return
    setExporting(true)
    Taro.showLoading({ title: '正在生成长图…' })
    Taro.createSelectorQuery()
      .select('#posterCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        try {
          if (!res?.[0]?.node) throw new Error('canvas not found')
          const canvas = res[0].node
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          await drawPlanPoster(canvas, plan, logo, dpr)
          const file = await Taro.canvasToTempFilePath({ canvas })
          Taro.hideLoading()
          setExporting(false)
          await saveToAlbum(file.tempFilePath)
        } catch (e) {
          Taro.hideLoading()
          setExporting(false)
          Taro.showToast({ title: '生成失败，请重试', icon: 'none' })
        }
      })
  }

  if (!plan) {
    return (
      <View className='pdf-empty'>
        <Text className='pdf-empty-text'>暂无方案，请先生成行程</Text>
      </View>
    )
  }

  const b = plan.budget_breakdown
  const budgetRows: Array<[string, number]> = [
    ['城际交通', b.transport], ['住宿', b.accommodation], ['餐饮', b.food],
    ['门票玩乐', b.tickets], ['购物', b.shopping], ['其他', b.other]
  ]

  return (
    <View className='pdf-page'>
      {/* 离屏画布：用于长图导出，不参与页面展示 */}
      <Canvas type='2d' id='posterCanvas' className='poster-canvas' />
      <ScrollView className='sheet-wrap' scrollY>
        <View className='sheet'>
          {/* 1 封面区 */}
          <View className='cover'>
            <Image className='cover-logo' src={logo} mode='aspectFit' />
            <Text className='cover-title'>{plan.summary.title}</Text>
            <Text className='cover-meta'>
              {plan.summary.destination_label} · {plan.summary.duration_label}
            </Text>
            <View className='cover-tags'>
              {plan.summary.theme_tags.map((t) => (
                <Text key={t} className='cover-tag'>{t}</Text>
              ))}
            </View>
          </View>

          {/* 2 行程总览 */}
          <View className='sec'>
            <Text className='sec-title'>行程总览</Text>
            {plan.daily_plans.map((d) => (
              <View key={d.day} className='ov-card'>
                <Text className='ov-day'>D{d.day} · {d.date.slice(5)}</Text>
                <Text className='ov-theme'>{d.theme}</Text>
                <Text className='ov-hl'>{d.highlights.join(' / ')}</Text>
              </View>
            ))}
          </View>

          {/* 3 每日详细行程 */}
          <View className='sec'>
            <Text className='sec-title'>每日行程</Text>
            {plan.daily_plans.map((d) => (
              <View key={d.day} className='day-block'>
                <Text className='day-block-title'>第{d.day}天 · {d.theme}</Text>
                {d.schedule.map((s, i) => (
                  <View key={i} className='sch-row'>
                    <Text className='sch-time'>{s.start_time}</Text>
                    <View className='sch-info'>
                      <Text className='sch-title'>{s.title}</Text>
                      <Text className='sch-desc'>{s.description}</Text>
                      {s.estimated_cost.amount > 0 && (
                        <Text className='sch-cost'>约 ¥{s.estimated_cost.amount}/人</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* 4 交通方案 */}
          <View className='sec'>
            <Text className='sec-title'>交通方案</Text>
            {plan.transportation.intercity.map((t, i) => (
              <View key={i} className='trans-card'>
                <Text className='trans-leg'>{t.leg}</Text>
                {t.recommendations.map((r, j) => (
                  <Text key={j} className='trans-item'>
                    {r.option} · {r.departure_time}-{r.arrival_time} · {r.price_range}
                  </Text>
                ))}
              </View>
            ))}
            <Text className='local-tips'>🚇 {plan.transportation.local.recommendation}（{plan.transportation.local.tips}）</Text>
          </View>

          {/* 5 住宿推荐 */}
          <View className='sec'>
            <Text className='sec-title'>住宿推荐</Text>
            {plan.accommodation.map((a, i) => (
              <View key={i} className='hotel-card'>
                <Text className='hotel-name'>{a.name} ⭐{a.rating}</Text>
                <Text className='hotel-sub'>{a.address} · {a.price_range}</Text>
                <Text className='hotel-reason'>{a.reason}</Text>
              </View>
            ))}
          </View>

          {/* 6 费用汇总 */}
          <View className='sec'>
            <Text className='sec-title'>费用预估</Text>
            <View className='budget-table'>
              {budgetRows.map(([label, val]) => (
                <View key={label} className='budget-row'>
                  <Text className='budget-label'>{label}</Text>
                  <Text className='budget-val'>¥{val}</Text>
                </View>
              ))}
              <View className='budget-row budget-total'>
                <Text className='budget-label'>总计（约）</Text>
                <Text className='budget-val'>¥{b.total_estimated}</Text>
              </View>
            </View>
          </View>

          {/* 7 实用信息 */}
          <View className='sec'>
            <Text className='sec-title'>实用信息</Text>
            <Text className='prac-text'>🌤️ {plan.practical_info.weather_tips}</Text>
            <Text className='prac-text'>🎒 必备物品：{plan.practical_info.packing_list.join('、')}</Text>
            {plan.practical_info.emergency_contacts.map((c, i) => (
              <Text key={i} className='prac-text'>📞 {c.name}：{c.number}</Text>
            ))}
            {!!plan.practical_info.insurance_tips && (
              <Text className='prac-text'>🛡️ {plan.practical_info.insurance_tips}</Text>
            )}
          </View>

          {/* 8 尾页品牌区 */}
          <View className='tail'>
            <Image className='tail-logo' src={logo} mode='aspectFit' />
            <Text className='tail-text'>本方案由「鸥途」AI 旅行引擎生成</Text>
            <Text className='tail-sub'>长按识别小程序码，定制你的专属旅程</Text>
          </View>
        </View>
      </ScrollView>

      {/* 操作栏 */}
      <View className='pdf-actions'>
        <View className='pact' onClick={saveImage}>
          <Text className='pact-text'>保存到相册</Text>
        </View>
        <View className='pact pact-primary' onClick={() => Taro.showToast({ title: '点右上角「···」分享', icon: 'none' })}>
          <Text className='pact-text pact-text-light'>分享</Text>
        </View>
        <View className='pact' onClick={() => Taro.navigateBack()}>
          <Text className='pact-text'>重新生成</Text>
        </View>
      </View>
    </View>
  )
}
