# 百度资讯检索 - 测试验证指南

## ✅ 实施完成清单

### 已完成的工作

- [x] **步骤 1**：添加新分类 `search` 到 `shared/metadata.ts`
- [x] **步骤 2**：创建 `server/sources/baidu-news.ts` 爬虫实现
- [x] **步骤 3**：在 `shared/pre-sources.ts` 中添加源配置
- [x] **步骤 4**：运行 `npm run presource` 生成文件
  - ✅ `sources.json` 已生成
  - ✅ `pinyin.json` 已生成
  - ⚠️ 图标下载失败（网络问题，不影响功能）
- [ ] **步骤 5**：启动 `pnpm dev` 并测试验证

---

## 🧪 测试步骤

### 1. 启动开发服务器

```bash
pnpm dev
```

**预期输出**：
```
> newsnow@0.0.42 dev
> npm run presource && vite dev

ℹ Generated pinyin.json
ℹ Generated sources.json

  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

---

### 2. 验证分类显示

打开浏览器访问：`http://localhost:5173/`

**验证点**：
- [ ] 导航栏显示"资讯检索"分类
- [ ] 点击"资讯检索"显示百度资讯卡片

---

### 3. 验证数据抓取

#### 方法 1：浏览器直接访问

访问以下 URL：
- `http://localhost:5173/c/search` - 资讯检索分类页面

#### 方法 2：使用 API 测试

```bash
# 测试焦点排序
curl "http://localhost:3000/api/s?id=baidu-news-focus"

# 测试最新排序
curl "http://localhost:3000/api/s?id=baidu-news-latest"

# 强制刷新（绕过缓存）
curl "http://localhost:3000/api/s?id=baidu-news-focus&latest=true" \
  -H "Authorization: Bearer YOUR_JWT"
```

**预期响应**：
```json
{
  "status": "success",
  "id": "baidu-news-focus",
  "updatedTime": 1234567890,
  "items": [
    {
      "id": "https://...",
      "title": "某新闻标题",
      "url": "https://...",
      "extra": {
        "info": "新京报网",
        "hover": "新闻摘要内容...",
        "date": "4小时前"
      }
    },
    ...
  ]
}
```

---

### 4. 验证 UI 展示

打开浏览器开发者工具（F12），检查：

- [ ] **卡片标题**：
  - "百度资讯 [焦点]" - 蓝色主题
  - "百度资讯 [最新]" - 蓝色主题

- [ ] **新闻项**：
  - 显示标题（可点击跳转）
  - 显示来源（如"新京报网"）
  - 悬停显示摘要

- [ ] **汇总列**：
  - "最热"列包含 `baidu-news-focus`
  - "实时"列包含 `baidu-news-latest`

---

### 5. 验证数据库缓存

```bash
# 查看缓存数据
sqlite3 .data/db.sqlite "SELECT id, updated, length(data) FROM cache WHERE id LIKE 'baidu-news%'"

# 查看详细数据
sqlite3 .data/db.sqlite "SELECT * FROM cache WHERE id = 'baidu-news-focus'"
```

---

### 6. 验证拼音搜索

```bash
# 查看拼音映射
cat shared/pinyin.json | grep "baidu"
```

**预期输出**：
```json
{
  "baidu-news-focus": "baidu zixun jiaodian",
  "baidu-news-latest": "baidu zixun zuixin"
}
```

---

## 🐛 常见问题排查

### 问题 1：分类不显示

**原因**：TypeScript 类型缓存
**解决**：
```bash
# 重启 TypeScript 服务器（VS Code）
# 按 Ctrl+Shift+P → 输入 "TypeScript: Restart TS Server"
```

---

### 问题 2：数据抓取失败

**原因**：百度反爬或网络问题
**排查**：
```bash
# 查看服务器日志
# 在终端查看 pnpm dev 输出

# 手动测试 URL
curl -v "https://www.baidu.com/s?tn=news&rtt=1&bsst=1&cl=2&medium=1&ie=utf-8&wd=%E9%97%AE%E7%95%8C"
```

**解决**：
- 检查网络连接
- 检查 User-Agent
- 稍后重试（可能触发验证码）

---

### 问题 3：TypeScript 错误

**原因**：IDE 缓存未更新
**解决**：
```bash
# 重新生成类型定义
npm run presource

# 重启 TypeScript 服务器
# VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

# 或者重启 VS Code
```

---

### 问题 4：JSON 解析失败

**原因**：百度页面结构变化
**排查**：
```bash
# 手动访问页面查看 HTML 结构
curl "https://www.baidu.com/s?tn=news&rtt=1&bsst=1&cl=2&medium=1&ie=utf-8&wd=%E9%97%AE%E7%95%8C" \
  -o baidu-test.html

# 用浏览器打开查看 <!--s-data:{...}--> 结构
```

---

## 📊 验证清单

逐项确认：

### 基础功能
- [ ] `shared/metadata.ts` 包含 `search: { zh: "资讯检索" }`
- [ ] `server/sources/baidu-news.ts` 文件存在
- [ ] `shared/pre-sources.ts` 包含 `baidu-news` 配置
- [ ] `shared/sources.json` 包含生成的配置

### 数据抓取
- [ ] `baidu-news-focus` 返回焦点排序新闻
- [ ] `baidu-news-latest` 返回最新排序新闻
- [ ] 每条新闻包含：标题、链接、来源、摘要

### UI 展示
- [ ] "资讯检索"分类出现在导航栏
- [ ] 卡片标题显示正确（蓝色主题）
- [ ] 新闻项可点击跳转
- [ ] 悬停显示摘要

### 汇总列
- [ ] "最热"列包含 `baidu-news-focus`
- [ ] "实时"列包含 `baidu-news-latest`

### 数据库
- [ ] 缓存数据已写入数据库
- [ ] 拼音映射已生成

---

## 🎯 下一步

验证通过后：
1. ✅ 提交代码到 Git
2. ✅ 部署到 Cloudflare Pages
3. ✅ 配置百度图标（可选）

---

## 📝 备注

- TypeScript 错误只是 IDE 缓存问题，不影响实际运行
- 图标下载失败不影响功能，可以手动下载或后续补充
- 建议等待 30 分钟后再测试，避免频繁请求触发验证码
