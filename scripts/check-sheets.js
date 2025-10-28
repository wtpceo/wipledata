const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

async function checkSheets() {
  try {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
    privateKey = privateKey.replace(/\\n/g, '\n')

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

    // 모든 시트 목록 가져오기
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    console.log('📋 Available Sheets:')
    spreadsheet.data.sheets?.forEach(sheet => {
      console.log(`  - ${sheet.properties?.title}`)
    })

    // 원본데이터 탭 헤더 확인
    console.log('\n📊 원본데이터 탭 헤더:')
    try {
      const rawDataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '원본데이터!A1:Z1',
      })
      console.log(rawDataResponse.data.values?.[0] || 'Not found')
    } catch (e) {
      console.log('Sheet not found or error:', e.message)
    }

    // 매입 현황 탭 헤더 확인
    console.log('\n💰 매입 현황 탭 헤더:')
    try {
      const purchaseResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '매입 현황!A1:Z1',
      })
      console.log(purchaseResponse.data.values?.[0] || 'Not found')
    } catch (e) {
      console.log('Sheet not found or error:', e.message)
    }

    // Sales 탭 헤더 확인 (기존 사용 중인 탭)
    console.log('\n💵 Sales 탭 헤더:')
    try {
      const salesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sales!A1:Z1',
      })
      console.log(salesResponse.data.values?.[0] || 'Not found')
    } catch (e) {
      console.log('Sheet not found or error:', e.message)
    }

    // Purchase 탭 헤더 확인 (기존 사용 중인 탭)
    console.log('\n🛒 Purchase 탭 헤더:')
    try {
      const purchaseResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Purchase!A1:Z1',
      })
      console.log(purchaseResponse.data.values?.[0] || 'Not found')
    } catch (e) {
      console.log('Sheet not found or error:', e.message)
    }

  } catch (error) {
    console.error('❌ 오류:', error.message)
  }
}

checkSheets()
