import { View, Text, Input, Picker, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { clearDraft, getDraft, getUser, saveDraft, uuid } from '../../store/plan'
import { TravelRequest } from '../../types'
import { getCurrentCity } from '../../utils/location'
import './questionnaire.scss'

const TOTAL_STEPS = 7

const BUDGET_RANGES: Array<{ label: string; range: [number, number] }> = [
  { label: '¥1000 以内', range: [0, 1000] },
  { label: '¥1000 - 3000', range: [1000, 3000] },
  { label: '¥3000 - 5000', range: [3000, 5000] },
  { label: '¥5000 - 10000', range: [5000, 10000] },
  { label: '¥10000 以上', range: [10000, 30000] }
]
const PRIORITIES = [
  { key: 'balanced', label: '均衡分配' },
  { key: 'accommodation', label: '住宿优先' },
  { key: 'experience', label: '体验优先' },
  { key: 'food', label: '餐饮优先' },
  { key: 'transport', label: '交通优先' }
] as const
const STYLE_CARDS: Array<{ label: string; emoji: string; sub: string }> = [
  { label: '自然风光', emoji: '⛰️', sub: '山川湖海，拥抱自然' },
  { label: '美食探店', emoji: '🍜', sub: '发现地道美味' },
  { label: '文化古迹', emoji: '🏛️', sub: '历史古迹、文化探索' },
  { label: '休闲度假', emoji: '🏖️', sub: '放松身心，悠闲度假' },
  { label: '购物', emoji: '🛍️', sub: '商圈市集，买买买' },
  { label: '户外运动', emoji: '🚴', sub: '徒步、潜水、骑行等' },
  { label: '亲子娱乐', emoji: '🎡', sub: '遛娃好去处' }
]
const PACES = [
  { key: 'intensive', label: '紧凑型', desc: '每天排满，多玩多看' },
  { key: 'comfortable', label: '舒适型', desc: '劳逸结合，刚刚好' },
  { key: 'relaxed', label: '慵懒型', desc: '慢下来，度假为主' }
] as const
const ACCOMMODATIONS = ['星级酒店', '精品民宿', '经济连锁', '特色住宿']
const FOODS = ['当地美食', '连锁餐厅', '网红打卡', '不限']
const SPECIAL_NEEDS = ['孕妇', '残障人士', '携带宠物', '婴儿车出行']

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function Questionnaire() {
  const [step, setStep] = useState(1)

  // Step1 出发地 + 目的地
  const [origin, setOrigin] = useState('')
  const [originGeo, setOriginGeo] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [cities, setCities] = useState<string[]>([])

  // Step2 时间
  const [depart, setDepart] = useState(fmt(new Date(Date.now() + 7 * 86400000)))
  const [back, setBack] = useState(fmt(new Date(Date.now() + 9 * 86400000)))

  // Step3 人员
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [elderly, setElderly] = useState(0)
  const [specialNeeds, setSpecialNeeds] = useState<string[]>([])

  // Step4 预算
  const [budgetIdx, setBudgetIdx] = useState(2)
  const [priority, setPriority] = useState<typeof PRIORITIES[number]['key']>('balanced')

  // Step5 偏好
  const [styles, setStyles] = useState<string[]>([])
  const [pace, setPace] = useState<typeof PACES[number]['key']>('comfortable')
  const [accommodation, setAccommodation] = useState<string[]>([])
  const [food, setFood] = useState<string[]>([])

  // Step6 特殊要求
  const [special, setSpecial] = useState('')

  const totalDays =
    Math.max(Math.round((new Date(back).getTime() - new Date(depart).getTime()) / 86400000) + 1, 1)

  /** 定位并填充出发地（失败静默，用户可手动输入） */
  const locate = async () => {
    if (locating) return
    setLocating(true)
    const geo = await getCurrentCity()
    setLocating(false)
    if (geo) {
      setOrigin(geo.city)
      setOriginGeo({ latitude: geo.latitude, longitude: geo.longitude })
    } else {
      Taro.showToast({ title: '定位失败，请手动输入出发地', icon: 'none' })
    }
  }

  /** 恢复草稿（模板预填 / 断点续填） */
  useEffect(() => {
    const draft = getDraft()
    if (draft) {
      if (draft.destinations?.length) setCities(draft.destinations.map((d) => d.city))
      if (draft.preferences?.styles?.length) setStyles(draft.preferences.styles)
      if (draft.origin?.city) {
        setOrigin(draft.origin.city)
        if (draft.origin.latitude && draft.origin.longitude) {
          setOriginGeo({ latitude: draft.origin.latitude, longitude: draft.origin.longitude })
        }
      }
      if (draft.__step) setStep(draft.__step)
    }
    // 无草稿出发地时自动定位填充默认值
    if (!draft?.origin?.city) locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  const stepValid = (): boolean => {
    if (step === 1) return origin.trim().length > 0 && cities.length > 0
    if (step === 2) return new Date(back) >= new Date(depart)
    if (step === 5) return styles.length > 0
    return true
  }

  const persistDraft = (nextStep: number) => {
    saveDraft({
      destinations: cities.map((c) => ({ city: c, country: '中国', days: 1 })),
      ...(origin.trim() ? { origin: { city: origin.trim(), ...(originGeo || {}) } } : {}),
      preferences: { styles, pace, accommodation, food },
      __step: nextStep
    })
  }

  const next = () => {
    if (!stepValid()) {
      const msg =
        step === 1
          ? !origin.trim() ? '请填写出发地（可点击定位）' : '请至少添加一个目的地'
          : step === 2 ? '返回日期不能早于出发日期' : '请至少选择一项'
      Taro.showToast({ title: msg, icon: 'none' })
      return
    }
    persistDraft(step + 1)
    setStep(step + 1)
  }

  const prev = () => {
    persistDraft(step - 1)
    setStep(step - 1)
  }

  const buildRequest = (): TravelRequest => ({
    request_id: uuid(),
    user_id: getUser()?.openid || 'guest',
    timestamp: new Date().toISOString(),
    destinations: cities.map((c) => ({ city: c, country: '中国', days: totalDays })),
    origin: { city: origin.trim(), ...(originGeo || {}) },
    travel_dates: { departure_date: depart, return_date: back, total_days: totalDays },
    travelers: { adults, children, elderly, special_needs: specialNeeds },
    budget: { total_range: BUDGET_RANGES[budgetIdx].range, currency: 'CNY', priority },
    preferences: {
      styles,
      pace,
      accommodation: accommodation.length ? accommodation : ['经济连锁'],
      food: food.length ? food : ['不限']
    },
    special_requests: special,
    template_id: getDraft()?.template_id
  })

  const submit = () => {
    const request = buildRequest()
    Taro.setStorageSync('outu_request', request)
    clearDraft()
    Taro.navigateTo({ url: '/pages/generating/generating' })
  }

  const counter = (label: string, value: number, setValue: (n: number) => void, min = 0) => (
    <View className='counter-row'>
      <Text className='counter-label'>{label}</Text>
      <View className='counter'>
        <View className='counter-btn' onClick={() => setValue(Math.max(min, value - 1))}>
          <Text className='counter-sign'>−</Text>
        </View>
        <Text className='counter-num'>{value}</Text>
        <View className='counter-btn' onClick={() => setValue(value + 1)}>
          <Text className='counter-sign'>＋</Text>
        </View>
      </View>
    </View>
  )

  const chipGroup = (options: string[], selected: string[], onToggle: (item: string) => void) => (
    <View className='chips'>
      {options.map((o) => (
        <View key={o} className={`chip ${selected.includes(o) ? 'chip-on' : ''}`} onClick={() => onToggle(o)}>
          <Text className={`chip-text ${selected.includes(o) ? 'chip-text-on' : ''}`}>{o}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <View className='q'>
      {/* 进度条 */}
      <View className='progress-wrap'>
        <Text className='progress-text'>{step}/{TOTAL_STEPS}</Text>
        <View className='progress-track'>
          <View className='progress-fill' style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </View>
      </View>

      <View className='body'>
        {/* Step 1 出发地 + 目的地 */}
        {step === 1 && (
          <View>
            <Text className='title'>从哪里出发，想去哪里？</Text>
            <Text className='hint'>出发地已按当前定位填写，可手动修改</Text>
            <View className='input-row'>
              <Input
                className='text-input'
                placeholder={locating ? '正在定位当前位置…' : '输入出发城市，如：上海'}
                placeholderClass='input-ph'
                value={origin}
                disabled={locating}
                onInput={(e) => {
                  setOrigin(e.detail.value)
                  setOriginGeo(null)
                }}
              />
              <View className='locate-btn' onClick={locate}>
                <Text className='locate-btn-text'>📍 定位</Text>
              </View>
            </View>
            <Text className='hint'>目的地：支持城市 / 国家 / 景区，可添加多个串联</Text>
            <View className='input-row'>
              <Input
                className='text-input'
                placeholder='输入目的地，如：大理'
                placeholderClass='input-ph'
                value={cityInput}
                confirmType='done'
                onInput={(e) => setCityInput(e.detail.value)}
                onConfirm={() => {
                  const c = cityInput.trim()
                  if (c && !cities.includes(c)) setCities([...cities, c])
                  setCityInput('')
                }}
              />
              <View
                className='add-btn'
                onClick={() => {
                  const c = cityInput.trim()
                  if (c && !cities.includes(c)) setCities([...cities, c])
                  setCityInput('')
                }}
              >
                <Text className='add-btn-text'>添加</Text>
              </View>
            </View>
            <View className='chips'>
              {cities.map((c) => (
                <View key={c} className='chip chip-on' onClick={() => setCities(cities.filter((x) => x !== c))}>
                  <Text className='chip-text chip-text-on'>{c} ✕</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 时间 */}
        {step === 2 && (
          <View>
            <Text className='title'>什么时候出发？</Text>
            <Picker mode='date' value={depart} onChange={(e) => setDepart(e.detail.value as string)}>
              <View className='picker-row'>
                <Text className='picker-label'>出发日期</Text>
                <Text className='picker-value'>{depart} ›</Text>
              </View>
            </Picker>
            <Picker mode='date' value={back} onChange={(e) => setBack(e.detail.value as string)}>
              <View className='picker-row'>
                <Text className='picker-label'>返回日期</Text>
                <Text className='picker-value'>{back} ›</Text>
              </View>
            </Picker>
            <View className='days-card'>
              <Text className='days-text'>共 {totalDays} 天 {totalDays - 1} 晚</Text>
              <Text className='days-sub'>旺季（节假日/寒暑假）建议提前 2 周预订机酒</Text>
            </View>
          </View>
        )}

        {/* Step 3 人员 */}
        {step === 3 && (
          <View>
            <Text className='title'>和谁一起去？</Text>
            {counter('成人', adults, setAdults, 1)}
            {counter('儿童（0-12岁）', children, setChildren)}
            {counter('老人（65岁+）', elderly, setElderly)}
            <Text className='hint' style={{ marginTop: '24px' }}>特殊需求（可多选）</Text>
            {chipGroup(SPECIAL_NEEDS, specialNeeds, (x) => toggle(specialNeeds, setSpecialNeeds, x))}
          </View>
        )}

        {/* Step 4 预算 */}
        {step === 4 && (
          <View>
            <Text className='title'>预算大概是多少？</Text>
            <Text className='hint'>人均总预算（不含购物）</Text>
            <View className='chips'>
              {BUDGET_RANGES.map((b, i) => (
                <View key={b.label} className={`chip ${budgetIdx === i ? 'chip-on' : ''}`} onClick={() => setBudgetIdx(i)}>
                  <Text className={`chip-text ${budgetIdx === i ? 'chip-text-on' : ''}`}>{b.label}</Text>
                </View>
              ))}
            </View>
            <Text className='hint' style={{ marginTop: '28px' }}>预算优先花在哪儿？</Text>
            <View className='chips'>
              {PRIORITIES.map((p) => (
                <View key={p.key} className={`chip ${priority === p.key ? 'chip-on' : ''}`} onClick={() => setPriority(p.key)}>
                  <Text className={`chip-text ${priority === p.key ? 'chip-text-on' : ''}`}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 5 偏好 */}
        {step === 5 && (
          <View>
            <Text className='title'>这次旅行你更期待什么？</Text>
            <Text className='hint'>可多选，帮助我们为你定制更合适的行程</Text>
            <View className='style-grid'>
              {STYLE_CARDS.map((s) => {
                const on = styles.includes(s.label)
                return (
                  <View key={s.label} className={`style-card ${on ? 'style-card-on' : ''}`} onClick={() => toggle(styles, setStyles, s.label)}>
                    {on && <View className='style-check'><Text className='style-check-icon'>✓</Text></View>}
                    <Text className='style-emoji'>{s.emoji}</Text>
                    <Text className={`style-label ${on ? 'style-label-on' : ''}`}>{s.label}</Text>
                    <Text className='style-sub'>{s.sub}</Text>
                  </View>
                )
              })}
            </View>
            <Text className='hint' style={{ marginTop: '36px' }}>节奏偏好</Text>
            {PACES.map((p) => (
              <View key={p.key} className={`pace-card ${pace === p.key ? 'pace-on' : ''}`} onClick={() => setPace(p.key)}>
                <Text className={`pace-label ${pace === p.key ? 'pace-label-on' : ''}`}>{p.label}</Text>
                <Text className='pace-desc'>{p.desc}</Text>
              </View>
            ))}
            <Text className='hint' style={{ marginTop: '36px' }}>住宿偏好（多选）</Text>
            {chipGroup(ACCOMMODATIONS, accommodation, (x) => toggle(accommodation, setAccommodation, x))}
            <Text className='hint' style={{ marginTop: '36px' }}>餐饮偏好（多选）</Text>
            {chipGroup(FOODS, food, (x) => toggle(food, setFood, x))}
          </View>
        )}

        {/* Step 6 特殊要求 */}
        {step === 6 && (
          <View>
            <Text className='title'>还有什么要叮嘱的？</Text>
            <Text className='hint'>选填。例如：带老人不方便走太多路 / 对海鲜过敏 / 想看日出</Text>
            <Textarea
              className='textarea'
              placeholder='写下你的特殊要求…'
              placeholderClass='input-ph'
              value={special}
              maxlength={200}
              onInput={(e) => setSpecial(e.detail.value)}
            />
          </View>
        )}

        {/* Step 7 确认 */}
        {step === 7 && (
          <View>
            <Text className='title'>确认一下，马上出发！</Text>
            {[
              { label: '出发地', value: origin, edit: 1 },
              { label: '目的地', value: cities.join(' → '), edit: 1 },
              { label: '时间', value: `${depart} ~ ${back}（${totalDays}天）`, edit: 2 },
              { label: '人员', value: `${adults}大 ${children}小 ${elderly}老${specialNeeds.length ? ' · ' + specialNeeds.join('/') : ''}`, edit: 3 },
              { label: '预算', value: `${BUDGET_RANGES[budgetIdx].label} · ${PRIORITIES.find((p) => p.key === priority)?.label}`, edit: 4 },
              { label: '偏好', value: `${styles.join('、')} · ${PACES.find((p) => p.key === pace)?.label}`, edit: 5 },
              { label: '特殊要求', value: special || '无', edit: 6 }
            ].map((row) => (
              <View key={row.label} className='confirm-row' onClick={() => setStep(row.edit)}>
                <Text className='confirm-label'>{row.label}</Text>
                <Text className='confirm-value'>{row.value}</Text>
                <Text className='confirm-edit'>修改 ›</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 底部按钮 */}
      <View className='footer'>
        {step < TOTAL_STEPS && (
          <Text className='footer-note'>💡 我们会根据你的选择优化行程建议</Text>
        )}
        <View className='footer-btns'>
          {step > 1 && (
            <View className='btn-ghost' onClick={prev}>
              <Text className='btn-ghost-text'>上一步</Text>
            </View>
          )}
          {step < TOTAL_STEPS ? (
            <View className='btn-primary' onClick={next}>
              <Text className='btn-primary-text'>下一题 →</Text>
            </View>
          ) : (
            <View className='btn-primary btn-go' onClick={submit}>
              <Text className='btn-primary-text'>开始规划 ✈️</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
