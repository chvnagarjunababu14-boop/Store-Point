import { getDb } from '@/lib/db'
import type { AppSettingEntity } from '@/types/database'

export const settingsRepository = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const db = await getDb()
    const record = await db.get('settings', key)
    if (!record) return defaultValue
    return record.value as T
  },

  async set<T>(key: string, value: T): Promise<void> {
    const db = await getDb()
    const entity: AppSettingEntity = {
      key,
      value,
      updatedAt: new Date().toISOString(),
    }
    await db.put('settings', entity)
  },

  async delete(key: string): Promise<void> {
    const db = await getDb()
    await db.delete('settings', key)
  },
}
