import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface SalaryRecord {
  id: string
  no: string
  name: string
  joinDate: string
  position: string
  monthlySalary: number
  annualSalary: number
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

export async function GET(request: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient()

    // 직원급여 탭 데이터 가져오기
    // 컬럼: No.(A/0), 성함(B/1), 입사일(C/2), 직위(D/3), 월급(E/4), 연봉(F/5)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '직원급여!A:F',
    })

    const rows = response.data.values || []

    if (rows.length <= 1) {
      return NextResponse.json({
        data: [],
        total: 0,
        summary: { totalMonthlySalary: 0, totalAnnualSalary: 0 },
        message: '데이터가 없습니다.',
      })
    }

    // 첫 행은 헤더, 두 번째 행부터 데이터
    const dataRows = rows.slice(1)

    // 데이터 파싱
    const data: SalaryRecord[] = dataRows
      .filter(row => row[0] && row[1]) // No.와 성함이 있는 행만
      .map((row, index) => ({
        id: `salary-${index + 1}`,
        no: row[0] || '',
        name: row[1] || '',
        joinDate: row[2] || '',
        position: row[3] || '',
        monthlySalary: parseFloat(String(row[4] || '0').replace(/[^0-9.-]/g, '')) || 0,
        annualSalary: parseFloat(String(row[5] || '0').replace(/[^0-9.-]/g, '')) || 0,
      }))

    // 합계 계산
    const totalMonthlySalary = data.reduce((sum, r) => sum + r.monthlySalary, 0)
    const totalAnnualSalary = data.reduce((sum, r) => sum + r.annualSalary, 0)

    // 직위별 통계
    const positionStats = data.reduce((acc, record) => {
      if (!record.position) return acc
      if (!acc[record.position]) {
        acc[record.position] = { count: 0, totalMonthlySalary: 0 }
      }
      acc[record.position].count++
      acc[record.position].totalMonthlySalary += record.monthlySalary
      return acc
    }, {} as Record<string, { count: number; totalMonthlySalary: number }>)

    return NextResponse.json({
      data,
      total: data.length,
      summary: {
        totalMonthlySalary,
        totalAnnualSalary,
      },
      positionStats,
    })
  } catch (error) {
    console.error('Error fetching salary data:', error)
    return NextResponse.json(
      { error: '직원 급여 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
