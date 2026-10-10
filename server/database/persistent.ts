import process from "node:process"
import type { NewsItem, SourceID } from "@shared/types"
import type { Database } from "db0"

export class PersistentStorage {
  private db
  constructor(db: Database) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS news_history (
        source_id TEXT,
        item_id TEXT,
        title TEXT,
        url TEXT,
        extra TEXT,
        fetched_at INTEGER,
        PRIMARY KEY (source_id, item_id)
      );
    `).run()

    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS news_sources (
        source_id TEXT PRIMARY KEY,
        source_name TEXT,
        title TEXT,
        type TEXT,
        "column" TEXT,
        "interval" INTEGER,
        home TEXT,
        "desc" TEXT,
        created_at INTEGER,
        last_fetched_at INTEGER
      );
    `).run()

    logger.success(`init persistent storage tables`)
  }

  async saveBatch(sourceId: SourceID, items: NewsItem[]) {
    const now = Date.now()

    // 写入新闻条目（增量，去重）
    for (const item of items) {
      await this.db.prepare(
        `INSERT OR IGNORE INTO news_history (source_id, item_id, title, url, extra, fetched_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        sourceId,
        String(item.id),
        item.title,
        item.url,
        JSON.stringify(item.extra ?? {}),
        now,
      )
    }

    // 更新数据源表
    const info = this.getSourceInfo(sourceId)

    // 添加新数据源（已存在则忽略）
    await this.db.prepare(
      `INSERT OR IGNORE INTO news_sources (source_id, source_name, title, type, "column", "interval", home, "desc", created_at, last_fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(sourceId, info.sourceName, info.title, info.type, info.column, info.interval, info.home, info.desc, now, now)

    // 更新已有数据源
    await this.db.prepare(
      `UPDATE news_sources SET last_fetched_at = ?, source_name = ?, title = ?, type = ?, "column" = ?, "interval" = ?, home = ?, "desc" = ? WHERE source_id = ?`,
    ).run(now, info.sourceName, info.title, info.type, info.column, info.interval, info.home, info.desc, sourceId)

    logger.success(`persistent save: ${sourceId} (${items.length} items)`)
  }

  async queryNews(params: {
    sourceId?: string
    startTime?: number
    endTime?: number
    keyword?: string
    page?: number
    pageSize?: number
  }) {
    const { sourceId, startTime, endTime, keyword, page = 1, pageSize = 20 } = params
    const conditions: string[] = []
    const values: any[] = []

    if (sourceId) {
      conditions.push("source_id = ?")
      values.push(sourceId)
    }
    if (startTime) {
      conditions.push("fetched_at >= ?")
      values.push(startTime)
    }
    if (endTime) {
      conditions.push("fetched_at <= ?")
      values.push(endTime)
    }
    if (keyword) {
      conditions.push("title LIKE ?")
      values.push(`%${keyword}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const countRow = await this.db.prepare(`SELECT COUNT(*) as cnt FROM news_history ${where}`).get(...values) as any
    const total = countRow?.cnt ?? 0

    const offset = (page - 1) * pageSize
    const rows = await this.db.prepare(
      `SELECT * FROM news_history ${where} ORDER BY fetched_at DESC LIMIT ? OFFSET ?`,
    ).all(...values, pageSize, offset) as any

    return {
      items: (rows?.results ?? rows) ?? [],
      total,
      page,
      pageSize,
    }
  }

  async querySources(params: {
    sourceId?: string
    sourceName?: string
    title?: string
    type?: string
    column?: string
  }) {
    const { sourceId, sourceName, title, type, column } = params
    const conditions: string[] = []
    const values: any[] = []

    if (sourceId) {
      conditions.push("source_id LIKE ?")
      values.push(`%${sourceId}%`)
    }
    if (sourceName) {
      conditions.push("source_name LIKE ?")
      values.push(`%${sourceName}%`)
    }
    if (title) {
      conditions.push("title LIKE ?")
      values.push(`%${title}%`)
    }
    if (type) {
      conditions.push("type = ?")
      values.push(type)
    }
    if (column) {
      conditions.push("\"column\" = ?")
      values.push(column)
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
    const rows = await this.db.prepare(
      `SELECT * FROM news_sources ${where} ORDER BY source_id`,
    ).all(...values) as any

    return (rows?.results ?? rows) ?? []
  }

  async cleanup(before: number) {
    const historyResult = await this.db.prepare(
      `DELETE FROM news_history WHERE fetched_at < ?`,
    ).run(before)

    const sourcesResult = await this.db.prepare(
      `DELETE FROM news_sources WHERE last_fetched_at < ?`,
    ).run(before)

    return { historyDeleted: historyResult, sourcesDeleted: sourcesResult }
  }

  private getSourceInfo(sourceId: SourceID) {
    const source = sources[sourceId]
    const name = source?.name ?? sourceId
    const title = source?.title
    return {
      sourceName: title ? `${name}-${title}` : name,
      title: source?.title ?? null,
      type: source?.type ?? null,
      column: source?.column ?? null,
      interval: source?.interval ?? null,
      home: source?.home ?? null,
      desc: source?.desc ?? null,
    }
  }
}

export async function getPersistentTable() {
  try {
    if (process.env.ENABLE_PERSISTENT_STORAGE !== "true") return
    const db = useDatabase()
    const storage = new PersistentStorage(db)
    if (process.env.INIT_TABLE !== "false") await storage.init()
    return storage
  } catch (e) {
    logger.error("failed to init persistent storage", e)
  }
}
