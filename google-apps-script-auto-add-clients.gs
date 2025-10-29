/**
 * 원본데이터의 L열(마케팅 담당자)에 값이 입력되면
 * 자동으로 Clients 탭에 광고주 정보를 추가
 *
 * 설치 방법:
 * 1. 구글 시트 열기
 * 2. 확장 프로그램 > Apps Script
 * 3. 이 파일의 내용을 전체 복사해서 붙여넣기
 * 4. 저장 (Ctrl/Cmd + S)
 */

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;

    // 원본데이터 시트의 L열(12번째 열)에서만 작동
    if (sheet.getName() !== '원본데이터' || range.getColumn() !== 12) {
      return;
    }

    // 헤더 행은 제외
    if (range.getRow() === 1) {
      return;
    }

    // 새로운 값이 입력되었는지 확인
    var newValue = e.value;
    if (!newValue || newValue.trim() === '') {
      return;
    }

    // 해당 행의 데이터 가져오기
    var row = range.getRow();
    var dataRange = sheet.getRange(row, 1, 1, 20);
    var rowData = dataRange.getValues()[0];

    // 원본데이터 구조
    var clientName = rowData[4];        // E열: 광고주명
    var contractAmount = rowData[7];    // H열: 총계약금액
    var startDate = rowData[14];        // O열: 계약날짜
    var endDate = rowData[15];          // P열: 계약종료일
    var marketingManager = newValue;    // L열: 마케팅담당자

    // 필수 정보가 없으면 추가하지 않음
    if (!clientName || !startDate || !endDate) {
      Logger.log('필수 정보 부족');
      Logger.log('광고주명' + clientName);
      Logger.log('시작일' + startDate);
      Logger.log('종료일' + endDate);
      return;
    }

    // Clients 탭에 추가
    addToClientsSheet(clientName, contractAmount, startDate, endDate, marketingManager);

  } catch (error) {
    Logger.log('오류 발생' + error.toString());
  }
}

function addToClientsSheet(clientName, amount, startDate, endDate, manager) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName('Clients');

  if (!clientsSheet) {
    Logger.log('Clients 시트를 찾을 수 없습니다');
    return;
  }

  // 이미 같은 광고주가 있는지 확인
  var lastRow = clientsSheet.getLastRow();
  if (lastRow > 1) {
    var existingData = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      if (existingData[i][0] === clientName) {
        Logger.log('이미 존재하는 광고주' + clientName);
        return;
      }
    }
  }

  // Clients 탭에 추가할 데이터
  var newRow = [
    '진행',
    clientName,
    amount || '',
    startDate,
    endDate,
    manager
  ];

  // 새 행 추가
  clientsSheet.appendRow(newRow);

  Logger.log('Clients 탭에 추가됨');
  Logger.log('업체명' + clientName);
  Logger.log('담당자' + manager);
}
