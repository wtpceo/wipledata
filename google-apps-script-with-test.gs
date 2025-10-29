/**
 * 원본데이터의 L열(마케팅 담당자)에 값이 입력되면
 * 자동으로 Clients 탭에 광고주 정보를 추가
 */

// 테스트용 함수 - 권한 승인 및 동작 확인
function testAddClient() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawDataSheet = ss.getSheetByName('원본데이터');

  if (!rawDataSheet) {
    Logger.log('원본데이터 시트를 찾을 수 없습니다');
    return;
  }

  // 2번째 행 데이터로 테스트 (헤더 제외)
  var testRow = rawDataSheet.getRange(2, 1, 1, 20).getValues()[0];

  var clientName = testRow[4];        // E열
  var contractAmount = testRow[7];    // H열
  var startDate = testRow[14];        // O열
  var endDate = testRow[15];          // P열
  var manager = testRow[11];          // L열

  Logger.log('테스트 데이터');
  Logger.log('광고주명: ' + clientName);
  Logger.log('계약금액: ' + contractAmount);
  Logger.log('시작일: ' + startDate);
  Logger.log('종료일: ' + endDate);
  Logger.log('담당자: ' + manager);

  if (!clientName || !startDate || !endDate) {
    Logger.log('필수 정보가 없습니다');
    return;
  }

  addToClientsSheet(clientName, contractAmount, startDate, endDate, manager || '테스트담당자');
}

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;

    Logger.log('편집 감지됨');
    Logger.log('시트명: ' + sheet.getName());
    Logger.log('열 번호: ' + range.getColumn());
    Logger.log('행 번호: ' + range.getRow());

    // 원본데이터 시트의 L열(12번째 열)에서만 작동
    if (sheet.getName() !== '원본데이터') {
      Logger.log('원본데이터 시트가 아닙니다');
      return;
    }

    if (range.getColumn() !== 12) {
      Logger.log('L열이 아닙니다');
      return;
    }

    // 헤더 행은 제외
    if (range.getRow() === 1) {
      Logger.log('헤더 행입니다');
      return;
    }

    // 새로운 값이 입력되었는지 확인
    var newValue = e.value;
    Logger.log('입력된 값: ' + newValue);

    if (!newValue || newValue.trim() === '') {
      Logger.log('값이 비어있습니다');
      return;
    }

    // 해당 행의 데이터 가져오기
    var row = range.getRow();
    var dataRange = sheet.getRange(row, 1, 1, 20);
    var rowData = dataRange.getValues()[0];

    var clientName = rowData[4];
    var contractAmount = rowData[7];
    var startDate = rowData[14];
    var endDate = rowData[15];
    var marketingManager = newValue;

    Logger.log('광고주명: ' + clientName);
    Logger.log('시작일: ' + startDate);
    Logger.log('종료일: ' + endDate);

    // 필수 정보가 없으면 추가하지 않음
    if (!clientName || !startDate || !endDate) {
      Logger.log('필수 정보 부족');
      return;
    }

    // Clients 탭에 추가
    addToClientsSheet(clientName, contractAmount, startDate, endDate, marketingManager);

  } catch (error) {
    Logger.log('오류 발생: ' + error.toString());
    Logger.log('스택: ' + error.stack);
  }
}

function addToClientsSheet(clientName, amount, startDate, endDate, manager) {
  Logger.log('addToClientsSheet 시작');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName('Clients');

  if (!clientsSheet) {
    Logger.log('Clients 시트를 찾을 수 없습니다');
    return;
  }

  // 이미 같은 광고주가 있는지 확인
  var lastRow = clientsSheet.getLastRow();
  Logger.log('Clients 마지막 행: ' + lastRow);

  if (lastRow > 1) {
    var existingData = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][0] === clientName) {
        Logger.log('이미 존재하는 광고주: ' + clientName);
        return;
      }
    }
  }

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

  Logger.log('성공: Clients 탭에 추가됨');
  Logger.log('업체명: ' + clientName);
  Logger.log('담당자: ' + manager);
}
