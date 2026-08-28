# 鸥途 · AI 旅行助手小程序

Taro + React + TypeScript 前端（`outu/`）+ NestJS 自建后端（`outu-server/`）。

## 项目结构

```
outu/          小程序前端（微信开发者工具导入此目录）
outu-server/   后端服务（大模型规划引擎）
```

## 启动方式

**1. 启动后端**（每次开发先起它）：

```bash
cd outu-server
cp .env.example .env   # 首次，填入 LLM_API_KEY 等
npm install            # 首次
npm run dev            # 监听 http://127.0.0.1:3100
```

**2. 启动前端**：

```bash
cd outu
npm install            # 首次
npm run dev:weapp
```

微信开发者工具导入 `outu/`，确保「详情 → 本地设置 → 不校验合法域名」已勾选
（开发期访问 http://127.0.0.1:3100 需要）。

后端地址配置在 `outu/src/config.ts`。

## 大模型配置（outu-server/.env）

| 变量 | 说明 |
|---|---|
| `LLM_API_KEY` | 大模型 API Key |
| `LLM_BASE_URL` | 接口地址 |
| `LLM_MODEL` | 模型 ID |

| 平台 | LLM_BASE_URL | LLM_MODEL | 备注 |
|---|---|---|---|
| Moonshot 开放平台（上线推荐） | `https://api.moonshot.cn/v1` | `kimi-k2.6` | 按量付费，platform.moonshot.cn 申请，非推理模型、出方案快 |
| Kimi Code 编程套餐（调试用） | `https://api.kimi.com/coding/v1` | `kimi-for-coding` | sk-kimi- 开头订阅 Key；强制思考、单次生成约 100s |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 需账户有余额 |

## 页面流程

```
启动页 launch → 首页 index（模板/搜索）→ 问卷 questionnaire（7 步）
→ 规划中 generating → 行程预览 preview（微调）→ 长图 pdf（导出/分享）
→ 我的 profile（历史行程）
```

后端接口：`POST /api/plan/generate`，入参 PRD 3.1 需求 JSON，出参 PRD 3.2 方案 JSON。
生成策略：1 个全局信息请求 + 每天 1 个行程请求，并行执行。
