import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth } from '@/lib/google-sheets'

// 경영관리용 별도 구글 시트 (위플경리회계)
const MANAGEMENT_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_MANAGEMENT_ID || '1Jx141heDJF7FKHSrkwdex_AybJojHMDyhSs_LBRlLv8'

interface LiabilityRecord {
  id: string
  name: string
  beforeJune: number
  july: number
  august: number
  september: number
  october: number
  november: number
  december: number
  subtotal: number
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

    // 미지급금 탭 데이터 가져오기
    // 컬럼: 내용(B/1), ~6월 이전(C/2), 7월(D/3), 8월(E/4), 9월(F/5), 10월(G/6), 11월(H/7), 12월(I/8), 미지급금 소계(M/12)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MANAGEMENT_SPREADSHEET_ID,
      range: '미지급금!A:M',
    })

    const rows = response.data.values || []

    if (rows.length < 4) {
      return NextResponse.json({
        data: [],
        total: 0,
        grandTotal: 0,
        message: '데이터가 없습니다.',
      })
    }

    // 데이터는 4행(index 3)부터 시작
    const data: LiabilityRecord[] = []
    let grandTotal = 0

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[1]) continue // B열(내용)이 비어있으면 스킵

      // 미지급금 총계 행 찾기
      if (String(row[1]).includes('미지급금 총계') || String(row[11]).includes('미지급금 총계')) {
        grandTotal = parseAmount(row[12])
        continue
      }

      // 빈 내용이면 스킵
      const name = String(row[1] || '').trim()
      if (!name) continue

      const subtotal = parseAmount(row[12])

      data.push({
        id: `liability-${i}`,
        name: name,
        beforeJune: parseAmount(row[2]),
        july: parseAmount(row[3]),
        august: parseAmount(row[4]),
        september: parseAmount(row[5]),
        october: parseAmount(row[6]),
        november: parseAmount(row[7]),
        december: parseAmount(row[8]),
        subtotal: subtotal,
      })
    }

    // grandTotal이 없으면 계산
    if (grandTotal === 0) {
      grandTotal = data.reduce((sum, r) => sum + r.subtotal, 0)
    }

    // 월별 합계 계산
    const monthlyTotals = {
      beforeJune: data.reduce((sum, r) => sum + r.beforeJune, 0),
      july: data.reduce((sum, r) => sum + r.july, 0),
      august: data.reduce((sum, r) => sum + r.august, 0),
      september: data.reduce((sum, r) => sum + r.september, 0),
      october: data.reduce((sum, r) => sum + r.october, 0),
      november: data.reduce((sum, r) => sum + r.november, 0),
      december: data.reduce((sum, r) => sum + r.december, 0),
    }

    return NextResponse.json({
      data,
      total: data.length,
      grandTotal,
      monthlyTotals,
    })
  } catch (error) {
    console.error('Error fetching liabilities data:', error)
    return NextResponse.json(
      { error: '미지급금 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
