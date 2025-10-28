import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

interface SalesRecord {
  date: string
  advertiser: string
  team: string
  description: string
  amount: number
}

interface PurchaseRecord {
  date: string
  advertiser: string
  team: string
  description: string
  amount: number
}

interface DailySummary {
  date: string
  totalSales: number
  totalPurchase: number
  profit: number
  salesDetails: {
    advertiser: string
    amount: number
    team: string
    description: string
  }[]
  purchaseDetails: {
    advertiser: string
    amount: number
    team: string
    description: string
  }[]
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  // 다양한 날짜 형식 처리
  try {
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00')
    }

    // MM/DD/YYYY 또는 M/D/YYYY 형식
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`)
    }

    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
      return new Date(dateStr.replace(/\./g, '-') + 'T00:00:00')
    }

    return new Date(dateStr)
  } catch {
    return null
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: '시작일과 종료일을 입력해주세요.' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateStr + 'T00:00:00')
    const endDate = new Date(endDateStr + 'T23:59:59')

    const sheets = await getGoogleSheetsClient()

    // 매출 데이터 가져오기 (원본데이터 탭)
    // 컬럼: 타임스탬프(0), 부서(1), 입력자(2), 매출유형(3), 광고주업체명(4),
    //       마케팅매체상품명(5), 계약개월수(6), 총계약금액(7), ...계약날짜(14)
    const salesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '원본데이터!A:S', // A부터 S까지 (타임스탬프~순수익)
    })

    // 매입 데이터 가져오기 (매입현황 탭)
    // 컬럼: 타임스탬프(0), 부서(1), 입력자(2), 요청자(3), 매입유형(4),
    //       거래처명(5), 품목/서비스명(6), 총금액(7), ...거래날짜(10)
    const purchaseResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '매입현황!A:N', // A부터 N까지 (타임스탬프~분기)
    })

    const salesRows = salesResponse.data.values || []
    const purchaseRows = purchaseResponse.data.values || []

    // 매출 데이터 파싱 (첫 행은 헤더)
    // 원본데이터: 계약날짜(14), 광고주업체명(4), 부서(1), 마케팅매체상품명(5), 총계약금액(7)
    const salesRecords: SalesRecord[] = []
    for (let i = 1; i < salesRows.length; i++) {
      const row = salesRows[i]
      const date = parseDate(row[14]) // 계약날짜
      if (!date || date < startDate || date > endDate) continue

      const amount = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0') // 총계약금액
      if (isNaN(amount) || amount === 0) continue

      salesRecords.push({
        date: formatDate(date),
        advertiser: row[4] || '', // 광고주업체명
        team: row[1] || '', // 부서
        description: row[5] || '', // 마케팅매체상품명
        amount: amount,
      })
    }

    // 매입 데이터 파싱 (첫 행은 헤더)
    // 매입현황: 거래날짜(10), 거래처명(5), 부서(1), 품목/서비스명(6), 총금액(7)
    const purchaseRecords: PurchaseRecord[] = []
    for (let i = 1; i < purchaseRows.length; i++) {
      const row = purchaseRows[i]
      const date = parseDate(row[10]) // 거래날짜
      if (!date || date < startDate || date > endDate) continue

      const amount = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0') // 총금액
      if (isNaN(amount) || amount === 0) continue

      purchaseRecords.push({
        date: formatDate(date),
        advertiser: row[5] || '', // 거래처명
        team: row[1] || '', // 부서
        description: row[6] || '', // 품목/서비스명
        amount: amount,
      })
    }

    // 날짜별로 그룹화
    const summaryMap = new Map<string, DailySummary>()

    // 모든 날짜 초기화
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = formatDate(currentDate)
      summaryMap.set(dateKey, {
        date: dateKey,
        totalSales: 0,
        totalPurchase: 0,
        profit: 0,
        salesDetails: [],
        purchaseDetails: [],
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 매출 데이터 추가
    salesRecords.forEach((record) => {
      const summary = summaryMap.get(record.date)
      if (summary) {
        summary.totalSales += record.amount
        summary.salesDetails.push({
          advertiser: record.advertiser,
          amount: record.amount,
          team: record.team,
          description: record.description,
        })
      }
    })

    // 매입 데이터 추가
    purchaseRecords.forEach((record) => {
      const summary = summaryMap.get(record.date)
      if (summary) {
        summary.totalPurchase += record.amount
        summary.purchaseDetails.push({
          advertiser: record.advertiser,
          amount: record.amount,
          team: record.team,
          description: record.description,
        })
      }
    })

    // 수익 계산 및 데이터가 있는 날짜만 필터링
    const summaries = Array.from(summaryMap.values())
      .map((summary) => ({
        ...summary,
        profit: summary.totalSales - summary.totalPurchase,
      }))
      .filter(
        (summary) =>
          summary.salesDetails.length > 0 || summary.purchaseDetails.length > 0
      )
      .sort((a, b) => b.date.localeCompare(a.date)) // 최신 날짜부터

    return NextResponse.json({ summaries })
  } catch (error) {
    console.error('Error fetching daily summary:', error)
    return NextResponse.json(
      { error: '일자별 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
