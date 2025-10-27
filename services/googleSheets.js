const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.initialize();
  }

  async initialize() {
    try {
      // 환경 변수에서 인증 정보 가져오기
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

      if (!privateKey || !clientEmail) {
        throw new Error('Google Sheets 인증 정보가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
      }

      // 인증 설정
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      // Google Sheets API 클라이언트 초기화
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
      throw error;
    }
  }

  // 시트 데이터 가져오기
  async getSheetData(spreadsheetId, range) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  // 여러 범위의 데이터 한번에 가져오기
  async getBatchData(spreadsheetId, ranges) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
      });

      return response.data.valueRanges || [];
    } catch (error) {
      console.error('Error fetching batch data:', error);
      throw error;
    }
  }

  // 매출 데이터 처리
  async getSalesData(spreadsheetId) {
    try {
      const ranges = [
        'Sales!A1:Z1000', // Sales 시트의 전체 데이터
      ];

      const data = await this.getBatchData(spreadsheetId, ranges);

      if (data.length === 0 || !data[0].values) {
        return { monthly: [], daily: [], categories: [] };
      }

      const rows = data[0].values;

      // 첫 번째 행을 헤더로 가정
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // 데이터 파싱 및 구조화
      const processedData = dataRows.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });

      return this.aggregateSalesData(processedData);
    } catch (error) {
      console.error('Error getting sales data:', error);
      throw error;
    }
  }

  // 매출 데이터 집계
  aggregateSalesData(data) {
    const monthly = {};
    const daily = {};
    const categories = {};

    data.forEach(record => {
      // 실제 컬럼명 사용
      const date = record['Contract_Date'] || record['날짜'] || record['Date'];
      const amount = parseFloat(record['Total_Amount'] || record['매출'] || record['Sales'] || record['Amount'] || 0);
      const category = record['Product_Name'] || record['카테고리'] || record['Category'] || '기타';

      if (date && amount && !isNaN(amount)) {
        // 날짜 형식 정규화 (YYYY-MM-DD)
        let normalizedDate = date;
        if (date.includes('/')) {
          // MM/DD/YYYY 또는 M/D/YYYY 형식을 YYYY-MM-DD로 변환
          const parts = date.split('/');
          if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            normalizedDate = `${year}-${month}-${day}`;
          }
        }

        // 월별 집계
        const month = normalizedDate.substring(0, 7); // YYYY-MM 형식
        if (month && month.length === 7 && month.includes('-')) {
          monthly[month] = (monthly[month] || 0) + amount;
        }

        // 일별 집계
        if (normalizedDate && normalizedDate.length >= 10) {
          const dayKey = normalizedDate.substring(0, 10);
          daily[dayKey] = (daily[dayKey] || 0) + amount;
        }

        // 카테고리별 집계
        if (category && category.trim()) {
          categories[category] = (categories[category] || 0) + amount;
        }
      }
    });

    return {
      monthly: Object.entries(monthly)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      daily: Object.entries(daily)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      categories: Object.entries(categories)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount) // 금액 높은 순
    };
  }

  // 목표 대비 실적 데이터
  async getGoalsData(spreadsheetId, targetSheet = 'Goals') {
    try {
      const range = `${targetSheet}!A1:Z100`;
      const data = await this.getSheetData(spreadsheetId, range);

      if (data.length === 0) {
        return { goals: [], achievements: [] };
      }

      const headers = data[0];
      const dataRows = data.slice(1);

      const processedData = dataRows.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });

      return this.processGoalsData(processedData);
    } catch (error) {
      console.error('Error getting goals data:', error);
      return { goals: [], achievements: [] };
    }
  }

  // 목표 데이터 처리
  processGoalsData(data) {
    return data.map(record => ({
      period: record['기간'] || record['Period'],
      goal: parseFloat(record['목표'] || record['Goal'] || 0),
      achievement: parseFloat(record['실적'] || record['Achievement'] || 0),
      percentage: parseFloat(record['달성률'] || record['Percentage'] || 0)
    }));
  }
}

// 싱글톤 인스턴스 생성
let instance = null;

module.exports = {
  getGoogleSheetsService: () => {
    if (!instance) {
      instance = new GoogleSheetsService();
    }
    return instance;
  }
};