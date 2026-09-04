import { View, Text } from '@tarojs/components'
import './budget.scss'

/** 工具页：功能规划ing，先占位 */
export default function Budget() {
  return (
    <View className='budget-wip'>
      <Text className='budget-wip-emoji'>🧰</Text>
      <Text className='budget-wip-title'>工具箱开发中</Text>
      <Text className='budget-wip-sub'>预算分摊、汇率换算、清单核对{'\n'}等实用工具正在路上，敬请期待</Text>
    </View>
  )
}
