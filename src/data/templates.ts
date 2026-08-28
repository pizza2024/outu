/** PRD 附录 8.1：MVP 预设模板清单 */
export interface TripTemplate {
  id: string
  name: string
  days: string
  audience: string
  tags: string[]
  emoji: string
  color: string
  description: string
}

export const TEMPLATES: TripTemplate[] = [
  {
    id: 'T001',
    name: '周末周边游',
    days: '2天1晚',
    audience: '上班族',
    tags: ['休闲度假'],
    emoji: '🌿',
    color: '#3EC6B8',
    description: '不请假也能出发，48 小时逃离城市'
  },
  {
    id: 'T002',
    name: '亲子欢乐行',
    days: '3天2晚',
    audience: '亲子家庭',
    tags: ['亲子娱乐'],
    emoji: '👨‍👩‍👧',
    color: '#F0934F',
    description: '轻松遛娃，大人小孩都开心'
  },
  {
    id: 'T003',
    name: '浪漫情侣游',
    days: '3天2晚',
    audience: '情侣',
    tags: ['休闲度假'],
    emoji: '💑',
    color: '#F06BA8',
    description: '两个人的仪式感旅程'
  },
  {
    id: 'T004',
    name: '文化深度游',
    days: '4天3晚',
    audience: '文艺青年',
    tags: ['文化古迹'],
    emoji: '🏛️',
    color: '#8E7CF0',
    description: '博物馆、古街巷与在地故事'
  },
  {
    id: 'T005',
    name: '自然风光探索',
    days: '3天2晚',
    audience: '户外爱好者',
    tags: ['自然风光', '户外运动'],
    emoji: '⛰️',
    color: '#4FB3E8',
    description: '山海湖林，奔赴自然'
  }
]
