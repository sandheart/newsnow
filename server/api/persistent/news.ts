import { getPersistentTable } from "#/database/persistent"

export default defineEventHandler(async (event) => {
  const storage = await getPersistentTable()
  if (!storage) {
    throw createError({ statusCode: 503, message: "Persistent storage is not enabled" })
  }

  const query = getQuery(event)
  return await storage.queryNews({
    sourceId: query.source_id as string | undefined,
    startTime: query.start_time ? Number(query.start_time) : undefined,
    endTime: query.end_time ? Number(query.end_time) : undefined,
    keyword: query.keyword as string | undefined,
    page: query.page ? Number(query.page) : 1,
    pageSize: query.page_size ? Number(query.page_size) : 20,
  })
})
