/**
 * Normalize staff names by removing job titles/positions
 * This ensures consistent name matching across different data sources
 *
 * Examples:
 * - "이수빈 책임매니저" → "이수빈"
 * - "김민우 팀장" → "김민우"
 * - "정우진 매니저" → "정우진"
 * - "이수빈" → "이수빈" (no change)
 */
export function normalizeStaffName(name: string): string {
  if (!name) return ''

  // List of common job titles/positions in Korean companies
  const jobTitles = [
    '대표이사',
    '부사장',
    '이사',
    '팀장',
    '책임매니저',
    '책임',
    '매니저',
    '과장',
    '대리',
    '사원',
    '주임',
    '부장',
    '차장',
    '실장',
    '본부장',
    '부문장',
    '센터장'
  ]

  let normalized = name.trim()

  // Remove job title if found at the end of the name
  for (const title of jobTitles) {
    if (normalized.endsWith(title)) {
      normalized = normalized.slice(0, -title.length).trim()
      break // Only remove one title
    }
  }

  return normalized
}

/**
 * Extract name from formats like "이수빈 (email@example.com)"
 * and also normalize by removing job titles
 */
export function extractAndNormalizeName(nameString: string): string {
  if (!nameString) return ''

  // First extract name before any parentheses (email)
  const match = nameString.match(/^([^(]+)/)
  const extractedName = match ? match[1].trim() : nameString.trim()

  // Then normalize by removing job titles
  return normalizeStaffName(extractedName)
}
