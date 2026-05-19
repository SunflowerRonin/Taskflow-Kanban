import { api } from './api'

export async function importFromBitrix(): Promise<{ imported: number; skipped: number }> {
  return api.post('/bitrix/import', {})
}

export async function exportToBitrix(taskId: string): Promise<{ bitrixId: string }> {
  return api.post(`/bitrix/export/${taskId}`, {})
}
