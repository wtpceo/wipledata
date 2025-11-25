import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface PurchaseRecord {
  id: string
  date: string
  accountType: string   // 구분/계정과목 (B열)
  description: string   // 내역 (C열)
  amount: number        // 금액 (D열)
  paymentMethod: string // 결제방법 (E열)
  department: string    // 사용처/부서/담당자 (F열)
  note: string          // 비고 (G열)
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    // YYYY. M. D 또는 YYYY. MM. DD 형식 (공백 포함, 구글시트 날짜 형식)
    const dotSpaceMatch = dateStr.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/)
    if (dotSpaceMatch) {
      const year = dotSpaceMatch[1]
      const month = dotSpaceMatch[2].padStart(2, '0')
      const day = dotSpaceMatch[3].padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // 한글 형식: "11월 03일" 또는 "11월 3일" (현재 연도 사용)
    const koreanMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/)
    if (koreanMatch) {
      const currentYear = new Date().getFullYear()
      const month = koreanMatch[1].padStart(2, '0')
      const day = koreanMatch[2].padStart(2, '0')
      return `${currentYear}-${month}-${day}`
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
    const accountType = searchParams.get('accountType')
    const department = searchParams.get('department')

    const sheets = await getGoogleSheetsClient()

    // 매입 데이터 가져오기 (위플경리회계 시트의 '매입' 탭)
    // 컬럼: 날짜(A/0), 구분/계정과목(B/1), 내역(C/2), 금액(D/3),
    //       결제방법(E/4), 사용처/부서/담당자(F/5), 비고(G/6)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '매입!A:G',
    })

    const rows = response.data.values || []

    // 첫 행은 헤더
    const purchaseRecords: PurchaseRecord[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const date = parseDate(row[0])
      if (!date) continue

      const amount = parseFloat(row[3]?.replace(/[^0-9.-]/g, '') || '0') || 0

      // 금액이 0이면 건너뛰기
      if (amount === 0) continue

      purchaseRecords.push({
        id: `purchase-${i}`,
        date,
        accountType: row[1] || '',
        description: row[2] || '',
        amount,
        paymentMethod: row[4] || '',
        department: row[5] || '',
        note: row[6] || '',
      })
    }

    // 필터링
    let filteredRecords = purchaseRecords

    if (startDate) {
      filteredRecords = filteredRecords.filter(record => record.date >= startDate)
    }

    if (endDate) {
      filteredRecords = filteredRecords.filter(record => record.date <= endDate)
    }

    if (accountType) {
      filteredRecords = filteredRecords.filter(record => record.accountType === accountType)
    }

    if (department) {
      filteredRecords = filteredRecords.filter(record => record.department === department)
    }

    // 날짜 내림차순 정렬
    filteredRecords.sort((a, b) => b.date.localeCompare(a.date))

    // 합계 계산
    const totalAmount = filteredRecords.reduce((sum, r) => sum + r.amount, 0)

    // 계정과목별 집계
    const accountTypeStats = filteredRecords.reduce((acc, record) => {
      if (!record.accountType) return acc
      if (!acc[record.accountType]) {
        acc[record.accountType] = { count: 0, amount: 0 }
      }
      acc[record.accountType].count++
      acc[record.accountType].amount += record.amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // 부서별 집계
    const departmentStats = filteredRecords.reduce((acc, record) => {
      if (!record.department) return acc
      if (!acc[record.department]) {
        acc[record.department] = { count: 0, amount: 0 }
      }
      acc[record.department].count++
      acc[record.department].amount += record.amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    // 결제방법별 집계
    const paymentMethodStats = filteredRecords.reduce((acc, record) => {
      if (!record.paymentMethod) return acc
      if (!acc[record.paymentMethod]) {
        acc[record.paymentMethod] = { count: 0, amount: 0 }
      }
      acc[record.paymentMethod].count++
      acc[record.paymentMethod].amount += record.amount
      return acc
    }, {} as Record<string, { count: number; amount: number }>)

    return NextResponse.json({
      data: filteredRecords,
      total: filteredRecords.length,
      summary: {
        totalAmount,
      },
      accountTypeStats,
      departmentStats,
      paymentMethodStats,
    })
  } catch (error) {
    console.error('Error fetching management purchase:', error)
    return NextResponse.json(
      { error: '매입 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
