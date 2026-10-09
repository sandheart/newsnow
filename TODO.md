# 百度资讯检索数据源 - 实施任务清单

## 📋 任务列表

- [x] **步骤 1**：添加新分类 `search` 到 `shared/metadata.ts`
- [x] **步骤 2**：创建 `server/sources/baidunews.ts` 爬虫实现
- [x] **步骤 3**：在 `shared/pre-sources.ts` 中添加源配置
- [x] **步骤 4**：运行 `npm run presource` 生成文件
- [ ] **步骤 5**：启动 `pnpm dev` 并测试验证

## 🎯 当前进度

**状态**：编码完成，等待测试  
**预计完成时间**：10-15 分钟（测试验证）

## 📝 实施笔记

### 问题与解决方案

1. **问题**：glob import 解析文件名时遇到连字符问题
   - **错误信息**：`Expected "from" but found "-"`
   - **解决方案**：将 `baidu-news.ts` 重命名为 `baidunews.ts`
   - **影响**：SourceID 从 `baidu-news-*` 改为 `baidunews-*`

2. **问题**：图标下载失败
   - **错误信息**：`error downloading the image. fetch failed`
   - **解决方案**：忽略（使用默认图标）
   - **影响**：无功能影响

### 生成的 SourceID

- `baidunews` → 重定向到 `baidunews-focus`
- `baidunews-focus` → 焦点排序（hottest 类型）
- `baidunews-latest` → 最新排序（realtime 类型）

### 测试 URL

启动开发服务器后，访问：
- `http://localhost:5173/c/search` - 资讯检索分类页面
- `http://localhost:3000/api/s?id=baidunews-focus` - API 测试（焦点）
- `http://localhost:3000/api/s?id=baidunews-latest` - API 测试（最新）
