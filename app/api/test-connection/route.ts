import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET() {
  try {
    console.log('=== Testing Google Sheets Connection ===')
    console.log('SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? 'SET' : 'NOT SET')
    console.log('SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'NOT SET')
    console.log('PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'SET (length: ' + process.env.GOOGLE_PRIVATE_KEY.length + ')' : 'NOT SET')

    // 원본데이터 시트에서 첫 5개 행만 읽기 시도
    const data = await readFromSheet('원본데이터!A1:D5')

    console.log('Data fetched successfully:', data.length, 'rows')

    return NextResponse.json({
      success: true,
      message: 'Google Sheets connection successful',
      rowCount: data.length,
      sampleData: data.slice(0, 3),
      env: {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? 'SET' : 'NOT SET',
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'NOT SET',
        privateKey: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT SET',
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
      }
    })
  } catch (error: any) {
    console.error('=== Google Sheets Connection Error ===')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      env: {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? 'SET' : 'NOT SET',
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'NOT SET',
        privateKey: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'NOT SET',
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
      }
    }, { status: 500 })
  }
}
