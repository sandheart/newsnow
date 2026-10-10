import * as cheerio from "cheerio"
import { $fetch } from "ofetch"
import type { NewsItem } from "@shared/types"
import { sources } from "@shared/sources"
import type { SourceGetter } from "#/types"

// 百度资讯搜索 URL 模板
const BASE_URL = "https://www.baidu.com/s"

// s-data JSON 结构
interface BaiduNewsData {
  title: string // 标题（可能包含 <em> 高亮）
  titleUrl: string // 原文链接
  summary: string // 摘要
  dispTime: string // 相对时间（"4小时前"、"8天前"）
  sourceName: string // 来源（"新京报网"）
  hasImg: boolean // 是否有缩略图
  leftImgSrc?: string // 缩略图 URL
}

// 带完整浏览器请求头的 fetch（绕过百度反爬）
const baiduFetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": "https://www.baidu.com/",
    "Sec-Ch-Ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"Windows\"",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  },
  timeout: 15000,
  retry: 3,
})

// 通用抓取函数
async function fetchBaiduNews(keyword: string, rtt: number): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    tn: "news",
    rtt: String(rtt),
    bsst: "1",
    cl: "2",
    medium: "1",
    ie: "utf-8",
    wd: keyword,
  })

  const url = `${BASE_URL}?${params.toString()}`

  // 使用带完整请求头的 baiduFetch 获取 HTML
  const html = await baiduFetch(url, { responseType: "text" })

  // 检查是否被重定向到验证码页面
  if (typeof html === "string" && html.includes("wappass.baidu.com")) {
    throw new Error("百度资讯触发反爬验证码，请稍后重试")
  }

  // 使用 cheerio 解析
  const $ = cheerio.load(html as string)
  const news: NewsItem[] = []

  // 核心：查找所有包含 s-data 的新闻条目
  const elements = $(".result-op.c-container[srcid=\"200\"]").toArray()
  for (const el of elements) {
    const $el = $(el)

    // 提取 <!--s-data:{...}--> JSON
    const htmlContent = $el.html()
    const jsonMatch = htmlContent?.match(/<!--s-data:(\{.*?\})-->/s)

    if (!jsonMatch) continue

    try {
      const data: BaiduNewsData = JSON.parse(jsonMatch[1])

      // 使用 cheerio 提取纯文本标题（移除 HTML 标签和实体）
      const cleanTitle = cheerio.load(data.title).text().trim()

      if (cleanTitle && data.titleUrl) {
        news.push({
          id: await md5(data.titleUrl), // 使用 URL 的 MD5 作为 ID
          title: cleanTitle,
          url: data.titleUrl,
          extra: {
            info: data.sourceName, // 显示来源（"新京报网"）
            hover: data.summary, // 悬停显示摘要
            date: data.dispTime, // 显示相对时间（"4小时前"）
            icon: data.hasImg && data.leftImgSrc
              ? { url: data.leftImgSrc, scale: 1.2 }
              : false,
          },
        })
      }
    } catch (e) {
      // JSON 解析失败，跳过此条目
      logger.warn("百度资讯 JSON 解析失败:", e)
    }
  }

  return news
}

// 动态生成 getter：遍历 sources 中所有 baidunews-* 子源
// 根据 SourceID 中的 "focus"/"latest" 推断 rtt 参数
const baidunewsGetters: Record<string, SourceGetter> = {}

for (const [id, source] of Object.entries(sources)) {
  // 只处理 baidunews- 开头且有 keyword 的子源
  if (id.startsWith("baidunews-") && source.keyword) {
    const keyword = source.keyword
    // 从 SourceID 推断排序方式：focus=1（焦点），latest=4（最新）
    const rtt = id.includes("latest") ? 4 : 1

    baidunewsGetters[id] = defineSource(async () => {
      return await fetchBaiduNews(keyword, rtt)
    })
  }
}

// 导出动态生成的 getter 对象
export default defineSource(baidunewsGetters)
