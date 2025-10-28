import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
const RANGE = 'Staff!A:F' // 이름, 직급, 부서, 휴대전화, 내선번호, 이메일

async function getGoogleSheetsClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SHEETS_CREDENTIALS!, 'base64').toString()
  )

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

export async function GET(request: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return NextResponse.json({ staff: [] })
    }

    // 첫 번째 행은 헤더이므로 제외
    const [headers, ...dataRows] = rows

    const staff = dataRows.map((row) => ({
      name: row[0] || '',
      position: row[1] || '',
      department: row[2] || '',
      phone: row[3] || '',
      extension: row[4] || '',
      email: row[5] || '',
    }))

    return NextResponse.json({ staff })
  } catch (error) {
    console.error('Error fetching staff data:', error)
    return NextResponse.json(
      { error: '직원 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
