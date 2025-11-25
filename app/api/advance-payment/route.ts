import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface AdvanceRecord {
  id: string
  date: string
  description: string
  paymentAmount: number
  repaymentAmount: number
  balance: number
  note: string
}

interface SectionData {
  title: string
  headers: string[]
  data: AdvanceRecord[]
  totalPayment: number
  totalRepayment: number
  currentBalance: number
}

async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

function parseAmount(value: any): number {
  if (!value) return 0
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

export async function GET(request: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient()

    // 가지급금/가수금 탭 전체 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '가지급금/가수금!A:U',
    })

    const rows = response.data.values || []

    if (rows.length < 5) {
      return NextResponse.json({
        sections: [],
        message: '데이터가 없습니다.',
      })
    }

    const sections: SectionData[] = []

    // 섹션 1: 위플푸드 대여금 (B~G열, 4행부터 시작)
    // 헤더: 일자(B/1), 적요(C/2), 지급액(D/3), 상환액(E/4), 잔액(F/5), 비고(G/6)
    const section1Data: AdvanceRecord[] = []
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[1]) continue // B열(일자)이 비어있으면 스킵

      section1Data.push({
        id: `loan-${i}`,
        date: row[1] || '',
        description: row[2] || '',
        paymentAmount: parseAmount(row[3]),
        repaymentAmount: parseAmount(row[4]),
        balance: parseAmount(row[5]),
        note: row[6] || '',
      })
    }

    // 마지막 잔액 찾기 (데이터가 있는 마지막 행)
    const lastSection1 = section1Data.filter(d => d.balance > 0).pop()

    sections.push({
      title: '위플푸드 대여금',
      headers: ['일자', '적요', '지급액', '상환액', '잔액', '비고'],
      data: section1Data,
      totalPayment: section1Data.reduce((sum, r) => sum + r.paymentAmount, 0),
      totalRepayment: section1Data.reduce((sum, r) => sum + r.repaymentAmount, 0),
      currentBalance: lastSection1?.balance || 0,
    })

    // 섹션 2: 정현우 대표님 가수금 25일 (I~N열, 4행부터 시작)
    // 헤더: 일자(I/8), 적요(J/9), 입금액(K/10), 상환액(L/11), 잔액(M/12), 비고(N/13)
    const section2Data: AdvanceRecord[] = []
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[8]) continue // I열(일자)이 비어있으면 스킵

      section2Data.push({
        id: `advance25-${i}`,
        date: row[8] || '',
        description: row[9] || '',
        paymentAmount: parseAmount(row[10]),
        repaymentAmount: parseAmount(row[11]),
        balance: parseAmount(row[12]),
        note: row[13] || '',
      })
    }

    const lastSection2 = section2Data.filter(d => d.balance > 0).pop()

    sections.push({
      title: '정현우 대표님 가수금 25일',
      headers: ['일자', '적요', '입금액', '상환액', '잔액', '비고'],
      data: section2Data,
      totalPayment: section2Data.reduce((sum, r) => sum + r.paymentAmount, 0),
      totalRepayment: section2Data.reduce((sum, r) => sum + r.repaymentAmount, 0),
      currentBalance: lastSection2?.balance || 0,
    })

    // 섹션 3: 정현우 대표님 가수금 5일 (P~U열, 4행부터 시작)
    // 헤더: 일자(P/15), 적요(Q/16), 입금액(R/17), 상환액(S/18), 잔액(T/19), 비고(U/20)
    const section3Data: AdvanceRecord[] = []
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[15]) continue // P열(일자)이 비어있으면 스킵

      section3Data.push({
        id: `advance5-${i}`,
        date: row[15] || '',
        description: row[16] || '',
        paymentAmount: parseAmount(row[17]),
        repaymentAmount: parseAmount(row[18]),
        balance: parseAmount(row[19]),
        note: row[20] || '',
      })
    }

    const lastSection3 = section3Data.filter(d => d.balance > 0).pop()

    sections.push({
      title: '정현우 대표님 가수금 5일',
      headers: ['일자', '적요', '입금액', '상환액', '잔액', '비고'],
      data: section3Data,
      totalPayment: section3Data.reduce((sum, r) => sum + r.paymentAmount, 0),
      totalRepayment: section3Data.reduce((sum, r) => sum + r.repaymentAmount, 0),
      currentBalance: lastSection3?.balance || 0,
    })

    // 전체 합계
    const totalCurrentBalance = sections.reduce((sum, s) => sum + s.currentBalance, 0)

    return NextResponse.json({
      sections,
      totalCurrentBalance,
    })
  } catch (error) {
    console.error('Error fetching advance payment data:', error)
    return NextResponse.json(
      { error: '가지급금/가수금 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
