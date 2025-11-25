import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface SalesRecord {
  date: string
  advertiser: string
  team: string
  description: string
  grossAmount: number  // 총 매출 (E열)
  netAmount: number    // 순매출 (H열)
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
  totalGrossSales: number  // 총 매출 (E열 합계)
  totalNetSales: number    // 순매출 (H열 합계)
  totalPurchase: number    // 매입 (D열 합계)
  profit: number           // 순이익 (순매출 - 매입)
  salesDetails: {
    advertiser: string
    grossAmount: number
    netAmount: number
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

    // YYYY.MM.DD 형식 (공백 없음)
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(dateStr)) {
      return new Date(dateStr.replace(/\./g, '-') + 'T00:00:00')
    }

    // YYYY. M. D 또는 YYYY. MM. DD 형식 (공백 포함, 구글시트 날짜 형식)
    const dotSpaceMatch = dateStr.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/)
    if (dotSpaceMatch) {
      const year = dotSpaceMatch[1]
      const month = dotSpaceMatch[2].padStart(2, '0')
      const day = dotSpaceMatch[3].padStart(2, '0')
      return new Date(`${year}-${month}-${day}T00:00:00`)
    }

    // 한글 형식: "11월 03일" 또는 "11월 3일" (현재 연도 사용)
    const koreanMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/)
    if (koreanMatch) {
      const currentYear = new Date().getFullYear()
      const month = koreanMatch[1].padStart(2, '0')
      const day = koreanMatch[2].padStart(2, '0')
      return new Date(`${currentYear}-${month}-${day}T00:00:00`)
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

    // 매출 데이터 가져오기 (위플경리회계 시트의 '매출' 탭)
    // 컬럼: 날짜(A/0), 신규/연장/소개(B/1), 구분(C/2), 업체명(D/3), 금액(E/4),
    //       부가세(F/5), 카드수수료(G/6), 순매출(H/7), 결제방법(I/8), 담당자명(J/9)
    const salesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '매출!A:K', // A부터 K까지
    })

    // 매입 데이터 가져오기 (위플경리회계 시트의 '매입' 탭)
    // 컬럼: 날짜(A/0), 구분/계정과목(B/1), 내역(C/2), 금액(D/3),
    //       결제방법(E/4), 사용처/부서/담당자(F/5), 비고(G/6)
    const purchaseResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '매입!A:G', // A부터 G까지
    })

    const salesRows = salesResponse.data.values || []
    const purchaseRows = purchaseResponse.data.values || []

    // 매출 데이터 파싱 (첫 행은 헤더)
    // 위플경리회계 매출탭: 날짜(0), 신규/연장/소개(1), 구분(2), 업체명(3), 금액(4),
    //                    부가세(5), 카드수수료(6), 순매출(7), 결제방법(8), 담당자명(9)
    const salesRecords: SalesRecord[] = []
    for (let i = 1; i < salesRows.length; i++) {
      const row = salesRows[i]
      const date = parseDate(row[0]) // 날짜 (A열)
      if (!date || date < startDate || date > endDate) continue

      const grossAmount = parseFloat(row[4]?.replace(/[^0-9.-]/g, '') || '0') // 총 매출 (E열)
      const netAmount = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0') // 순매출 (H열)
      if ((isNaN(grossAmount) || grossAmount === 0) && (isNaN(netAmount) || netAmount === 0)) continue

      salesRecords.push({
        date: formatDate(date),
        advertiser: row[3] || '', // 업체명 (D열)
        team: row[9] || '', // 담당자명 (J열)
        description: `${row[2] || ''} (${row[1] || ''})`, // 구분 + 신규/연장/소개
        grossAmount: grossAmount || 0,
        netAmount: netAmount || 0,
      })
    }

    // 매입 데이터 파싱 (첫 행은 헤더)
    // 위플경리회계 매입탭: 날짜(0), 구분/계정과목(1), 내역(2), 금액(3),
    //                    결제방법(4), 사용처/부서/담당자(5), 비고(6)
    const purchaseRecords: PurchaseRecord[] = []

    for (let i = 1; i < purchaseRows.length; i++) {
      const row = purchaseRows[i]
      const date = parseDate(row[0]) // 날짜 (A열)
      if (!date || date < startDate || date > endDate) continue

      const amount = parseFloat(row[3]?.replace(/[^0-9.-]/g, '') || '0') // 금액 (D열)
      if (isNaN(amount) || amount === 0) continue

      purchaseRecords.push({
        date: formatDate(date),
        advertiser: row[2] || '', // 내역 (C열)
        team: row[5] || '', // 사용처/부서/담당자(F열)
        description: row[1] || '', // 구분/계정과목 (B열)
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
        totalGrossSales: 0,
        totalNetSales: 0,
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
        summary.totalGrossSales += record.grossAmount
        summary.totalNetSales += record.netAmount
        summary.salesDetails.push({
          advertiser: record.advertiser,
          grossAmount: record.grossAmount,
          netAmount: record.netAmount,
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

    // 순이익 계산 (순매출 - 매입) 및 데이터가 있는 날짜만 필터링
    const summaries = Array.from(summaryMap.values())
      .map((summary) => ({
        ...summary,
        profit: summary.totalNetSales - summary.totalPurchase,
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
