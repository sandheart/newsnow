import { getPersistentTable } from "#/database/persistent"

export default defineEventHandler(async (event) => {
  const storage = await getPersistentTable()
  if (!storage) {
    throw createError({ statusCode: 503, message: "Persistent storage is not enabled" })
  }

  const query = getQuery(event)
  return await storage.querySources({
    sourceId: query.source_id as string | undefined,
    sourceName: query.source_name as string | undefined,
    title: query.title as string | undefined,
    type: query.type as string | undefined,
    column: query.column as string | undefined,
  })
})
