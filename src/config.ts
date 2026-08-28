import Taro from '@tarojs/taro'
import { API_TOKEN } from './config.local'

/** 云托管服务配置 */
export const CLOUD_ENV = 'prod-d9gj3mo751db3162d'
export const CLOUD_SERVICE = 'express-f6yc'

/** 公网备用地址（浏览器/H5 调试时用；小程序内优先走 callContainer） */
export const API_BASE = 'https://express-f6yc-295679-8-1466950806.sh.run.tcloudbase.com'

/** 本地开发后端地址（开发者工具里运行时走这里） */
export const LOCAL_API_BASE = 'http://127.0.0.1:3100'

/**
 * 是否本地开发模式：
 * 按运行时版本判断（开发者工具/开发版 = develop），不依赖编译环境变量
 * 注意：真机预览「开发版」时也会走本地后端，上传体验版/正式版走云托管
 */
export const IS_DEV = Taro.getAccountInfoSync().miniProgram.envVersion === 'develop'

/** 接口访问密钥：来自未提交的 config.local.ts（必须与后端环境变量 API_TOKEN 一致） */
export { API_TOKEN }
