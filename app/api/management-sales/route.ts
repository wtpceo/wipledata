import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface SalesRecord {
  id: string
  date: string
  type: string           // 신규/연장/소개 (B열)
  category: string       // 구분 (C열)
  clientName: string     // 업체명 (D열)
  grossAmount: number    // 금액 (E열)
  vat: number           // 부가세 (F열)
  cardFee: number       // 카드수수료 (G열)
  netAmount: number     // 순매출 (H열)
  paymentMethod: string // 결제방법 (I열)
  salesPerson: string   // 담당자명 (J열)
  note: string          // 비고 (K열)
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    // 한글 형식: "11월 03일" 또는 "11월 3일" (현재 연도 사용)
    const koreanMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/)
    if (koreanMatch) {
      const currentYear = new Date().getFullYear()
      const month = koreanMatch[1].padStart(2, '0')
      const day = koreanMatch[2].padStart(2, '0')
      return `${currentYear}-${month}-${day}`
    }

    // YYYY. M. D 또는 YYYY. MM. DD 형식 (공백 포함)
    const dotSpaceMatch = dateStr.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/)
    if (dotSpaceMatch) {
      const year = dotSpaceMatch[1]
      const month = dotSpaceMatch[2].padStart(2, '0')
      const day = dotSpaceMatch[3].padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }

    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    const salesPerson = searchParams.get('salesPerson')

    const sheets = await getGoogleSheetsClient()

    // 매출 데이터 가져오기 (위플경리회계 시트의 '매출' 탭)
    // 컬럼: 날짜(A/0), 신규/연장/소개(B/1), 구분(C/2), 업체명(D/3), 금액(E/4),
    //       부가세(F/5), 카드수수료(G/6), 순매출(H/7), 결제방법(I/8), 담당자명(J/9), 비고(K/10)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '매출!A:K',
    })

    const rows = response.data.values || []

    // 첫 행은 헤더
    const salesRecords: SalesRecord[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const date = parseDate(row[0])
      if (!date) continue

      const grossAmount = parseFloat(row[4]?.replace(/[^0-9.-]/g, '') || '0') || 0
      const netAmount = parseFloat(row[7]?.replace(/[^0-9.-]/g, '') || '0') || 0

      // 금액이 둘 다 0이면 건너뛰기
      if (grossAmount === 0 && netAmount === 0) continue

      salesRecords.push({
        id: `sales-${i}`,
        date,
        type: row[1] || '',
        category: row[2] || '',
        clientName: row[3] || '',
        grossAmount,
        vat: parseFloat(row[5]?.replace(/[^0-9.-]/g, '') || '0') || 0,
        cardFee: parseFloat(row[6]?.replace(/[^0-9.-]/g, '') || '0') || 0,
        netAmount,
        paymentMethod: row[8] || '',
        salesPerson: row[9] || '',
        note: row[10] || '',
      })
    }

    // 필터링
    let filteredRecords = salesRecords

    if (startDate) {
      filteredRecords = filteredRecords.filter(record => record.date >= startDate)
    }

    if (endDate) {
      filteredRecords = filteredRecords.filter(record => record.date <= endDate)
    }

    if (category) {
      filteredRecords = filteredRecords.filter(record => record.category === category)
    }

    if (salesPerson) {
      filteredRecords = filteredRecords.filter(record => record.salesPerson === salesPerson)
    }

    // 날짜 내림차순 정렬
    filteredRecords.sort((a, b) => b.date.localeCompare(a.date))

    // 합계 계산
    const totalGrossAmount = filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0)
    const totalNetAmount = filteredRecords.reduce((sum, r) => sum + r.netAmount, 0)
    const totalVat = filteredRecords.reduce((sum, r) => sum + r.vat, 0)
    const totalCardFee = filteredRecords.reduce((sum, r) => sum + r.cardFee, 0)

    // 구분별 집계
    const categoryStats = filteredRecords.reduce((acc, record) => {
      if (!acc[record.category]) {
        acc[record.category] = { count: 0, grossAmount: 0, netAmount: 0 }
      }
      acc[record.category].count++
      acc[record.category].grossAmount += record.grossAmount
      acc[record.category].netAmount += record.netAmount
      return acc
    }, {} as Record<string, { count: number; grossAmount: number; netAmount: number }>)

    // 담당자별 집계
    const salesPersonStats = filteredRecords.reduce((acc, record) => {
      if (!record.salesPerson) return acc
      if (!acc[record.salesPerson]) {
        acc[record.salesPerson] = { count: 0, grossAmount: 0, netAmount: 0 }
      }
      acc[record.salesPerson].count++
      acc[record.salesPerson].grossAmount += record.grossAmount
      acc[record.salesPerson].netAmount += record.netAmount
      return acc
    }, {} as Record<string, { count: number; grossAmount: number; netAmount: number }>)

    return NextResponse.json({
      data: filteredRecords,
      total: filteredRecords.length,
      summary: {
        totalGrossAmount,
        totalNetAmount,
        totalVat,
        totalCardFee,
      },
      categoryStats,
      salesPersonStats,
    })
  } catch (error) {
    console.error('Error fetching management sales:', error)
    return NextResponse.json(
      { error: '매출 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
