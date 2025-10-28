const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

async function setupStaffSheet() {
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

    // Staff 탭이 있는지 확인
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    const staffSheet = spreadsheet.data.sheets?.find(
      sheet => sheet.properties?.title === 'Staff'
    )

    if (staffSheet) {
      console.log('✅ Staff 탭이 이미 존재합니다.')

      // 헤더 확인
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Staff!A1:F1',
      })

      if (headerResponse.data.values && headerResponse.data.values.length > 0) {
        console.log('✅ 헤더:', headerResponse.data.values[0])
      } else {
        console.log('⚠️  헤더가 없습니다. 헤더를 추가합니다...')
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Staff!A1:F1',
          valueInputOption: 'RAW',
          resource: {
            values: [['이름', '직급', '부서', '휴대전화', '내선번호', '이메일']],
          },
        })
        console.log('✅ 헤더가 추가되었습니다.')
      }

      return
    }

    console.log('📝 Staff 탭을 생성합니다...')

    // Staff 탭 생성
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Staff',
              },
            },
          },
        ],
      },
    })

    console.log('✅ Staff 탭이 생성되었습니다.')

    // 헤더 행 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Staff!A1:F1',
      valueInputOption: 'RAW',
      resource: {
        values: [['이름', '직급', '부서', '휴대전화', '내선번호', '이메일']],
      },
    })

    console.log('✅ 헤더가 추가되었습니다.')

    // 샘플 데이터 추가 (선택사항)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Staff!A2:F2',
      valueInputOption: 'RAW',
      resource: {
        values: [
          ['홍길동', '대표이사', '경영지원팀', '010-1234-5678', '101', 'ceo@wiztheplanning.com'],
        ],
      },
    })

    console.log('✅ 샘플 데이터가 추가되었습니다.')
    console.log('\n🎉 Staff 탭 설정이 완료되었습니다!')
    console.log('📊 Google Sheets에서 직원 정보를 추가하세요.')
  } catch (error) {
    console.error('❌ 오류 발생:', error.message)
    if (error.response) {
      console.error('상세 정보:', error.response.data)
    }
  }
}

setupStaffSheet()
