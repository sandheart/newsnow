import { $fetch } from "ofetch"
import type { NewsItem } from "@shared/types"
import { sources } from "@shared/sources"
import type { SourceGetter } from "#/types"

// 腾讯资讯搜索 API
const API_URL = "https://i.news.qq.com/gw/pc_search/result"

// API 响应中的新闻条目结构
interface QQNewsItem {
  id: string
  title: string
  url: string
  time: string
  timestamp: number
  source: string
  abstract: string
  commentNum?: number
  readCount?: number
  thumbnails_qqnews?: string[]
  articletype: number
}

// API 响应中的 section 结构
interface QQNewsSection {
  component: string
  secType: number
  newsList?: QQNewsItem[]
}

// 带完整浏览器请求头的 fetch
const qqFetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://news.qq.com",
    "Referer": "https://news.qq.com/",
  },
  timeout: 15000,
  retry: 3,
})

// 通用抓取函数
async function fetchQQNews(keyword: string): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    page: "0",
    query: keyword,
    is_pc: "1",
    hippy_custom_version: "25",
    search_type: "all",
    search_count_limit: "20",
    appver: "15.5_qqnews_7.1.80",
    suid: "",
  })

  const data = await qqFetch<{
    ret: number
    isEmpty: number
    secList?: QQNewsSection[]
  }>(API_URL, {
    method: "POST",
    body: params.toString(),
  })

  if (data.ret !== 0 || data.isEmpty === 1 || !data.secList) {
    return []
  }

  // 从所有 section 中提取 pictext 类型的新闻
  const news: NewsItem[] = []
  for (const sec of data.secList) {
    if (sec.component !== "pictext" || !sec.newsList) continue

    for (const item of sec.newsList) {
      if (item.title && item.url) {
        news.push({
          id: item.id,
          title: item.title,
          url: item.url,
          pubDate: item.timestamp * 1000,
          extra: {
            info: item.source,
            hover: item.abstract,
            date: item.time,
            icon: item.thumbnails_qqnews?.[0]
              ? { url: item.thumbnails_qqnews[0], scale: 1.2 }
              : false,
          },
        })
      }
    }
  }

  return news
}

// 动态生成 getter：遍历 sources 中所有 qqnews-* 子源
const qqnewsGetters: Record<string, SourceGetter> = {}

for (const [id, source] of Object.entries(sources)) {
  if (id.startsWith("qqnews-") && source.keyword) {
    const keyword = source.keyword

    qqnewsGetters[id] = defineSource(async () => {
      return await fetchQQNews(keyword)
    })
  }
}

export default defineSource(qqnewsGetters)
