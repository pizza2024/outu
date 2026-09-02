import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { getPlan } from '../../store/plan'
import './budget.scss'

interface Category {
  key: string
  icon: string
  label: string
  amount: number
}

const DEFAULT_CATS: Category[] = [
  { key: 'transport', icon: '✈️', label: '交通', amount: 0 },
  { key: 'accommodation', icon: '🏨', label: '住宿', amount: 0 },
  { key: 'food', icon: '🍜', label: '餐饮', amount: 0 },
  { key: 'tickets', icon: '🎫', label: '门票 & 活动', amount: 0 }
]

export default function Budget() {
  const [people, setPeople] = useState(2)
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATS)
  const [mode, setMode] = useState<'share' | 'custom'>('share')
  const [customPer, setCustomPer] = useState<Record<string, number>>({})
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  /** 有当前行程方案时，用方案预算初始化 */
  useDidShow(() => {
    const plan = getPlan()
    if (plan) {
      const b = plan.budget_breakdown
      setCats([
        { key: 'transport', icon: '✈️', label: '交通', amount: b.transport || 0 },
        { key: 'accommodation', icon: '🏨', label: '住宿', amount: b.accommodation || 0 },
        { key: 'food', icon: '🍜', label: '餐饮', amount: b.food || 0 },
        { key: 'tickets', icon: '🎫', label: '门票 & 活动', amount: (b.tickets || 0) + (b.other || 0) }
      ])
    }
  })

  const total = cats.reduce((s, c) => s + (c.amount || 0), 0)

  /** 人均：均摊模式 = 总额/人数；自定义模式 = 手填的每人金额 */
  const perOf = (c: Category) =>
    mode === 'share'
      ? Math.round((c.amount || 0) / people)
      : (customPer[c.key] ?? Math.round((c.amount || 0) / people))

  const perTotal =
    mode === 'share'
      ? Math.round(total / people)
      : cats.reduce((s, c) => s + perOf(c), 0)

  const setAmount = (key: string, v: string) => {
    const n = Math.max(0, parseInt(v.replace(/[^\d]/g, ''), 10) || 0)
    setCats(cats.map((c) => (c.key === key ? { ...c, amount: n } : c)))
  }

  const setPer = (key: string, v: string) => {
    const n = Math.max(0, parseInt(v.replace(/[^\d]/g, ''), 10) || 0)
    setCustomPer({ ...customPer, [key]: n })
  }

  const addCat = () => {
    const label = newLabel.trim()
    if (!label) return
    setCats([...cats, { key: `custom_${Date.now()}`, icon: '📌', label, amount: 0 }])
    setNewLabel('')
    setAdding(false)
  }

  return (
    <View className='budget'>
      <ScrollView className='budget-scroll' scrollY>
        {/* 同行人 */}
        <View className='people-card'>
          <View className='people-info'>
            <Text className='people-title'>旅行经费计算</Text>
            <Text className='people-sub'>所有金额实时重算，透明可见</Text>
          </View>
          <View className='people-counter'>
            <View className='people-btn' onClick={() => setPeople(Math.max(1, people - 1))}>
              <Text className='people-sign'>−</Text>
            </View>
            <Text className='people-num'>{people} 人</Text>
            <View className='people-btn' onClick={() => setPeople(people + 1)}>
              <Text className='people-sign'>＋</Text>
            </View>
          </View>
        </View>

        {/* 总预算 */}
        <View className='total-card'>
          <Text className='total-label'>总预算（所有人）</Text>
          <Text className='total-value'>¥ {total.toLocaleString()}</Text>
          <Text className='total-per'>人均预算 ¥{perTotal.toLocaleString()}</Text>
        </View>

        {/* 分摊模式 */}
        <View className='mode-tabs'>
          <View className={`mode-tab ${mode === 'share' ? 'mode-tab-on' : ''}`} onClick={() => setMode('share')}>
            <Text className={`mode-tab-text ${mode === 'share' ? 'mode-tab-text-on' : ''}`}>均摊模式</Text>
          </View>
          <View className={`mode-tab ${mode === 'custom' ? 'mode-tab-on' : ''}`} onClick={() => setMode('custom')}>
            <Text className={`mode-tab-text ${mode === 'custom' ? 'mode-tab-text-on' : ''}`}>自定义分摊</Text>
          </View>
        </View>

        {/* 分类明细 */}
        <View className='cat-list'>
          {cats.map((c) => (
            <View key={c.key} className='cat-row'>
              <View className='cat-icon-wrap'>
                <Text className='cat-icon'>{c.icon}</Text>
              </View>
              <View className='cat-main'>
                <Text className='cat-label'>{c.label}</Text>
                {mode === 'custom' ? (
                  <View className='cat-per-edit'>
                    <Text className='cat-per-label'>每人 ¥</Text>
                    <Input
                      className='cat-per-input'
                      type='number'
                      value={String(perOf(c))}
                      onInput={(e) => setPer(c.key, e.detail.value)}
                    />
                  </View>
                ) : (
                  <Text className='cat-per-label'>人均 ¥{perOf(c).toLocaleString()}</Text>
                )}
              </View>
              <View className='cat-amount-wrap'>
                <Text className='cat-cny'>¥</Text>
                <Input
                  className='cat-amount'
                  type='number'
                  value={String(c.amount || '')}
                  placeholder='0'
                  onInput={(e) => setAmount(c.key, e.detail.value)}
                />
              </View>
            </View>
          ))}
        </View>

        {adding && (
          <View className='add-form'>
            <Input
              className='add-input'
              placeholder='分类名称，如：购物'
              placeholderClass='add-ph'
              value={newLabel}
              onInput={(e) => setNewLabel(e.detail.value)}
            />
            <View className='add-ok' onClick={addCat}>
              <Text className='add-ok-text'>添加</Text>
            </View>
          </View>
        )}

        <Text className='footnote'>💡 金额修改后实时重算，人均分摊一目了然</Text>
        <View style={{ height: '160px' }} />
      </ScrollView>

      {/* 悬浮添加按钮 */}
      {!adding && (
        <View className='fab' onClick={() => setAdding(true)}>
          <Text className='fab-icon'>＋</Text>
        </View>
      )}
    </View>
  )
}
