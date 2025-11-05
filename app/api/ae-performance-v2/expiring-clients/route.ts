import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

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

// 이번 달인지 확인
function isExpiringThisMonth(endDate: Date): boolean {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  return endDate.getMonth() === thisMonth && endDate.getFullYear() === thisYear
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') // YYYY-MM 형식

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
      return NextResponse.json({ expiringClients: [], aeStats: [] })
    }

    // 첫 행은 헤더
    const [headers, ...dataRows] = rows

    // 원본데이터에서 모든 매출 실적 읽기 (모든 매출 유형 포함)
    const rawData = await readFromSheet('원본데이터!A2:T')
    const allSales = rawData.map(row => {
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0 // H열: 총계약금액
      const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0 // K열: 확정 외주비
      const department = row[1] || '' // B열: 부서

      // 영업부는 총계약금액 - 외주비, 나머지는 총계약금액
      const actualAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount

      return {
        timestamp: row[0] || '', // A열: 타임스탬프
        department: department,
        aeName: normalizeStaffName(row[2] || ''), // C열: 담당자
        salesType: row[3] || '', // D열: 매출 유형 (모든 유형 포함)
        clientName: row[4] || '', // E열: 광고주명
        totalAmount: actualAmount,
        inputYearMonth: row[18] || '', // S열: 입력년월 (영업부 필터링용)
      }
    })

    // 타겟 월 설정 (파라미터가 없으면 현재 월)
    let targetMonth: number
    let targetYear: number

    if (month) {
      const [year, monthNum] = month.split('-')
      targetYear = parseInt(year)
      targetMonth = parseInt(monthNum) - 1 // 0-based
    } else {
      const now = new Date()
      targetMonth = now.getMonth()
      targetYear = now.getFullYear()
    }

    console.log('=== Expiring Clients Query ===')
    console.log('Target Month:', `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`)
    console.log('Total Clients Rows:', dataRows.length)

    // 먼저 각 AE의 전체 광고주 수 계산 (진행 중인 모든 광고주)
    const aeTotalClientsMap = new Map<string, Set<string>>()

    console.log('\n=== Total Clients Calculation ===')
    dataRows.forEach((row, idx) => {
      const status = row[0] || ''
      const clientName = row[1] || ''
      const aeString = row[5] || ''

      // 진행 중인 광고주만
      if (status !== '진행' || !clientName) return

      const aeNames = extractAEName(aeString)

      // 처음 5개 행만 샘플 로그
      if (idx < 5) {
        console.log(`Row ${idx + 2}: ${clientName}`)
        console.log(`  Raw AE String: "${aeString}"`)
        console.log(`  Parsed AE Names:`, aeNames)
      }

      aeNames.forEach(aeName => {
        if (!aeTotalClientsMap.has(aeName)) {
          aeTotalClientsMap.set(aeName, new Set())
        }
        aeTotalClientsMap.get(aeName)!.add(clientName)
      })
    })

    console.log('\n=== Total Clients by AE ===')
    aeTotalClientsMap.forEach((clients, aeName) => {
      console.log(`${aeName}: ${clients.size}개`)
    })

    // 종료 예정 광고주 필터링
    const expiringClients: any[] = []
    const aeClientsMap = new Map<string, any[]>()

    console.log('\n=== Expiring Clients Filtering ===')
    let sampleCount = 0
    dataRows.forEach((row, idx) => {
      const status = row[0] || ''
      const clientName = row[1] || ''
      const amount = parseInt(row[2]?.replace(/[^0-9]/g, '') || '0')
      const endDateStr = row[4] || ''
      const aeString = row[5] || ''

      // 종료일이 있는 경우만 (상태는 체크하지 않음 - 해당 월에 종료된 모든 광고주 포함)
      if (!endDateStr || !clientName) return

      const endDate = parseDate(endDateStr)

      // 처음 5개 날짜 샘플만 상세 로그
      if (sampleCount < 5) {
        console.log(`\nRow ${idx + 2}: ${clientName}`)
        console.log(`  Raw End Date: "${endDateStr}"`)
        console.log(`  Parsed Date:`, endDate)
        if (endDate) {
          console.log(`  Year: ${endDate.getFullYear()}, Month: ${endDate.getMonth() + 1}`)
          console.log(`  Target: ${targetYear}-${targetMonth + 1}`)
          console.log(`  Match: ${endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear}`)
        }
        sampleCount++
      }

      if (!endDate) {
        console.log(`  [Skip] Invalid date: ${endDateStr}`)
        return
      }

      // 해당 월에 종료되는지 확인
      if (endDate.getMonth() !== targetMonth || endDate.getFullYear() !== targetYear) {
        return
      }

      console.log(`  [Match] ${clientName} - ${endDateStr} - ${aeString}`)

      // 담당자 추출
      const aeNames = extractAEName(aeString)
      const isDuplicate = aeNames.length > 1

      // 각 담당자별로 광고주 추가
      aeNames.forEach(aeName => {
        // Google Sheets 상태에 따라 status 결정
        let clientStatus = 'pending'
        if (status === '대기') {
          clientStatus = 'waiting'
        }

        const client = {
          rowIndex: idx + 2, // 실제 시트 행 번호 (헤더 제외)
          clientName,
          amount,
          endDate: endDateStr,
          aeName,
          isDuplicate,
          duplicateWith: isDuplicate ? aeNames.filter(n => n !== aeName) : [],
          status: clientStatus, // pending, renewed, failed, waiting
          renewalMonths: 0,
          renewalAmount: 0,
          failureReason: ''
        }

        expiringClients.push(client)

        // AE별 통계를 위한 맵
        if (!aeClientsMap.has(aeName)) {
          aeClientsMap.set(aeName, [])
        }
        aeClientsMap.get(aeName)!.push(client)
      })
    })

    // 해당 월의 매출 건수 계산 (영업부는 S열, 내근직은 A열 타임스탬프 사용)
    const monthlySales = allSales.filter(sale => {
      try {
        // 영업부는 S열(inputYearMonth) 사용
        if (sale.department === '영업부') {
          if (!sale.inputYearMonth) return false

          const inputMonth = sale.inputYearMonth
          let saleMonth: string | null = null

          // 입력년월 형식 파싱 (YYYY-MM, YYYY.MM, MM 등)
          if (inputMonth.includes('-')) {
            saleMonth = inputMonth // 이미 YYYY-MM 형식
          } else if (inputMonth.includes('.')) {
            saleMonth = inputMonth.replace('.', '-') // YYYY.MM → YYYY-MM
          } else if (inputMonth.length <= 2) {
            // MM 형식인 경우 현재 연도 사용
            const currentYear = new Date().getFullYear()
            saleMonth = `${currentYear}-${inputMonth.padStart(2, '0')}`
          } else if (inputMonth.length === 6) {
            // YYYYMM 형식
            const year = inputMonth.substring(0, 4)
            const mon = inputMonth.substring(4, 6)
            saleMonth = `${year}-${mon}`
          }

          if (!saleMonth) return false

          return saleMonth === `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
        }
        // 내근직은 A열(timestamp) 사용
        else {
          if (!sale.timestamp) return false

          let saleDate: Date | null = null

          // ISO 형식 (2024-11-03T12:34:56.789Z)
          if (sale.timestamp.includes('T')) {
            saleDate = new Date(sale.timestamp)
          }
          // MM/DD/YYYY 형식
          else if (sale.timestamp.includes('/')) {
            const parts = sale.timestamp.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
            }
          }
          // YYYY.MM.DD 형식
          else if (sale.timestamp.includes('.')) {
            saleDate = new Date(sale.timestamp.replace(/\./g, '-'))
          }
          // YYYY-MM-DD 형식
          else if (sale.timestamp.includes('-')) {
            saleDate = new Date(sale.timestamp)
          }

          if (!saleDate || isNaN(saleDate.getTime())) return false

          return saleDate.getMonth() === targetMonth && saleDate.getFullYear() === targetYear
        }
      } catch {
        return false
      }
    })

    // AE별 매출 건수 맵 생성 (모든 유형 포함)
    const aeSalesMap = new Map<string, { count: number; amount: number }>()
    monthlySales.forEach(sale => {
      if (!aeSalesMap.has(sale.aeName)) {
        aeSalesMap.set(sale.aeName, { count: 0, amount: 0 })
      }
      const stats = aeSalesMap.get(sale.aeName)!
      stats.count += 1
      stats.amount += sale.totalAmount
    })

    console.log('=== Sales Stats Debug ===')
    console.log('Target month:', `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`)
    console.log('Total sales in raw data:', allSales.length)
    console.log('Sales in target month:', monthlySales.length)
    console.log('AEs with sales:', Array.from(aeSalesMap.keys()))

    // AE별 통계 계산 - 모든 AE 포함 (종료 예정이 0개인 AE도 포함)
    const aeStats = Array.from(aeTotalClientsMap.keys()).map((aeName) => {
      const clients = aeClientsMap.get(aeName) || []
      const expiringCount = clients.length
      const failedClients = clients.filter(c => c.status === 'failed').length
      const pendingClients = clients.filter(c => c.status === 'pending').length || clients.filter(c => c.status === 'waiting').length

      // 원본데이터 기반 매출 건수 및 총액 (모든 유형 포함)
      const salesStats = aeSalesMap.get(aeName) || { count: 0, amount: 0 }
      const salesCount = salesStats.count
      const totalSalesAmount = salesStats.amount

      // 전체 광고주 수 (진행 중인 모든 광고주)
      const totalClients = aeTotalClientsMap.get(aeName)?.size || 0

      return {
        aeName,
        totalClients, // 전체 광고주 수
        expiringClients: expiringCount, // 종료 예정 광고주 수
        renewedClients: salesCount, // 원본데이터 기반 계약 건수 (모든 유형)
        failedClients,
        pendingClients,
        totalRenewalAmount: totalSalesAmount, // 총 매출액 (모든 유형)
        renewalRate: expiringCount > 0 ? Math.round((salesCount / expiringCount) * 100) : 0
      }
    }).sort((a, b) => b.expiringClients - a.expiringClients)

    return NextResponse.json({
      expiringClients: expiringClients.sort((a, b) => a.aeName.localeCompare(b.aeName)),
      aeStats,
      summary: {
        totalExpiringClients: expiringClients.length,
        uniqueClients: dataRows.filter(row => {
          const status = row[0]
          const endDateStr = row[4]
          if (status !== '진행' || !endDateStr) return false
          const endDate = parseDate(endDateStr)
          if (!endDate) return false
          return endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear
        }).length,
        totalAEs: aeClientsMap.size,
        targetMonth: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
      }
    })
  } catch (error) {
    console.error('Error fetching expiring clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expiring clients' },
      { status: 500 }
    )
  }
}
