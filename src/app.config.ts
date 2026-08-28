export default defineAppConfig({
  pages: [
    'pages/launch/launch',
    'pages/index/index',
    'pages/questionnaire/questionnaire',
    'pages/generating/generating',
    'pages/preview/preview',
    'pages/pdf/pdf',
    'pages/profile/profile'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3E9BF0',
    navigationBarTitleText: '鸥途',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5FAFB'
  },
  tabBar: {
    color: '#8A9BA8',
    selectedColor: '#19B5A6',
    backgroundColor: '#FFFFFF',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: './assets/tabbar/home.png',
        selectedIconPath: './assets/tabbar/home-active.png'
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
