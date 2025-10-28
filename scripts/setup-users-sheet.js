const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { google } = require('googleapis');

async function setupUsersSheet() {
  try {
    // Load service account credentials from environment variables
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

    // Base64로 인코딩된 경우 디코딩
    if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY') && privateKey.length > 1000) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
      } catch (error) {
        console.error('Failed to decode base64 private key, using as-is');
      }
    }

    // \n 처리
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경 변수가 설정되지 않았습니다.');
    }

    // Check if Users tab already exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const usersSheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === 'Users'
    );

    if (usersSheetExists) {
      console.log('✅ Users 탭이 이미 존재합니다.');

      // Check if headers are set
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A1:K1',
      });

      if (response.data.values && response.data.values.length > 0) {
        console.log('✅ 헤더가 이미 설정되어 있습니다:', response.data.values[0]);
        return;
      }
    } else {
      // Create Users sheet
      console.log('📝 Users 탭을 생성합니다...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Users',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 11,
                },
              },
            },
          }],
        },
      });
      console.log('✅ Users 탭이 생성되었습니다.');
    }

    // Set up headers
    console.log('📝 헤더를 설정합니다...');
    const headers = [
      '타임스탬프',
      '이메일',
      '비밀번호(해시)',
      '이름',
      '부서',
      '역할',
      '상태',
      '승인자',
      '승인일시',
      '생성일시',
      '수정일시'
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Users!A1:K1',
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    // Format header row
    const usersSheetId = spreadsheet.data.sheets?.find(
      sheet => sheet.properties?.title === 'Users'
    )?.properties?.sheetId;

    if (usersSheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: usersSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      fontSize: 10,
                      bold: true,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: usersSheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
          ],
        },
      });
    }

    console.log('✅ Users 탭 설정이 완료되었습니다!');
    console.log('\n📋 생성된 컬럼:');
    headers.forEach((header, index) => {
      console.log(`   ${String.fromCharCode(65 + index)}. ${header}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// Run the setup
setupUsersSheet()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error.message);
    process.exit(1);
  });
