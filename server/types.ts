import type { NewsItem, SourceID } from "@shared/types"

export interface RSSInfo {
  title: string
  description: string
  link: string
  image: string
  updatedTime: string
  items: RSSItem[]
}
export interface RSSItem {
  title: string
  description: string
  link: string
  created?: string
}

export interface CacheInfo {
  id: SourceID
  items: NewsItem[]
  updated: number
}

export interface CacheRow {
  id: SourceID
  data: string
  updated: number
}

export interface RSSHubInfo {
  title: string
  home_page_url: string
  description: string
  items: RSSHubItem[]
}

export interface RSSHubItem {
  id: string
  url: string
  title: string
  content_html: string
  date_published: string
}

export interface UserInfo {
  id: string
  email: string
  type: "github"
  data: string
  created: number
  updated: number
}

export interface RSSHubOption {
  // default: true
  sorted?: boolean
  // default: 20
  limit?: number
}

export interface SourceOption {
  // default: false
  hiddenDate?: boolean
}

export interface PersistentRow {
  source_id: string
  item_id: string
  title: string
  url: string
  extra: string
  fetched_at: number
}

export interface SourceRecord {
  source_id: string
  source_name: string
  title: string | null
  type: string | null
  column: string | null
  interval: number | null
  home: string | null
  desc: string | null
  created_at: number
  last_fetched_at: number
}

export type SourceGetter = () => Promise<NewsItem[]>
