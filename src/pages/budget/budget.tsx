import { View, Text } from '@tarojs/components'
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import './budget.scss'

/** 工具页：功能规划ing，先占位 */
export default function Budget() {
  /** 转发 / 朋友圈分享 */
  useShareAppMessage(() => ({
    title: '鸥途 · AI 旅行助手，填一份问卷就能生成完整旅行方案',
    path: '/pages/launch/launch'
  }))
  useShareTimeline(() => ({
    title: '鸥途 · AI 旅行助手，不懂 AI 也能拥有完美旅行'
  }))

  return (
    <View className='budget-wip'>
      <Text className='budget-wip-emoji'>🧰</Text>
      <Text className='budget-wip-title'>工具箱开发中</Text>
      <Text className='budget-wip-sub'>预算分摊、汇率换算、清单核对{'\n'}等实用工具正在路上，敬请期待</Text>
    </View>
  )
}
