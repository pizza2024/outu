export default defineAppConfig({
  pages: [
    'pages/launch/launch',
    'pages/questionnaire/questionnaire',
    'pages/generating/generating',
    'pages/preview/preview',
    'pages/pdf/pdf',
    'pages/trips/trips',
    'pages/budget/budget',
    'pages/profile/profile'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2E7CF6',
    navigationBarTitleText: '鸥途',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F4F6FB'
  },
  tabBar: {
    color: '#8A94A6',
    selectedColor: '#2E7CF6',
    backgroundColor: '#FFFFFF',
    list: [
      {
        pagePath: 'pages/trips/trips',
        text: '行程',
        iconPath: './assets/tabbar/trip.png',
        selectedIconPath: './assets/tabbar/trip-active.png'
      },
      {
        pagePath: 'pages/budget/budget',
        text: '工具',
        iconPath: './assets/tabbar/tool.png',
        selectedIconPath: './assets/tabbar/tool-active.png'
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png'
      }
    ]
  },
  cloud: true
})
