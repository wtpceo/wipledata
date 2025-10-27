import { NextResponse } from 'next/server';
import { getGoogleSheetsService } from '@/services/googleSheets';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';

    // 환경 변수에서 스프레드시트 ID 가져오기
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID not configured' },
        { status: 500 }
      );
    }

    const sheetsService = getGoogleSheetsService();
    let data;

    switch (type) {
      case 'sales':
        data = await sheetsService.getSalesData(spreadsheetId);
        break;
      case 'goals':
        data = await sheetsService.getGoalsData(spreadsheetId);
        break;
      case 'raw':
        // 원시 데이터 가져오기
        const range = searchParams.get('range') || 'Sheet1!A1:Z100';
        data = await sheetsService.getSheetData(spreadsheetId, range);
        break;
      default:
        data = await sheetsService.getSalesData(spreadsheetId);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}