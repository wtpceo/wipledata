import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface LoanRecord {
  id: string
  loanName: string       // 구분 (대출명) - B열
  principal: number      // 약정 금액 (대출원금) - D열
  repaid: number         // 상환 금액 - E열
  balance: number        // 대출 잔액 - F열
  interestRate: number   // 이율 (%) - G열
  endDate: string        // 만기 일자 - H열
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

function parseAmount(value: any): number {
  if (!value || value === '-') return 0
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

function parseRate(value: any): number {
  if (!value || value === '-') return 0
  // "4%" 또는 "0.04" 형식 처리
  let str = String(value).replace(/[^0-9.%-]/g, '')
  if (str.includes('%')) {
    return parseFloat(str.replace('%', '')) || 0
  }
  const num = parseFloat(str)
  if (isNaN(num)) return 0
  // 0.04 같은 소수점이면 100 곱해서 %로
  return num < 1 ? num * 100 : num
}

function parseDate(value: any): string {
  if (!value || value === '-') return ''
  return String(value).trim()
}

export async function GET(request: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient()

    // 대출현황 탭 데이터 가져오기
    // 시트 구조: 헤더 2행, 데이터 3행~, B~H열
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '대출현황!A:H',
    })

    const rows = response.data.values || []

    if (rows.length < 3) {
      return NextResponse.json({
        data: [],
        totalPrincipal: 0,
        totalRepaid: 0,
        totalBalance: 0,
        avgInterestRate: 0,
        message: '데이터가 없습니다.',
      })
    }

    // 헤더는 2행 (index 1)
    // 데이터는 3행 (index 2)부터 시작
    const data: LoanRecord[] = []
    let totalPrincipal = 0
    let totalRepaid = 0
    let totalBalance = 0

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      // B열 (index 1): 구분
      const loanName = String(row[1] || '').trim()

      // 빈 행 스킵
      if (!loanName) continue

      // 합계 행 처리
      if (loanName.includes('합') && loanName.includes('계')) {
        // D열: 약정 금액 합계
        totalPrincipal = parseAmount(row[3])
        // E열: 상환 금액 합계
        totalRepaid = parseAmount(row[4])
        // F열: 대출 잔액 합계
        totalBalance = parseAmount(row[5])
        continue
      }

      const principal = parseAmount(row[3])  // D열: 약정 금액
      const repaid = parseAmount(row[4])     // E열: 상환 금액
      const balance = parseAmount(row[5])    // F열: 대출 잔액
      const interestRate = parseRate(row[6]) // G열: 이율
      const endDate = parseDate(row[7])      // H열: 만기 일자

      data.push({
        id: `loan-${i}`,
        loanName,
        principal,
        repaid,
        balance,
        interestRate,
        endDate,
      })
    }

    // 총계가 없으면 직접 계산
    if (totalPrincipal === 0) {
      totalPrincipal = data.reduce((sum, r) => sum + r.principal, 0)
    }
    if (totalRepaid === 0) {
      totalRepaid = data.reduce((sum, r) => sum + r.repaid, 0)
    }
    if (totalBalance === 0) {
      totalBalance = data.reduce((sum, r) => sum + r.balance, 0)
    }

    // 평균 이자율 계산 (잔액 가중 평균)
    const avgInterestRate = totalBalance > 0
      ? data.reduce((sum, r) => sum + (r.interestRate * r.balance), 0) / totalBalance
      : 0

    return NextResponse.json({
      data,
      total: data.length,
      totalPrincipal,
      totalRepaid,
      totalBalance,
      avgInterestRate: Math.round(avgInterestRate * 100) / 100,
    })
  } catch (error) {
    console.error('Error fetching loans data:', error)
    return NextResponse.json(
      { error: '대출현황 데이터를 불러오는 중 오류가 발생했습니다.', details: String(error) },
      { status: 500 }
    )
  }
}
