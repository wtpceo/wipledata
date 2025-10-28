import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 문자열 유사도 계산 (Levenshtein Distance)
function calculateSimilarity(str1: string, str2: string): number {
  // 정규화: 공백 제거, 소문자 변환
  const s1 = str1.toLowerCase().replace(/\s+/g, '')
  const s2 = str2.toLowerCase().replace(/\s+/g, '')

  const len1 = s1.length
  const len2 = s2.length

  // 동일하면 100%
  if (s1 === s2) return 100

  // 한쪽이 비어있으면 0%
  if (len1 === 0 || len2 === 0) return 0

  // Levenshtein Distance 계산
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  const distance = matrix[len1][len2]
  const maxLen = Math.max(len1, len2)
  const similarity = ((maxLen - distance) / maxLen) * 100

  return Math.round(similarity)
}

// 담당자 이름 추출
function extractAEName(aeString: string): string[] {
  if (!aeString) return []

  const aes = aeString.split(',').map(ae => ae.trim())

  return aes.map(ae => {
    const match = ae.match(/^([^(]+)/)
    return match ? match[1].trim() : ae
  })
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')

    if (!query || query.length < 2) {
      return NextResponse.json({ clients: [] })
    }

    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // Clients 탭 데이터 가져오기
    // A: 상태, B: 업체명, C: 계약금액, D: 시작일, E: 종료일, F: 담당자
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Clients!A:F',
    })

    const rows = response.data.values || []
    if (rows.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    // 첫 행은 헤더
    const [headers, ...dataRows] = rows

    // 광고주 검색 및 유사도 계산
    const clients = dataRows
      .map((row, idx) => {
        const status = row[0] || ''
        const clientName = row[1] || ''
        const amount = row[2] || ''
        const startDate = row[3] || ''
        const endDate = row[4] || ''
        const aeString = row[5] || ''

        if (!clientName) return null

        // 유사도 계산
        const similarity = calculateSimilarity(query, clientName)

        // 유사도 60% 이상만 반환
        if (similarity < 60) return null

        const aeNames = extractAEName(aeString)

        return {
          rowIndex: idx + 2,
          clientName,
          status,
          amount,
          startDate,
          endDate,
          aeNames,
          similarity
        }
      })
      .filter(client => client !== null)
      .sort((a, b) => b!.similarity - a!.similarity) // 유사도 높은 순
      .slice(0, 10) // 상위 10개만

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error searching clients:', error)
    return NextResponse.json(
      { error: 'Failed to search clients' },
      { status: 500 }
    )
  }
}
