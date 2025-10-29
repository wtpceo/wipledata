/**
 * 원본데이터의 U열(마케팅 담당자)에 값이 입력되면
 * 자동으로 Clients 탭에 광고주 정보를 추가
 *
 * 원본데이터 구조:
 * A: 타임스탬프
 * B: 부서
 * C: 입력자
 * D: 매출유형
 * E: 광고주명
 * F: 상품명
 * G: 계약개월
 * H: 총계약금액
 * I: 결제방식
 * J: 승인번호
 * K: 외주비
 * L: 상담내용
 * M: 특이사항
 * N: 계약서
 * O: 계약날짜 (시작일)
 * P: 계약종료일
 * Q: 월평균금액
 * R: 순수익
 * S: 입력년월
 * T: 분기
 * U: 마케팅담당자 ← 새로 추가!
 */

// 테스트용 함수
function testAddClient() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawDataSheet = ss.getSheetByName('원본데이터');

  if (!rawDataSheet) {
    Logger.log('원본데이터 시트를 찾을 수 없습니다');
    return;
  }

  // 2번째 행 데이터로 테스트
  var testRow = rawDataSheet.getRange(2, 1, 1, 21).getValues()[0];

  var clientName = testRow[4];        // E열: 광고주명
  var contractAmount = testRow[7];    // H열: 총계약금액
  var startDate = testRow[14];        // O열: 계약날짜
  var endDate = testRow[15];          // P열: 계약종료일
  var manager = testRow[20];          // U열: 마케팅담당자

  Logger.log('=== 테스트 데이터 ===');
  Logger.log('광고주명: ' + clientName);
  Logger.log('계약금액: ' + contractAmount);
  Logger.log('시작일: ' + startDate);
  Logger.log('종료일: ' + endDate);
  Logger.log('담당자: ' + manager);

  if (!clientName || !endDate) {
    Logger.log('필수 정보가 없습니다 (광고주명 또는 종료일)');
    return;
  }

  // 시작일이 없으면 오늘 날짜를 시작일로 사용
  if (!startDate) {
    startDate = new Date();
    Logger.log('시작일이 없어서 오늘 날짜를 사용합니다: ' + startDate);
  }

  addToClientsSheet(clientName, contractAmount, startDate, endDate, manager || '테스트담당자');
}

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;

    Logger.log('=== 편집 감지 ===');
    Logger.log('시트명: ' + sheet.getName());
    Logger.log('열 번호: ' + range.getColumn());
    Logger.log('행 번호: ' + range.getRow());

    // 원본데이터 시트의 U열(21번째 열)에서만 작동
    if (sheet.getName() !== '원본데이터') {
      Logger.log('원본데이터 시트가 아닙니다');
      return;
    }

    if (range.getColumn() !== 21) {
      Logger.log('U열(21번 열)이 아닙니다');
      return;
    }

    // 헤더 행은 제외
    if (range.getRow() === 1) {
      Logger.log('헤더 행입니다');
      return;
    }

    // 새로운 값 확인
    var newValue = e.value;
    Logger.log('입력된 값: ' + newValue);

    if (!newValue || newValue.trim() === '') {
      Logger.log('값이 비어있습니다');
      return;
    }

    // 해당 행의 데이터 가져오기
    var row = range.getRow();
    var dataRange = sheet.getRange(row, 1, 1, 21);
    var rowData = dataRange.getValues()[0];

    var clientName = rowData[4];        // E열
    var contractAmount = rowData[7];    // H열
    var startDate = rowData[14];        // O열
    var endDate = rowData[15];          // P열
    var marketingManager = newValue;    // U열

    Logger.log('광고주명: ' + clientName);
    Logger.log('계약금액: ' + contractAmount);
    Logger.log('시작일: ' + startDate);
    Logger.log('종료일: ' + endDate);
    Logger.log('담당자: ' + marketingManager);

    // 필수: 광고주명과 종료일
    if (!clientName || !endDate) {
      Logger.log('필수 정보 부족 (광고주명 또는 종료일)');
      return;
    }

    // 시작일이 없으면 오늘 날짜를 시작일로 사용
    if (!startDate) {
      startDate = new Date();
      Logger.log('시작일이 없어서 오늘 날짜를 사용합니다');
    }

    // Clients 탭에 추가
    addToClientsSheet(clientName, contractAmount, startDate, endDate, marketingManager);

  } catch (error) {
    Logger.log('=== 오류 발생 ===');
    Logger.log('오류: ' + error.toString());
    Logger.log('스택: ' + error.stack);
  }
}

function addToClientsSheet(clientName, amount, startDate, endDate, manager) {
  Logger.log('=== Clients 탭에 추가 시작 ===');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName('Clients');

  if (!clientsSheet) {
    Logger.log('Clients 시트를 찾을 수 없습니다');
    return;
  }

  // 중복 확인
  var lastRow = clientsSheet.getLastRow();
  Logger.log('Clients 마지막 행: ' + lastRow);

  if (lastRow > 1) {
    var existingData = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][0] === clientName) {
        Logger.log('이미 존재하는 광고주: ' + clientName);
        SpreadsheetApp.getUi().alert('이미 Clients 탭에 존재하는 광고주입니다: ' + clientName);
        return;
      }
    }
  }

  // Clients 탭 구조: 상태, 업체명, 계약금액, 서비스시작일, 서비스종료일, 마케팅담당자
  var newRow = [
    '진행',
    clientName,
    amount || '',
    startDate,
    endDate,
    manager
  ];

  Logger.log('추가할 데이터: ' + JSON.stringify(newRow));

  // 새 행 추가
  clientsSheet.appendRow(newRow);

  Logger.log('=== 성공 ===');
  Logger.log('Clients 탭에 추가되었습니다');
  Logger.log('업체명: ' + clientName);
  Logger.log('담당자: ' + manager);

  // 사용자에게 알림
  SpreadsheetApp.getUi().alert('Clients 탭에 추가되었습니다!\n\n업체명: ' + clientName + '\n담당자: ' + manager);
}
