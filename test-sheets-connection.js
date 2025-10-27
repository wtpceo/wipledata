// Google Sheets 연결 테스트 스크립트
require('dotenv').config({ path: '.env.local' });
const { getGoogleSheetsService } = require('./services/googleSheets');

async function testConnection() {
  console.log('=== Google Sheets 연결 테스트 시작 ===\n');

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.error('❌ 오류: GOOGLE_SHEETS_SPREADSHEET_ID가 .env.local 파일에 설정되지 않았습니다.');
    console.log('\n.env.local 파일에 다음을 추가하세요:');
    console.log('GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here\n');
    process.exit(1);
  }

  console.log(`📋 스프레드시트 ID: ${spreadsheetId}\n`);

  try {
    const sheetsService = getGoogleSheetsService();

    // 1. 기본 연결 테스트
    console.log('1️⃣ 기본 연결 테스트...');
    // 시트 이름을 시도해볼 여러 옵션들
    const sheetNames = ['시트1', 'Sheet1', '2025년 목표', 'Data', 'Sales'];
    let headers = null;
    let workingSheetName = null;

    for (const sheetName of sheetNames) {
      try {
        const testRange = `${sheetName}!A1:Z1`;
        console.log(`   시도 중: ${sheetName}`);
        headers = await sheetsService.getSheetData(spreadsheetId, testRange);
        workingSheetName = sheetName;
        console.log(`   ✅ 작동하는 시트 이름: ${sheetName}`);
        break;
      } catch (err) {
        // 다음 시트 이름 시도
        continue;
      }
    }

    if (!headers) {
      console.log('❌ 기본 시트를 찾을 수 없습니다.');
      console.log('   Google Sheets 파일의 첫 번째 시트 이름을 확인하세요.');
      process.exit(1);
    }
    console.log('✅ 연결 성공!');
    console.log('   헤더 행:', headers[0] || '데이터 없음');

    // 2. 매출 데이터 테스트
    console.log('\n2️⃣ 매출 데이터 로드 테스트...');
    const salesData = await sheetsService.getSalesData(spreadsheetId);
    console.log('✅ 매출 데이터 로드 성공!');
    console.log(`   월별 데이터: ${salesData.monthly.length}개`);
    console.log(`   일별 데이터: ${salesData.daily.length}개`);
    console.log(`   카테고리: ${salesData.categories.length}개`);

    // 3. 샘플 데이터 표시
    if (salesData.monthly.length > 0) {
      console.log('\n📊 최근 월별 매출 (최대 3개월):');
      salesData.monthly.slice(0, 3).forEach(month => {
        console.log(`   ${month.date}: ₩${new Intl.NumberFormat('ko-KR').format(month.amount)}`);
      });
    }

    if (salesData.categories.length > 0) {
      console.log('\n📂 카테고리별 매출:');
      salesData.categories.forEach(cat => {
        console.log(`   ${cat.name}: ₩${new Intl.NumberFormat('ko-KR').format(cat.amount)}`);
      });
    }

    // 4. 목표 데이터 테스트 (선택사항)
    console.log('\n3️⃣ 목표 데이터 로드 테스트...');
    try {
      const goalsData = await sheetsService.getGoalsData(spreadsheetId, 'Goals');
      console.log('✅ 목표 데이터 로드 성공!');
      console.log(`   목표 항목: ${goalsData.length}개`);
    } catch (error) {
      console.log('⚠️ 목표 데이터 시트가 없거나 접근할 수 없습니다. (선택사항)');
    }

    console.log('\n=== 테스트 완료! ===');
    console.log('✅ Google Sheets 연동이 정상적으로 작동합니다.');
    console.log('\n다음 단계:');
    console.log('1. npm run dev로 개발 서버를 시작하세요');
    console.log('2. http://localhost:3000/sheets 페이지를 확인하세요');
    console.log('3. Google Sheets의 데이터를 변경하고 대시보드가 업데이트되는지 확인하세요\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패!');
    console.error('오류 내용:', error.message);

    console.log('\n문제 해결 방법:');
    console.log('1. credentials.json 파일이 프로젝트 루트에 있는지 확인');
    console.log('2. 서비스 계정이 스프레드시트에 접근 권한이 있는지 확인');
    console.log('3. 스프레드시트 ID가 올바른지 확인');
    console.log('4. Google Sheets API가 활성화되어 있는지 확인\n');

    process.exit(1);
  }
}

// 테스트 실행
testConnection();