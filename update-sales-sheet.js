// Google Sheets에 데이터 쓰기 테스트 스크립트
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testWriteToSheet() {
  console.log('=== Google Sheets 쓰기 테스트 시작 ===\n');

  try {
    // 환경 변수에서 인증 정보 가져오기
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!privateKey || !clientEmail || !spreadsheetId) {
      console.error('❌ 필요한 환경 변수가 설정되지 않았습니다.');
      return;
    }

    console.log('📋 스프레드시트 ID:', spreadsheetId);
    console.log('📧 서비스 계정:', clientEmail);

    // 인증 설정
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 테스트 데이터
    const testData = [
      [
        new Date().toISOString(),
        '2025-10',
        '토탈 마케팅',
        '테스트 AE',
        30,
        20,
        15,
        5,
        '예산 부족',
        10000000,
        '테스트 데이터입니다'
      ]
    ];

    console.log('\n1️⃣ AEPerformance 시트에 데이터 쓰기 시도...');
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'AEPerformance!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: testData,
      },
    });

    console.log('✅ 데이터 쓰기 성공!');
    console.log('   업데이트된 범위:', response.data.updates?.updatedRange);
    console.log('   업데이트된 행 수:', response.data.updates?.updatedRows);

    console.log('\n2️⃣ 저장된 데이터 읽기...');
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'AEPerformance!A:K',
    });

    const lastRow = readResponse.data.values?.[readResponse.data.values.length - 1];
    console.log('✅ 마지막 행 데이터:', lastRow);

    console.log('\n=== 테스트 완료! ===');
    console.log('✅ AE 실적 입력 페이지에서 데이터를 입력하면');
    console.log('   Google Sheets의 AEPerformance 탭에 자동으로 저장됩니다!');
    console.log('\n다음 단계:');
    console.log('1. http://localhost:3000/ae-performance/new 페이지로 이동');
    console.log('2. AE 실적 데이터 입력');
    console.log('3. 저장 버튼 클릭');
    console.log('4. Google Sheets에서 데이터 확인\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패!');
    console.error('오류:', error.message);

    if (error.message.includes('permission')) {
      console.log('\n문제 해결:');
      console.log('1. Google Sheets 파일에 서비스 계정 이메일을 편집자로 추가');
      console.log('2. 이메일:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
      console.log('3. 권한: 편집자 (Editor)');
    }
  }
}

testWriteToSheet();
