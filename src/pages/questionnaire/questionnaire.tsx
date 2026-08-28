import { View, Text, Input, Picker, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { clearDraft, getDraft, getUser, saveDraft, uuid } from '../../store/plan'
import { TravelRequest } from '../../types'
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
const STYLES = ['文化古迹', '自然风光', '美食探店', '购物', '亲子娱乐', '户外运动', '休闲度假']
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

  // Step1 目的地
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

  /** 恢复草稿（模板预填 / 断点续填） */
  useEffect(() => {
    const draft = getDraft()
    if (!draft) return
    if (draft.destinations?.length) setCities(draft.destinations.map((d) => d.city))
    if (draft.preferences?.styles?.length) setStyles(draft.preferences.styles)
    if (draft.__step) setStep(draft.__step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  const stepValid = (): boolean => {
    if (step === 1) return cities.length > 0
    if (step === 2) return new Date(back) >= new Date(depart)
    if (step === 5) return styles.length > 0
    return true
  }

  const persistDraft = (nextStep: number) => {
    saveDraft({
      destinations: cities.map((c) => ({ city: c, country: '中国', days: 1 })),
      preferences: { styles, pace, accommodation, food },
      __step: nextStep
    })
  }

  const next = () => {
    if (!stepValid()) {
      Taro.showToast({ title: step === 1 ? '请至少添加一个目的地' : step === 2 ? '返回日期不能早于出发日期' : '请至少选择一项', icon: 'none' })
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

  const stepTitles = ['目的地', '出行时间', '同行人员', '预算范围', '旅行偏好', '特殊要求', '确认信息']

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
        <View className='progress-track'>
          <View className='progress-fill' style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </View>
        <Text className='progress-text'>第 {step}/{TOTAL_STEPS} 步 · {stepTitles[step - 1]}</Text>
      </View>

      <View className='body'>
        {/* Step 1 目的地 */}
        {step === 1 && (
          <View>
            <Text className='title'>想去哪里？</Text>
            <Text className='hint'>支持城市 / 国家 / 景区，可添加多个目的地串联</Text>
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
            <Text className='title'>喜欢怎么玩？</Text>
            <Text className='hint'>旅行风格（多选）</Text>
            {chipGroup(STYLES, styles, (x) => toggle(styles, setStyles, x))}
            <Text className='hint' style={{ marginTop: '28px' }}>节奏偏好</Text>
            {PACES.map((p) => (
              <View key={p.key} className={`pace-card ${pace === p.key ? 'pace-on' : ''}`} onClick={() => setPace(p.key)}>
                <Text className={`pace-label ${pace === p.key ? 'pace-label-on' : ''}`}>{p.label}</Text>
                <Text className='pace-desc'>{p.desc}</Text>
              </View>
            ))}
            <Text className='hint' style={{ marginTop: '28px' }}>住宿偏好（多选）</Text>
            {chipGroup(ACCOMMODATIONS, accommodation, (x) => toggle(accommodation, setAccommodation, x))}
            <Text className='hint' style={{ marginTop: '28px' }}>餐饮偏好（多选）</Text>
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
        {step > 1 && (
          <View className='btn-ghost' onClick={prev}>
            <Text className='btn-ghost-text'>上一步</Text>
          </View>
        )}
        {step < TOTAL_STEPS ? (
          <View className='btn-primary' onClick={next}>
            <Text className='btn-primary-text'>下一步</Text>
          </View>
        ) : (
          <View className='btn-primary btn-go' onClick={submit}>
            <Text className='btn-primary-text'>🕊️ 开始规划</Text>
          </View>
        )}
      </View>
    </View>
  )
}
