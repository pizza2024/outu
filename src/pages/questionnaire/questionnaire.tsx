import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { clearDraft, getDraft, getUser, saveDraft, uuid } from '../../store/plan'
import { TravelRequest } from '../../types'
import './questionnaire.scss'

const TOTAL_STEPS = 5

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
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 本地时区格式化（避免 toISOString 的 UTC 偏移问题） */
function fmtLocal(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseLocal(s: string): Date {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
}

export default function Questionnaire() {
  const [step, setStep] = useState(1)

  // Step1 表单：出发地 + 目的地 + 日历 + 人数
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [depart, setDepart] = useState('')
  const [back, setBack] = useState('')
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth()) // 0-based
  const [adults, setAdults] = useState(1)
  const [elderly, setElderly] = useState(0)
  const [children, setChildren] = useState(0)

  // Step2 预算
  const [budgetIdx, setBudgetIdx] = useState(2)
  const [priority, setPriority] = useState<typeof PRIORITIES[number]['key']>('balanced')

  // Step3 偏好
  const [styles, setStyles] = useState<string[]>([])
  const [pace, setPace] = useState<typeof PACES[number]['key']>('comfortable')
  const [accommodation, setAccommodation] = useState<string[]>([])
  const [food, setFood] = useState<string[]>([])

  // Step4 特殊要求
  const [special, setSpecial] = useState('')

  const totalDays =
    depart && back
      ? Math.round((parseLocal(back).getTime() - parseLocal(depart).getTime()) / 86400000) + 1
      : 0

  const todayStr = fmtLocal(now.getFullYear(), now.getMonth(), now.getDate())

  /** 日历选择：第一次点选出发日，第二次点选回程日，再次点击重新选 */
  const pickDate = (dateStr: string) => {
    if (dateStr < todayStr) return
    if (!depart || (depart && back)) {
      setDepart(dateStr)
      setBack('')
    } else if (dateStr >= depart) {
      setBack(dateStr)
    } else {
      setDepart(dateStr)
    }
  }

  /** 日历翻月：往前不能早于当月，往后最多翻 6 个月 */
  const shiftMonth = (dir: -1 | 1) => {
    const idx = calYear * 12 + calMonth + dir
    const minIdx = now.getFullYear() * 12 + now.getMonth()
    if (idx < minIdx || idx > minIdx + 6) return
    setCalYear(Math.floor(idx / 12))
    setCalMonth(idx % 12)
  }

  /** 恢复草稿（模板预填 / 断点续填） */
  useEffect(() => {
    const draft = getDraft()
    if (draft) {
      if (draft.destinations?.length) setDest(draft.destinations.map((d) => d.city).join(''))
      if (draft.preferences?.styles?.length) setStyles(draft.preferences.styles)
      if (draft.origin?.city) setOrigin(draft.origin.city)
      if (draft.__step) setStep(Math.min(Math.max(draft.__step, 1), TOTAL_STEPS))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  const stepValid = (): boolean => {
    if (step === 1) return origin.trim().length > 0 && dest.trim().length > 0 && totalDays >= 1
    if (step === 3) return styles.length > 0
    return true
  }

  const persistDraft = (nextStep: number) => {
    saveDraft({
      destinations: dest.trim() ? [{ city: dest.trim(), country: '中国', days: totalDays || 1 }] : [],
      ...(origin.trim() ? { origin: { city: origin.trim() } } : {}),
      preferences: { styles, pace, accommodation, food },
      __step: nextStep
    })
  }

  const next = () => {
    if (!stepValid()) {
      const msg =
        step === 1
          ? !origin.trim()
            ? '请填写出发地'
            : !dest.trim()
              ? '请填写目的地'
              : '请在日历上选择出发和回程日期'
          : '请至少选择一项'
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
    destinations: [{ city: dest.trim(), country: '中国', days: totalDays }],
    origin: { city: origin.trim() },
    travel_dates: { departure_date: depart, return_date: back, total_days: totalDays },
    travelers: { adults, children, elderly, special_needs: [] },
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

  /** 渲染日历格子 */
  const renderCalendar = () => {
    const firstWeekday = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const cells: Array<string | null> = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => fmtLocal(calYear, calMonth, i + 1))
    ]
    return (
      <View className='cal'>
        <View className='cal-head'>
          <Text className='cal-nav' onClick={() => shiftMonth(-1)}>‹</Text>
          <Text className='cal-title'>{calYear} 年 {calMonth + 1} 月</Text>
          <Text className='cal-nav' onClick={() => shiftMonth(1)}>›</Text>
        </View>
        <View className='cal-week'>
          {WEEK_LABELS.map((w) => (
            <Text key={w} className='cal-week-label'>{w}</Text>
          ))}
        </View>
        <View className='cal-grid'>
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} className='cal-cell' />
            const disabled = d < todayStr
            const isDepart = d === depart
            const isBack = d === back
            const inRange = depart && back && d > depart && d < back
            const cls = `cal-cell ${disabled ? 'cal-cell-disabled' : ''} ${inRange ? 'cal-cell-range' : ''} ${isDepart || isBack ? 'cal-cell-picked' : ''}`
            return (
              <View key={d} className={cls} onClick={() => !disabled && pickDate(d)}>
                <Text className={`cal-day ${isDepart || isBack ? 'cal-day-picked' : ''} ${disabled ? 'cal-day-disabled' : ''}`}>
                  {Number(d.slice(8))}
                </Text>
                {isDepart && <Text className='cal-tag'>出发</Text>}
                {isBack && <Text className='cal-tag'>回程</Text>}
              </View>
            )
          })}
        </View>
      </View>
    )
  }

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
        {/* Step 1 单页表单：出发地/目的地 + 日历 + 人数 */}
        {step === 1 && (
          <View>
            <Text className='title'>从哪里出发，想去哪里？</Text>

            {/* 出发地 + 目的地 */}
            <View className='city-card'>
              <View className='city-field'>
                <Text className='city-label'>出发地</Text>
                <Input
                  className='city-input'
                  placeholder='如：上海'
                  placeholderClass='input-ph'
                  value={origin}
                  onInput={(e) => setOrigin(e.detail.value)}
                />
              </View>
              <View className='city-swap'>→</View>
              <View className='city-field'>
                <Text className='city-label'>目的地</Text>
                <Input
                  className='city-input'
                  placeholder='如：大理'
                  placeholderClass='input-ph'
                  value={dest}
                  onInput={(e) => setDest(e.detail.value)}
                />
              </View>
            </View>

            {/* 日历区 */}
            <View className='cal-card'>
              <Text className='card-label'>选择出发和回程日期</Text>
              {renderCalendar()}
              <View className='cal-result'>
                {totalDays > 0 ? (
                  <Text className='cal-result-text'>
                    {depart} 出发 · {back} 回程 · 共 {totalDays} 天 {totalDays - 1} 晚
                  </Text>
                ) : (
                  <Text className='cal-result-hint'>先点出发日，再点回程日</Text>
                )}
              </View>
            </View>

            {/* 人数 */}
            <View className='people-section'>
              {counter('成人', adults, setAdults, 1)}
              {counter('老人（65岁+）', elderly, setElderly)}
              {counter('小孩（0-12岁）', children, setChildren)}
            </View>
          </View>
        )}

        {/* Step 2 预算 */}
        {step === 2 && (
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
            <Text className='hint' style={{ marginTop: '36px' }}>预算优先花在哪儿？</Text>
            <View className='chips'>
              {PRIORITIES.map((p) => (
                <View key={p.key} className={`chip ${priority === p.key ? 'chip-on' : ''}`} onClick={() => setPriority(p.key)}>
                  <Text className={`chip-text ${priority === p.key ? 'chip-text-on' : ''}`}>{p.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 偏好 */}
        {step === 3 && (
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

        {/* Step 4 特殊要求 */}
        {step === 4 && (
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

        {/* Step 5 确认 */}
        {step === 5 && (
          <View>
            <Text className='title'>确认一下，马上出发！</Text>
            {[
              { label: '出发地', value: origin, edit: 1 },
              { label: '目的地', value: dest, edit: 1 },
              { label: '时间', value: `${depart} ~ ${back}（${totalDays}天）`, edit: 1 },
              { label: '人员', value: `${adults} 成人${elderly ? ` ${elderly} 老人` : ''}${children ? ` ${children} 小孩` : ''}`, edit: 1 },
              { label: '预算', value: `${BUDGET_RANGES[budgetIdx].label} · ${PRIORITIES.find((p) => p.key === priority)?.label}`, edit: 2 },
              { label: '偏好', value: `${styles.join('、')} · ${PACES.find((p) => p.key === pace)?.label}`, edit: 3 },
              { label: '特殊要求', value: special || '无', edit: 4 }
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
              <Text className='btn-primary-text'>开始制定 ✈️</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
