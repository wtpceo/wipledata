import { google } from 'googleapis'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
  privateKey = privateKey.replace(/\\n/g, '\n')
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ── 정규화 (1차: 괄호 제거) ──
function normalizeName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── 심층 정규화 (2차: 공백/특수문자 모두 제거, 소문자화) ──
function deepNormalize(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, '')  // 괄호 제거
    .replace(/^드림\)/g, '')         // "드림)" 접두사 제거
    .replace(/\s+/g, '')            // 모든 공백 제거
    .toLowerCase()
    .trim()
}

// ── 담당자 이름만 추출 ──
function extractManagerName(raw: string): string {
  // "김민우 " → "김민우", "이수빈 마케터" → "이수빈"
  const name = raw.trim().split(/\s+/)[0] || ''
  return name
}

async function main() {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

  // 1. 원본 CSV 읽기
  const csvPath = path.resolve(__dirname, '..', '0.업체 관리_20260224.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[]

  // 2. 매칭 실패 목록 읽기
  const unmatchedCsvPath = path.resolve(__dirname, '..', '매칭실패_업체목록.csv')
  const unmatchedContent = fs.readFileSync(unmatchedCsvPath, 'utf-8')
  const unmatchedRecords = parse(unmatchedContent, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[]
  const unmatchedNames = new Set(unmatchedRecords.map(r => (r['업체명'] || '').trim()))

  // 3. 현재 시트 데이터 읽기
  const sheetRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Clients!A2:G',
  })
  const sheetRows = (sheetRes.data.values || []) as string[][]

  // 시트 데이터를 심층 정규화명으로 인덱싱
  const sheetByDeepName = new Map<string, { rowIndex: number; clientName: string; endDate: string }[]>()
  sheetRows.forEach((row, idx) => {
    const clientName = (row[1] || '').trim()
    const deepName = deepNormalize(clientName)
    const endDate = (row[4] || '').trim()
    if (!deepName) return
    if (!sheetByDeepName.has(deepName)) sheetByDeepName.set(deepName, [])
    sheetByDeepName.get(deepName)!.push({ rowIndex: idx + 2, clientName, endDate })
  })

  // 4. 매칭 실패 건을 원본 CSV에서 찾아 심층 매칭
  const toUpdateEndDate: { csvName: string; sheetEntries: { rowIndex: number; clientName: string; endDate: string }[]; newEndDate: string }[] = []
  const toAddNew: string[][] = []

  for (const r of records) {
    const name = (r['업체명'] || '').trim()
    const status = (r['상태'] || '').trim()
    if (status !== '진행' || !unmatchedNames.has(name)) continue
    unmatchedNames.delete(name) // 중복 방지

    const endDate = (r['서비스 종료 일'] || '').trim()
    const deepName = deepNormalize(name)

    // 심층 매칭 시도
    const sheetEntries = sheetByDeepName.get(deepName)
    if (sheetEntries) {
      // 기존 행에서 종료일만 업데이트
      toUpdateEndDate.push({
        csvName: name,
        sheetEntries,
        newEndDate: endDate,
      })
    } else {
      // 정말 없는 업체 → 신규 추가
      toAddNew.push([
        '진행',
        name,
        (r['계약 금액'] || '').trim(),
        (r['서비스 시작 일'] || '').trim(),
        endDate,
        extractManagerName(r['마케팅 담당자'] || ''),
        (r['관리 서비스 항목'] || '').trim(),
      ])
    }
  }

  // 5. 보고서 출력
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  📋 심층 매칭 결과')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  🔄 기존 행 종료일 업데이트: ${toUpdateEndDate.length}건`)
  console.log(`  ➕ 신규 추가:               ${toAddNew.length}건`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (toUpdateEndDate.length > 0) {
    console.log('── 🔄 종료일 업데이트 (기존 행) ──')
    for (const item of toUpdateEndDate) {
      for (const e of item.sheetEntries) {
        console.log(`  [행${e.rowIndex}] "${e.clientName}" ← CSV "${item.csvName}" | ${e.endDate || '(없음)'} → ${item.newEndDate}`)
      }
    }
    console.log()
  }

  if (toAddNew.length > 0) {
    console.log('── ➕ 신규 추가 ──')
    for (const row of toAddNew) {
      console.log(`  ${row[1]} | ${row[4]} | 담당: ${row[5]} | 매체: ${row[6]}`)
    }
    console.log()
  }

  // 6. 실행
  const allBatchUpdates: { range: string; values: any[][] }[] = []

  // 종료일 업데이트
  for (const item of toUpdateEndDate) {
    for (const e of item.sheetEntries) {
      allBatchUpdates.push({
        range: `Clients!E${e.rowIndex}`,
        values: [[item.newEndDate]],
      })
      // 마케팅매체도 채우기 (빈 경우)
      const csvRecord = records.find(r => (r['업체명'] || '').trim() === item.csvName)
      const media = csvRecord ? (csvRecord['관리 서비스 항목'] || '').trim() : ''
      if (media) {
        allBatchUpdates.push({
          range: `Clients!G${e.rowIndex}`,
          values: [[media]],
        })
      }
    }
  }

  // 배치 업데이트 실행
  if (allBatchUpdates.length > 0) {
    console.log(`📝 기존 행 업데이트: ${allBatchUpdates.length}셀...`)
    const BATCH_SIZE = 100
    for (let i = 0; i < allBatchUpdates.length; i += BATCH_SIZE) {
      const batch = allBatchUpdates.slice(i, i + BATCH_SIZE)
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: batch.map(d => ({ range: d.range, values: d.values })),
        },
      })
    }
    console.log('  완료!\n')
  }

  // 신규 행 추가
  if (toAddNew.length > 0) {
    // 행 수 확인 & 확장
    const countRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Clients!A:A' })
    const lastRow = (countRes.data.values || []).length
    const startRow = lastRow + 1

    // 시트 확장 필요 시
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId })
    const clientsSheet = sheetMeta.data.sheets!.find(s => s.properties!.title === 'Clients')!
    const maxRows = clientsSheet.properties!.gridProperties!.rowCount!
    if (startRow + toAddNew.length > maxRows) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            appendDimension: {
              sheetId: clientsSheet.properties!.sheetId!,
              dimension: 'ROWS',
              length: toAddNew.length + 50,
            },
          }],
        },
      })
    }

    const range = `Clients!A${startRow}:G${startRow + toAddNew.length - 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: toAddNew },
    })
    console.log(`➕ ${toAddNew.length}건 신규 추가 완료! (행 ${startRow}~${startRow + toAddNew.length - 1})`)
  }

  console.log('\n🎉 완료!')
}

main().catch(err => {
  console.error('❌ 오류 발생:', err.message || err)
  process.exit(1)
})
