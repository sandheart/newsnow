# CLAUDE.md

本文件为 Claude Code 提供在本仓库中工作的指导。
回复全部使用中文

## 项目概述

NewsNow 是一个实时新闻聚合平台，通过爬虫和 API 从 40+ 个新闻源（微博、知乎、B站、Hacker News 等）抓取热门内容，提供优雅的阅读体验。支持 GitHub OAuth 登录、数据云同步、30分钟缓存（登录用户可强制刷新）。

**技术栈**：React 19 + TanStack Router + Jotai + React Query + UnoCSS（前端）| Nitro + H3 + db0 + JWT（后端）

## 常用命令

### 开发

```bash

# 升级全局 Corepack
npm install -g corepack@latest

# 重新启用并准备 pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 安装依赖（需要 Node.js >= 20）
corepack enable
pnpm i

# 启动开发服务器（自动运行 presource）
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行单个测试文件
pnpm test server/utils/date.test.ts

# 运行匹配模式的测试
pnpm test date
```

测试框架：Vitest，测试文件匹配 `*.test.ts`，位于 `server/`、`shared/` 或 `test/` 目录。

### 源管理

```bash
# 添加/修改源后，重新生成源文件
npm run presource
```

此命令运行 `scripts/favicon.ts` 和 `scripts/source.ts`，生成：

- `shared/sources.json` - 编译后的源配置
- `shared/pinyin.json` - 中文拼音映射（用于搜索）
- `shared/updated-sources.ts` - 最近更新的源列表（基于 git diff）

### 部署

```bash
# Cloudflare Pages 部署
pnpm deploy

# 本地预览（Wrangler）
pnpm preview

# 启动生产服务器（Node.js）
pnpm start

# 查看 Cloudflare Pages 日志
pnpm log

# Docker 部署
docker compose up
```

### 发布

```bash
# 版本号管理 + 发布
pnpm release
```

## 架构概览

### 目录结构

```
src/                    # 前端 React 应用
├── routes/            # TanStack Router 文件路由（自动生成）
├── components/        # UI 组件（column/card/dnd/search-bar）
├── hooks/             # 自定义 hooks（query/sync/login/refetch）
├── atoms/             # Jotai 原子状态（metadata/focus/column）
└── utils/             # 工具函数（data/pwa）

server/                # 后端 Nitro 应用
├── api/               # API 路由（/s /s/entire /me/sync /oauth/github）
├── sources/           # 40+ 新闻源抓取器（weibo/bilibili/hackernews）
├── database/          # 数据库操作（cache/user）
├── middleware/        # 中间件（auth JWT 验证）
└── utils/             # 工具函数（fetch/crypto/date/rss2json）

shared/                # 前后端共享代码
├── types.ts           # 核心类型（SourceID/NewsItem/SourceResponse）
├── pre-sources.ts     # 源配置定义（40+ 源元数据）
├── metadata.ts        # 栏目定义（china/tech/finance/sports）
├── sources.json       # 生成的源配置（由 presource 生成）
├── pinyin.json        # 生成的拼音映射（由 presource 生成）
└── verify.ts          # 数据验证函数

tools/                 # 构建工具
└── rollup-glob.ts     # Rollup glob 导入插件
```

### 核心概念

#### 源系统（Source System）

每个新闻源由两部分组成：

1. **配置定义**（`shared/pre-sources.ts`）：

```typescript
"weibo": {
  name: "微博",
  title: "实时热搜",
  type: "hottest",        // hottest | realtime
  column: "china",        // china | world | tech | finance | sports
  interval: Time.Realtime // 刷新间隔（2分钟）
}
```

2. **抓取器实现**（`server/sources/weibo.ts`）：

```typescript
export default defineSource(async () => {
  const data = await myFetch("https://weibo.com/ajax/side/hotSearch")
  return data.map(item => ({
    id: item.id,
    title: item.word,
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
    extra: {
      info: `${item.num}阅读`,
      icon: item.icon,
    },
  }))
})
```

**源可以有子源**（如 `bilibili-hot-search`、`bilibili-hot-video`），通过 `sub` 字段定义。

**NewsItem 接口**（`shared/types.ts`）：

```typescript
interface NewsItem {
  id: string | number // 唯一标识
  title: string // 标题
  url: string // 链接
  mobileUrl?: string // 移动端链接（可选）
  pubDate?: number | string // 发布时间
  extra?: {
    hover?: string // 悬停提示
    date?: number | string // 格式化日期
    info?: false | string // 附加信息（如阅读量）
    diff?: number // 排名变化（热门源）
    icon?: false | string | { url: string, scale: number }
  }
}
```

#### 缓存策略

**双层缓存机制**：

1. **interval（源刷新间隔）**：每个源定义最小刷新时间，避免频繁请求被封 IP
2. **TTL（30分钟）**：缓存过期时间，过期后必须重新抓取

**API 路由逻辑**（`server/api/s/index.ts`）：

```typescript
// 优先级：interval > TTL > 抓取新数据
if (cache) {
  // 1. 在 interval 内：直接返回缓存（不更新）
  if (now - cache.updated < sources[id].interval) {
    return { status: "success", items: cache.items }
  }

  // 2. 在 TTL 内 + 非 latest 请求：返回缓存（可复用）
  if (now - cache.updated < TTL && !latest) {
    return { status: "cache", items: cache.items }
  }
}

// 3. 过期/无缓存/latest 请求：抓取新数据
const newData = await getters[id]()
await cacheTable.set(id, newData)
return { status: "success", items: newData }
```

**强制刷新**：登录用户可通过 `?latest=true` + JWT 绕过缓存。

#### 前端数据流

**状态管理**（Jotai）：

```typescript
// 元数据结构（存储在 localStorage + 云同步）
interface PrimitiveMetadata {
  updatedTime: number
  data: {
    focus: SourceID[] // 关注源（用户自定义）
    hottest: SourceID[] // 热门源（自动排序）
    realtime: SourceID[] // 实时源（自动排序）
    updated: SourceID[] // 最近更新源（基于 git diff）
  }
  action: "init" | "manual" | "sync"
}

// 核心原子
primitiveMetadataAtom // 元数据状态（本地存储 + 时间戳比较更新）
currentColumnIDAtom // 当前栏目（focus/hottest/realtime/updated）
currentSourcesAtom // 当前源列表（只读，由元数据派生）
focusSourcesAtom // 关注源（可写，同步到元数据）
```

**数据请求**（React Query）：

```typescript
// 批量查询优化（POST /s/entire）
useEntireQuery(items) {
  // 一次获取多个源的缓存，更新本地 cacheSources Map
  // 触发单个源的 useQuery 更新
}

// 单个源查询（useQuery）
queryKey: ["source", id]
queryFn: async () => {
  // 检查 refetchSources Set → 决定是否带 ?latest 参数
  // 计算排名变化（热门源：diff = oldIndex - newIndex）
  // 更新 cacheSources Map
}
staleTime: Infinity  // 手动控制刷新（通过 refetchSources）
```

**缓存 Map**（`src/utils/data.ts`）：

```typescript
export const cacheSources = new Map<SourceID, SourceResponse>() // 本地缓存
export const refetchSources = new Set<SourceID>() // 强制刷新标记
```

#### 用户同步系统

**登录流程**（GitHub OAuth）：

1. 前端跳转 `/api/login` → 重定向到 GitHub 授权页
2. GitHub 回调 `/api/oauth/github` → 获取 access_token → 获取用户信息
3. 创建/更新用户（`user` 表）→ 签发 JWT（60天有效期）
4. 重定向回前端（URL 参数：`?login=github&jwt=xxx&user=xxx`）
5. 前端存储 JWT 到 localStorage

**数据同步**（`src/hooks/useSync.ts`）：

- **上传**：`primitiveMetadata.action === "manual"` 时，防抖 10秒后上传到 `/me/sync`
- **下载**：登录后自动从 `/me/sync` 下载元数据，合并到本地状态
- **冲突解决**：比较 `updatedTime`，较新者胜出

#### 多部署目标

**环境检测**（`nitro.config.ts`）：

```typescript
if (process.env.CF_PAGES) {
  preset = "cloudflare-pages"
  database = { connector: "cloudflare-d1", bindingName: "NEWSNOW_DB" }
} else if (process.env.VERCEL) {
  preset = "vercel-edge"
  database = undefined // Vercel 无数据库（需自行配置）
} else if (process.env.BUN) {
  preset = "bun"
  database = { connector: "bun-sqlite" }
} else {
  preset = "node-server"
  database = { connector: "better-sqlite3" } // 本地开发
}
```

**数据库表结构**：

```sql
-- 缓存表
CREATE TABLE cache (
  id TEXT PRIMARY KEY,      -- SourceID
  updated INTEGER,          -- 更新时间戳
  data TEXT                 -- JSON 序列化的 NewsItem[]
);

-- 用户表
CREATE TABLE user (
  id TEXT PRIMARY KEY,      -- GitHub ID
  email TEXT,
  data TEXT,                -- JSON 序列化的 PrimitiveMetadata
  type TEXT,                -- "github"
  created INTEGER,
  updated INTEGER
);
CREATE INDEX idx_user_id ON user(id);
```

## 路径别名

- `~/*` → `src/*`（前端）
- `@shared/*` → `shared/*`（共享代码）
- `#/*` → `server/*`（后端，仅在 tsconfig.node.json 中定义）

## 自动导入

项目使用 `unimport` 自动导入常用工具，无需显式 import：

- React hooks：`useState`, `useEffect`, `useCallback`, `useMemo`
- Jotai：`atom`, `useAtom`, `useAtomValue`, `useSetAtom`
- 工具函数：`$` (clsx), `typeSafeObjectEntries`, `myFetch`
- 常量：`sources`, `metadata`, `TTL`, `Interval`

生成的类型定义：`imports.app.d.ts`

配置：`vite.config.ts` → `unimport.vite({ dirs: [...] })`

## 环境变量

参见 `example.env.server`：

```bash
# GitHub OAuth（必需）
G_CLIENT_ID=your_github_app_client_id
G_CLIENT_SECRET=your_github_app_client_secret

# JWT 密钥（必需，可与 Client Secret 相同）
JWT_SECRET=your_jwt_secret

# 数据库初始化（首次运行必须设为 true）
INIT_TABLE=true

# 是否启用缓存（默认 true）
ENABLE_CACHE=true

# Product Hunt API Token（可选，用于抓取 Product Hunt）
PRODUCTHUNT_API_TOKEN=your_producthunt_token
```

**本地开发**：复制 `example.env.server` 为 `.env.server` 并配置。

## 添加新源

### 步骤

1. **注册源配置**（`shared/pre-sources.ts`）：

```typescript
"newsource": {
  name: "新源名称",
  color: "blue",           // UnoCSS 颜色（slate/red/blue/green 等）
  home: "https://example.com",
  column: "tech",          // 所属栏目
  type: "hottest",         // hottest | realtime
  interval: Time.Default   // 刷新间隔（10分钟）
}
```

2. **实现抓取器**（`server/sources/newsource.ts`）：

```typescript
import type { NewsItem } from "@shared/types"

export default defineSource(async () => {
  const data = await myFetch("https://api.example.com/hot")
  return data.items.map(item => ({
    id: item.id,
    title: item.title,
    url: item.url,
    pubDate: item.created_at,
    extra: {
      info: `${item.views}阅读`,
      icon: item.thumbnail,
    },
  })) as NewsItem[]
})
```

3. **重新生成源文件**：

```bash
npm run presource
```

4. **测试**：

```bash
pnpm dev
```

访问应用，确认新源正常显示。

### 辅助函数

- `defineSource()` - 类型安全的源定义
- `defineRSSSource(url)` - RSS 源快捷方式
- `defineRSSHubSource(route)` - RSSHub 源快捷方式
- `myFetch(url, options)` - 带 User-Agent + 重试的 HTTP 请求
- `rss2json(url)` - RSS XML 转 JSON

参见 `CONTRIBUTING.md` 获取详细指南。

## 关键设计决策

### 性能优化

1. **虚拟滚动**：卡片使用 `useInView` 懒加载，仅可见时渲染
2. **批量请求**：`POST /s/entire` 一次获取多个源缓存，减少请求数
3. **智能缓存**：根据源更新频率动态调整刷新间隔，避免 IP 封禁
4. **拖拽节流**：200ms 节流避免动画冲突
5. **PWA**：Service Worker 离线缓存（`pwa.config.ts`）

### 安全机制

1. **JWT 验证**（`server/middleware/auth.ts`）：
   - `/api/s`、`/api/me` 路由需要 JWT
   - 验证失败返回 401（`/api/me`）或记录警告（`/api/s`）
   - 未配置环境变量时返回 506（禁用登录）

2. **数据验证**（`shared/verify.ts`）：
   - `verifyPrimitiveMetadata()` 验证元数据结构
   - 防止恶意数据注入

3. **Crypto 兼容**（`server/utils/crypto.ts`）：
   - Cloudflare Worker 使用 Web Crypto API
   - Node.js 使用 `md5` 库作为 fallback

### 排名追踪

热门源（`type: "hottest"`）显示排名变化动画：

```typescript
// 计算排名变化
response.items.forEach((item, i) => {
  const oldIndex = cacheSources.get(id).items.findIndex(k => k.id === item.id)
  item.extra.diff = oldIndex - i  // 正数上升，负数下降
})

// 显示动画（5秒后消失）
<DiffNumber diff={item.extra.diff} />
```

## 代码风格

- **TypeScript**：严格模式，现代 ES6+ 语法
- **ESLint**：`@ourongxing/eslint-config`（包含 React + TypeScript 规则）
- **Pre-commit**：`lint-staged` 自动修复（`pnpm lint --fix`）
- **函数式**：优先使用函数式风格（箭头函数、解构、map/filter）
- **类型安全**：使用 `typeSafeObjectEntries` 等工具函数保证类型推断

## 常见问题

### Q: 如何调试源抓取失败？

A: 查看 `server/utils/logger.ts` 的日志输出，使用 `pnpm log` 查看 Cloudflare Pages 日志。

### Q: 如何禁用某个源？

A: 在 `shared/pre-sources.ts` 中设置 `disable: true`（或 `disable: "cf"` 仅在 Cloudflare 禁用）。

### Q: 如何修改缓存时间？

A: 修改 `shared/consts.ts` 中的 `TTL`（默认 30分钟）和 `Interval`（默认 10分钟）。

### Q: 如何添加新的栏目？

A: 在 `shared/metadata.ts` 中添加栏目定义，并在 `shared/pre-sources.ts` 中将源的 `column` 指向新栏目。

## 相关资源

- **官方文档**：https://github.com/ourongxing/newsnow
- **在线演示**：https://newsnow.busiyi.world
- **MCP Server**：`npx -y newsnow-mcp-server`（支持自定义 BASE_URL）
- **数据库连接器**：https://db0.unjs.io/connectors
- **RSSHub**：https://docs.rsshub.app（用于生成 RSS 源）
