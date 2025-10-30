import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 담당자 이름 정규화 (이름만 추출)
function extractAEName(aeString: string): string[] {
  if (!aeString) return []

  // 쉼표로 구분된 여러 담당자 처리
  const aes = aeString.split(',').map(ae => ae.trim())

  return aes.map(ae => {
    // "김민우 팀장 (email@email.com)" -> "김민우 팀장"
    let name = ae.match(/^([^(]+)/)?.[1]?.trim() || ae

    // "김민우 팀장" -> "김민우" (첫 단어만 추출)
    // 단, 두 글자 성+이름인 경우 고려 (예: 이수빈, 최호천)
    const firstWord = name.split(/\s+/)[0]
    return firstWord
  })
}

// 날짜 파싱
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('.')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }

    return new Date(dateStr)
  } catch {
    return null
  }
}

export async function GET() {
  try {
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
      return NextResponse.json({ pendingClients: [] })
    }

    // 첫 행은 헤더
    const [headers, ...dataRows] = rows

    const now = new Date()
    const pendingClients: any[] = []

    console.log('=== All Pending Clients Query ===')
    console.log('Today:', now.toISOString().split('T')[0])

    dataRows.forEach((row, idx) => {
      const status = row[0] || ''
      const clientName = row[1] || ''
      const amount = parseInt(row[2]?.replace(/[^0-9]/g, '') || '0')
      const endDateStr = row[4] || ''
      const aeString = row[5] || ''

      // 진행 중이고 종료일이 지난 광고주만
      if (status !== '진행' || !endDateStr || !clientName) return

      const endDate = parseDate(endDateStr)
      if (!endDate) return

      // 종료일이 오늘보다 과거인 경우만 (미처리 건)
      if (endDate < now) {
        const aeNames = extractAEName(aeString)
        const isDuplicate = aeNames.length > 1

        // 각 담당자별로 광고주 추가
        aeNames.forEach(aeName => {
          const client = {
            rowIndex: idx + 2,
            clientName,
            amount,
            endDate: endDateStr,
            aeName,
            isDuplicate,
            duplicateWith: isDuplicate ? aeNames.filter(n => n !== aeName) : [],
            status: 'pending',
            daysOverdue: Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
          }

          pendingClients.push(client)
        })
      }
    })

    // AE별로 정렬
    pendingClients.sort((a, b) => {
      if (a.aeName !== b.aeName) {
        return a.aeName.localeCompare(b.aeName)
      }
      // 같은 AE 내에서는 종료일이 오래된 순
      return parseDate(a.endDate)!.getTime() - parseDate(b.endDate)!.getTime()
    })

    console.log(`Found ${pendingClients.length} pending clients`)

    return NextResponse.json({
      pendingClients,
      summary: {
        totalPending: pendingClients.length,
        uniqueClients: new Set(pendingClients.map(c => c.clientName)).size,
        affectedAEs: new Set(pendingClients.map(c => c.aeName)).size
      }
    })
  } catch (error) {
    console.error('Error fetching all pending clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending clients' },
      { status: 500 }
    )
  }
}
