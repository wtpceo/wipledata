const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');

async function createAdminUser() {
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

    // 관리자 정보
    const adminEmail = 'admin@wtp.com';
    const adminPassword = 'admin123'; // 변경 필요!
    const adminName = '관리자';
    const adminDepartment = '관리부';

    // 기존 사용자 확인
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Users!A:K',
    });

    // 이미 관리자가 있는지 확인
    if (existingData.data.values && existingData.data.values.length > 1) {
      for (let i = 1; i < existingData.data.values.length; i++) {
        if (existingData.data.values[i][1] === adminEmail) {
          console.log('⚠️  관리자 계정이 이미 존재합니다.');
          console.log(`   이메일: ${adminEmail}`);
          return;
        }
      }
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const now = new Date().toISOString();

    // 관리자 사용자 추가
    const values = [[
      now, // 타임스탬프
      adminEmail, // 이메일
      passwordHash, // 비밀번호(해시)
      adminName, // 이름
      adminDepartment, // 부서
      'admin', // 역할
      'active', // 상태 (바로 활성화)
      'system', // 승인자
      now, // 승인일시
      now, // 생성일시
      now, // 수정일시
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Users!A:K',
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    console.log('✅ 관리자 계정이 생성되었습니다!');
    console.log('');
    console.log('📋 로그인 정보:');
    console.log(`   이메일: ${adminEmail}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log('');
    console.log('⚠️  보안을 위해 로그인 후 비밀번호를 변경하세요!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✅ 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error.message);
    process.exit(1);
  });
