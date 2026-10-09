# 百度资讯标题清理示例

## 问题背景

百度资讯返回的标题包含 HTML 高亮标签，如：
```html
全新一代<em>问界</em>M9
```

需要清理为纯文本：
```
全新一代问界M9
```

---

## 解决方案

### 修改前（正则表达式）

```typescript
const cleanTitle = data.title.replace(/<[^>]+>/g, "")
```

**问题**：
- ❌ 无法处理 HTML 实体（`&amp;`、`&lt;` 等）
- ❌ 可能遗漏某些标签
- ❌ 不够健壮

---

### 修改后（cheerio.text()）

```typescript
const cleanTitle = cheerio.load(data.title).text().trim()
```

**优势**：
- ✅ 移除所有 HTML 标签
- ✅ 解码 HTML 实体
- ✅ 去除首尾空白
- ✅ 更健壮、更可靠

---

## 测试用例

### 用例 1：包含 `<em>` 标签

**输入**：
```html
全新一代<em>问界</em>M9
```

**输出**：
```
全新一代问界M9
```

---

### 用例 2：包含多个标签

**输入**：
```html
<strong>重磅</strong>！<em>AI</em>技术突破
```

**输出**：
```
重磅！AI技术突破
```

---

### 用例 3：包含 HTML 实体

**输入**：
```html
AI &amp; 机器人
```

**输出**：
```
AI & 机器人
```

---

### 用例 4：复杂场景

**输入**：
```html
<em>华为</em>发布&lt;新一代&gt;芯片
```

**输出**：
```
华为发布<新一代>芯片
```

---

## 实现代码

```typescript
// server/sources/baidunews.ts

try {
  const data: BaiduNewsData = JSON.parse(jsonMatch[1])

  // 使用 cheerio 提取纯文本标题（移除 HTML 标签和实体）
  const cleanTitle = cheerio.load(data.title).text().trim()

  if (cleanTitle && data.titleUrl) {
    news.push({
      id: data.titleUrl,
      title: cleanTitle,  // ← 纯文本标题
      url: data.titleUrl,
      extra: {
        info: data.sourceName,
        hover: data.summary,
        date: data.dispTime,
      },
    })
  }
}
```

---

## 验证方法

### 方法 1：API 测试

```bash
curl "http://localhost:3000/api/s?id=baidunews-focus" | jq '.items[0].title'
```

**预期输出**：纯文本，无 HTML 标签

---

### 方法 2：浏览器控制台

打开浏览器开发者工具，查看网络请求响应：
```json
{
  "status": "success",
  "items": [
    {
      "id": "https://...",
      "title": "全新一代问界M9",  ← 纯文本
      "url": "https://..."
    }
  ]
}
```

---

### 方法 3：数据库查询

```bash
sqlite3 .data/db.sqlite "SELECT data FROM cache WHERE id = 'baidunews-focus'" | jq '.[0].title'
```

---

## 技术细节

### cheerio.text() 的工作原理

1. **解析 HTML**：将字符串解析为 DOM 结构
2. **提取文本**：递归遍历所有文本节点
3. **合并内容**：将所有文本节点拼接
4. **去除空白**：`trim()` 移除首尾空白

### 性能影响

| 方法 | 性能 | 准确性 |
|------|------|--------|
| 正则表达式 | ⚡ 快 | ⚠️ 中等 |
| cheerio.text() | 🐢 稍慢 | ✅ 高 |

**结论**：cheerio 稍慢但准确性更高，对于新闻抓取（非实时）场景完全可接受。

---

## 总结

✅ **修改内容**：使用 `cheerio.text()` 替代正则表达式  
✅ **影响范围**：百度资讯标题清理  
✅ **优势**：更健壮、更可靠、处理 HTML 实体  
✅ **性能影响**：轻微（可接受）
