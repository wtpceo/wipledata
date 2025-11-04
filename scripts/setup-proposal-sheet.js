const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

// Google Sheets 인증 클라이언트 생성
function getGoogleAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

  if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY') && privateKey.length > 1000) {
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Failed to decode base64 private key, using as-is');
    }
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

async function setupProposalSheet() {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    console.log('📋 제안서요청 시트 설정 중...\n');

    // 칼럼 헤더 설정
    const headers = [
      '타임스탬프',
      '요청자',
      '요청 부서',
      '광고주명',
      '담당자명',
      '연락처',
      '이메일',
      '업종',
      '제안 유형',
      '광고 매체',
      '희망 상품',
      '예산 범위',
      '계약 기간',
      '광고 목표',
      '제안 희망일',
      '시급도',
      '특이사항',
      '첨부파일',
      '상태',
      '배정 담당자',
      '완료일',
      '제안서 링크'
    ];

    // 헤더 행 추가
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: '제안서요청!A1:V1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers]
      }
    });

    console.log('✅ 헤더 행 설정 완료');
    console.log(`   칼럼 수: ${headers.length}개`);
    console.log('\n📊 칼럼 구조:');
    headers.forEach((header, index) => {
      const col = String.fromCharCode(65 + index); // A, B, C...
      console.log(`   ${col}열: ${header}`);
    });

    // 헤더 행 서식 설정 (굵게, 배경색)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: await getSheetId(sheets, spreadsheetId, '제안서요청'),
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.5, blue: 0.8 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: await getSheetId(sheets, spreadsheetId, '제안서요청'),
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length
              }
            }
          }
        ]
      }
    });

    console.log('✅ 헤더 서식 설정 완료\n');
    console.log('🎉 제안서요청 시트 설정이 완료되었습니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 데이터:', error.response.data);
    }
    process.exit(1);
  }
}

// 시트 ID 가져오기
async function getSheetId(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });

  const sheet = response.data.sheets.find(
    s => s.properties.title === sheetName
  );

  if (!sheet) {
    throw new Error(`시트 "${sheetName}"를 찾을 수 없습니다.`);
  }

  return sheet.properties.sheetId;
}

setupProposalSheet();
