// Google Sheets API 설정 스크립트
// 이 스크립트는 서비스 계정 없이 API 키를 사용하여 공개 시트에 접근하는 방법을 제공합니다

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function setupPublicSheets() {
  console.log('=== Google Sheets 설정 안내 ===\n');

  console.log('현재 두 가지 방법으로 Google Sheets에 접근할 수 있습니다:\n');

  console.log('📌 방법 1: Google Sheets를 "링크가 있는 모든 사용자" 공개로 설정');
  console.log('1. Google Sheets 파일을 엽니다');
  console.log('2. 우측 상단의 "공유" 버튼 클릭');
  console.log('3. "일반 액세스" 섹션에서 "제한됨"을 "링크가 있는 모든 사용자"로 변경');
  console.log('4. 권한을 "뷰어"로 설정');
  console.log('5. API 키를 사용하여 접근 (서비스 계정 불필요)\n');

  console.log('📌 방법 2: 새로운 서비스 계정 생성 (권장)');
  console.log('1. Google Cloud Console 접속: https://console.cloud.google.com');
  console.log('2. 프로젝트 선택 또는 새 프로젝트 생성');
  console.log('3. "API 및 서비스" > "사용자 인증 정보"로 이동');
  console.log('4. "사용자 인증 정보 만들기" > "서비스 계정" 선택');
  console.log('5. 서비스 계정 이름 입력 (예: wtp-sheets-reader)');
  console.log('6. 생성된 서비스 계정 클릭 > "키" 탭 > "키 추가" > "JSON"');
  console.log('7. 다운로드된 JSON 파일의 내용을 .env.local에 추가\n');

  console.log('📝 현재 설정 정보:');
  console.log(`스프레드시트 ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '설정되지 않음'}`);
  console.log(`서비스 계정 이메일: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '설정되지 않음'}\n`);

  // API 키 방식 테스트 코드
  console.log('🔧 API 키 방식으로 테스트하려면:');
  console.log('1. Google Cloud Console에서 API 키 생성');
  console.log('2. .env.local에 추가: GOOGLE_API_KEY=your-api-key');
  console.log('3. Google Sheets를 공개로 설정');
  console.log('4. 아래 코드로 테스트:\n');

  const testCode = `
  // API 키로 공개 시트 읽기
  const sheets = google.sheets({
    version: 'v4',
    auth: process.env.GOOGLE_API_KEY
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: 'Sheet1!A1:Z100',
  });
  `;

  console.log(testCode);
}

setupPublicSheets();