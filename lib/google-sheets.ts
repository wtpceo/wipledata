import { google } from 'googleapis'

// Google Sheets 인증 클라이언트 생성
export function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return auth
}

// Google Sheets 클라이언트 생성
export async function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  return sheets
}

// 스프레드시트 데이터 읽기
export async function readFromSheet(range: string) {
  try {
    const sheets = await getGoogleSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range,
    })

    return response.data.values || []
  } catch (error) {
    console.error('Error reading from sheet:', error)
    throw error
  }
}

// 스프레드시트에 데이터 쓰기 (다음 빈 행에 추가)
export async function writeToSheet(range: string, values: any[][]) {
  try {
    const sheets = await getGoogleSheetsClient()

    // 시트명과 범위 추출
    const [sheetName] = range.split('!')

    // 현재 데이터의 마지막 행 찾기
    const existingData = await readFromSheet(`${sheetName}!A:A`)
    const nextRow = existingData.length + 1

    // 열 범위 추출 (예: A:T에서 T 추출)
    const columnRange = range.split('!')[1]

    // 다음 행에 정확하게 쓰기
    const targetRange = `${sheetName}!${columnRange.split(':')[0]}${nextRow}:${columnRange.split(':')[1]}${nextRow}`

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    })

    return response.data
  } catch (error) {
    console.error('Error writing to sheet:', error)
    throw error
  }
}

// 스프레드시트 데이터 업데이트
export async function updateSheet(range: string, values: any[][]) {
  try {
    const sheets = await getGoogleSheetsClient()
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    })

    return response.data
  } catch (error) {
    console.error('Error updating sheet:', error)
    throw error
  }
}

// 스프레드시트 데이터 삭제 (특정 행)
export async function deleteFromSheet(sheetName: string, rowIndex: number) {
  try {
    const sheets = await getGoogleSheetsClient()

    // 먼저 시트 정보를 가져와서 시트 ID를 얻습니다
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    })

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    )

    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet ${sheetName} not found`)
    }

    // 행 삭제 요청
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based index
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    })

    return response.data
  } catch (error) {
    console.error('Error deleting from sheet:', error)
    throw error
  }
}

// Sheet 이름 상수
export const SHEETS = {
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  EXPENSES: 'Expenses',
  CLIENTS: 'Clients',
  STAFF: 'Staff',
  SETTINGS: 'Settings',
  GOALS: 'Goals',
} as const