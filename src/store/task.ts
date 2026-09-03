import Taro from '@tarojs/taro'

/** AI 生成任务：提交问卷后登记，全局可查询进度 */
export interface GenTask {
  job_id: string
  /** 目的地标签，如「大理」 */
  dest: string
  total_days: number
  created_at: number
  status: 'generating' | 'done' | 'error'
  plan_id?: string
  error?: string
}

const KEY = 'outu_gen_tasks'

export function getTasks(): GenTask[] {
  return Taro.getStorageSync(KEY) || []
}

export function addTask(t: GenTask) {
  const list = getTasks().filter((x) => x.job_id !== t.job_id)
  Taro.setStorageSync(KEY, [t, ...list].slice(0, 10))
}

export function updateTask(jobId: string, patch: Partial<GenTask>) {
  Taro.setStorageSync(KEY, getTasks().map((t) => (t.job_id === jobId ? { ...t, ...patch } : t)))
}

export function removeTask(jobId: string) {
  Taro.setStorageSync(KEY, getTasks().filter((t) => t.job_id !== jobId))
}
