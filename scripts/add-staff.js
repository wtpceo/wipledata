const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

async function addStaffMember() {
  try {
    // Google Sheets 인증
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

    // 박한대리 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Staff!A:F',
      valueInputOption: 'RAW',
      resource: {
        values: [
          ['박한', '대리', '', '', '', ''],
        ],
      },
    })

    console.log('✅ 박한 대리가 Staff 시트에 추가되었습니다.')
  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
    if (error.response) {
      console.error('상세 정보:', error.response.data)
    }
  }
}

addStaffMember()
