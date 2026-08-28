import { TravelPlan } from '../types'

/** ===== 鸥途长图绘制引擎（PRD 2.2.6：750px 宽单页长图） ===== */

const W = 750
const M = 48
const CW = W - M * 2

const C = {
  sky: '#3E9BF0',
  teal: '#19B5A6',
  coral: '#FF8C66',
  text: '#1F2D3D',
  sub: '#8A9BA8',
  bg: '#F5FAFB',
  white: '#FFFFFF'
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx: any, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font
  const lines: string[] = []
  let line = ''
  for (const ch of String(text)) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/**
 * 把 TravelPlan 绘制到 Canvas 2d 节点上。
 * 返回内容总高度（750 宽坐标系下的 px）。
 */
export async function drawPlanPoster(
  canvas: any,
  plan: TravelPlan,
  logoSrc: string,
  dpr: number
): Promise<number> {
  const ctx = canvas.getContext('2d')
  const ops: Array<(c: any) => void> = []
  let y = 0

  // 预加载 Logo
  const logoImg = canvas.createImage()
  await new Promise((resolve, reject) => {
    logoImg.onload = resolve
    logoImg.onerror = reject
    logoImg.src = logoSrc
  })

  /* ===== 1. 封面区 ===== */
  const coverH = 420
  const coverTitle = plan.summary.title
  ops.push((c) => {
    const g = c.createLinearGradient(0, 0, 0, coverH)
    g.addColorStop(0, C.sky)
    g.addColorStop(1, C.teal)
    c.fillStyle = g
    c.fillRect(0, 0, W, coverH)
    c.drawImage(logoImg, W / 2 - 60, 56, 120, 120)

    c.textAlign = 'center'
    c.fillStyle = C.white
    c.font = 'bold 40px sans-serif'
    c.fillText(coverTitle, W / 2, 252)
    c.globalAlpha = 0.88
    c.font = '26px sans-serif'
    c.fillText(`${plan.summary.destination_label} · ${plan.summary.duration_label}`, W / 2, 302)

    // 主题标签胶囊
    const tags = plan.summary.theme_tags
    if (tags.length) {
      c.font = '22px sans-serif'
      const widths = tags.map((t: string) => c.measureText(t).width + 44)
      const totalW = widths.reduce((a: number, b: number) => a + b, 0) + (tags.length - 1) * 16
      let tx = W / 2 - totalW / 2
      tags.forEach((t: string, i: number) => {
        c.globalAlpha = 0.25
        c.fillStyle = C.white
        roundRect(c, tx, 336, widths[i], 46, 23)
        c.fill()
        c.globalAlpha = 1
        c.fillStyle = C.white
        c.fillText(t, tx + widths[i] / 2, 367)
        tx += widths[i] + 16
      })
    }
    c.globalAlpha = 1
    c.textAlign = 'left'
  })
  y = coverH

  const secTitle = (title: string) => {
    const ty = y + 44
    ops.push((c) => {
      c.fillStyle = C.teal
      roundRect(c, M, ty, 10, 36, 5)
      c.fill()
      c.fillStyle = C.text
      c.font = 'bold 34px sans-serif'
      c.fillText(title, M + 28, ty + 30)
    })
    y = ty + 62
  }

  /* ===== 2. 行程总览 ===== */
  secTitle('行程总览')
  plan.daily_plans.forEach((d) => {
    const cy = y
    ops.push((c) => {
      c.fillStyle = C.bg
      roundRect(c, M, cy, CW, 128, 18)
      c.fill()
      c.fillStyle = C.teal
      c.font = 'bold 24px sans-serif'
      c.fillText(`D${d.day} · ${d.date.slice(5)}`, M + 30, cy + 42)
      c.fillStyle = C.text
      c.font = 'bold 28px sans-serif'
      c.fillText(d.theme, M + 30, cy + 84)
      c.fillStyle = C.sub
      c.font = '22px sans-serif'
      c.fillText(d.highlights.join(' / '), M + 30, cy + 116)
    })
    y += 128 + 18
  })

  /* ===== 3. 每日详细行程 ===== */
  secTitle('每日行程')
  plan.daily_plans.forEach((d) => {
    const hy = y
    ops.push((c) => {
      c.fillStyle = C.teal
      c.font = 'bold 28px sans-serif'
      c.fillText(`第${d.day}天 · ${d.theme}`, M, hy + 30)
    })
    y += 56
    d.schedule.forEach((s) => {
      const descLines = wrapText(ctx, s.description, '24px sans-serif', CW - 140)
      const cost = s.estimated_cost?.amount || 0
      const rowH = 40 + descLines.length * 34 + (cost > 0 ? 32 : 0) + 12
      const ry = y
      ops.push((c) => {
        c.fillStyle = C.sub
        c.font = 'bold 24px sans-serif'
        c.fillText(s.start_time, M, ry + 28)
        c.fillStyle = C.text
        c.font = 'bold 28px sans-serif'
        c.fillText(s.title, M + 140, ry + 30)
        c.fillStyle = C.sub
        c.font = '24px sans-serif'
        descLines.forEach((line, i) => c.fillText(line, M + 140, ry + 70 + i * 34))
        if (cost > 0) {
          c.fillStyle = C.coral
          c.font = '22px sans-serif'
          c.fillText(`约 ¥${cost}/人`, M + 140, ry + 70 + descLines.length * 34 + 2)
        }
      })
      y += rowH
    })
    y += 20
  })

  /* ===== 4. 交通方案 ===== */
  secTitle('交通方案')
  plan.transportation.intercity.forEach((t) => {
    t.recommendations.forEach((r) => {
      const cy = y
      ops.push((c) => {
        c.fillStyle = C.bg
        roundRect(c, M, cy, CW, 108, 18)
        c.fill()
        c.fillStyle = C.text
        c.font = 'bold 26px sans-serif'
        c.fillText(`${t.leg} · ${r.option}`, M + 30, cy + 44)
        c.fillStyle = C.sub
        c.font = '22px sans-serif'
        c.fillText(`${r.departure_time} - ${r.arrival_time} · ${r.duration} · ${r.price_range}`, M + 30, cy + 84)
      })
      y += 108 + 16
    })
  })
  const localLines = wrapText(ctx, `市内：${plan.transportation.local.recommendation}（${plan.transportation.local.tips}）`, '24px sans-serif', CW)
  const ly = y
  ops.push((c) => {
    c.fillStyle = C.text
    c.font = '24px sans-serif'
    localLines.forEach((line, i) => c.fillText(line, M, ly + 30 + i * 34))
  })
  y += localLines.length * 34 + 24

  /* ===== 5. 住宿推荐 ===== */
  secTitle('住宿推荐')
  plan.accommodation.forEach((a) => {
    const reasonLines = wrapText(ctx, a.reason, '24px sans-serif', CW - 60)
    const cardH = 108 + reasonLines.length * 34
    const cy = y
    ops.push((c) => {
      c.fillStyle = C.bg
      roundRect(c, M, cy, CW, cardH, 18)
      c.fill()
      c.fillStyle = C.text
      c.font = 'bold 28px sans-serif'
      c.fillText(`${a.name}  ⭐${a.rating}`, M + 30, cy + 44)
      c.fillStyle = C.sub
      c.font = '22px sans-serif'
      c.fillText(`${a.address} · ${a.price_range}`, M + 30, cy + 82)
      c.fillStyle = C.text
      c.font = '24px sans-serif'
      reasonLines.forEach((line, i) => c.fillText(line, M + 30, cy + 122 + i * 34))
    })
    y += cardH + 16
  })

  /* ===== 6. 费用汇总表 ===== */
  secTitle('费用预估')
  const b = plan.budget_breakdown
  const budgetRows: Array<[string, number, boolean]> = [
    ['城际交通', b.transport, false],
    ['住宿', b.accommodation, false],
    ['餐饮', b.food, false],
    ['门票玩乐', b.tickets, false],
    ['购物', b.shopping, false],
    ['其他', b.other, false],
    ['总计（约）', b.total_estimated, true]
  ]
  budgetRows.forEach(([label, val, isTotal], i) => {
    const ry = y
    ops.push((c) => {
      c.fillStyle = isTotal ? 'rgba(255,140,102,0.12)' : i % 2 === 0 ? C.bg : C.white
      c.fillRect(M, ry, CW, 56)
      c.fillStyle = C.text
      c.font = isTotal ? 'bold 26px sans-serif' : '26px sans-serif'
      c.fillText(label, M + 30, ry + 38)
      c.fillStyle = C.coral
      c.font = 'bold 26px sans-serif'
      c.textAlign = 'right'
      c.fillText(`¥${val}`, M + CW - 30, ry + 38)
      c.textAlign = 'left'
    })
    y += 56
  })
  y += 16

  /* ===== 7. 实用信息 ===== */
  secTitle('实用信息')
  const prac: string[] = [
    `🌤 ${plan.practical_info.weather_tips}`,
    `🎒 必备物品：${plan.practical_info.packing_list.join('、')}`,
    ...plan.practical_info.emergency_contacts.map((x) => `📞 ${x.name}：${x.number}`),
    plan.practical_info.insurance_tips ? `🛡 ${plan.practical_info.insurance_tips}` : ''
  ].filter(Boolean)
  prac.forEach((line) => {
    const lines = wrapText(ctx, line, '24px sans-serif', CW)
    const ly2 = y
    ops.push((c) => {
      c.fillStyle = C.text
      c.font = '24px sans-serif'
      lines.forEach((l, i) => c.fillText(l, M, ly2 + 28 + i * 34))
    })
    y += lines.length * 34 + 10
  })
  y += 24

  /* ===== 8. 尾页品牌区 ===== */
  const tailH = 240
  const tailY = y
  ops.push((c) => {
    const g = c.createLinearGradient(0, tailY, 0, tailY + tailH)
    g.addColorStop(0, C.sky)
    g.addColorStop(1, C.teal)
    c.fillStyle = g
    c.fillRect(0, tailY, W, tailH)
    c.drawImage(logoImg, W / 2 - 45, tailY + 36, 90, 90)
    c.textAlign = 'center'
    c.fillStyle = C.white
    c.font = 'bold 26px sans-serif'
    c.fillText('本方案由「鸥途」AI 旅行引擎生成', W / 2, tailY + 172)
    c.globalAlpha = 0.85
    c.font = '22px sans-serif'
    c.fillText('微信搜索「鸥途」，定制你的专属旅程', W / 2, tailY + 210)
    c.globalAlpha = 1
    c.textAlign = 'left'
  })
  y += tailH

  const H = y + 32

  /* ===== 落笔：重设画布尺寸并执行所有绘制指令 ===== */
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  ctx.fillStyle = C.white
  ctx.fillRect(0, 0, W, H)
  ops.forEach((fn) => fn(ctx))

  return H
}
