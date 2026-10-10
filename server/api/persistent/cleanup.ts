import { getPersistentTable } from "#/database/persistent"

export default defineEventHandler(async (event) => {
  const storage = await getPersistentTable()
  if (!storage) {
    throw createError({ statusCode: 503, message: "Persistent storage is not enabled" })
  }

  const query = getQuery(event)
  const before = Number(query.before)
  if (!before || Number.isNaN(before)) {
    throw createError({ statusCode: 400, message: "Missing or invalid 'before' parameter (timestamp in ms)" })
  }

  return await storage.cleanup(before)
})
