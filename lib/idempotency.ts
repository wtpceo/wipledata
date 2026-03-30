import { readFromSheet, writeToSheet } from './google-sheets'

/**
 * Idempotency 검증: key가 이미 존재하면 true(중복), 없으면 기록 후 false(최초)
 */
export async function checkIdempotency(key: string, source: string): Promise<boolean> {
  if (!key) return false // key 없으면 검증 건너뜀 (하위호환)

  const data = await readFromSheet('IdempotencyLog!A:A')
  const exists = data.some(row => row[0] === key)

  if (exists) return true

  await writeToSheet('IdempotencyLog!A:C', [[key, source, new Date().toISOString()]])
  return false
}
