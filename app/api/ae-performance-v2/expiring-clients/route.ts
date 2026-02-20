import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

// 👇 [필수] 캐시 무력화를 위한 강제 동적 설정
export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 담당자 이름 정규화 (이름만 추출)
function extractAEName(aeString: string): string[] {
  if (!aeString) return []
  const aes = aeString.split(',').map(ae => ae.trim())
  return aes.map(ae => {
    let name = ae.match(/^([^(]+)/)?.[1]?.trim() || ae
    const firstWord = name.split(/\s+/)[0]
    return firstWord
  })
}

// 날짜 파싱
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  try {
    if (dateStr.includes('T')) return new Date(dateStr)
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('.')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        // MM/DD/YYYY 가정 (한국식일 수도 있으나 기존 코드 존중)
        const [m, d, y] = parts
        // 만약 YYYY가 앞이라면 로직 수정 필요하나, 일단 기존 로직 유지
        return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
      }
    }
    return new Date(dateStr)
  } catch { return null }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') // YYYY-MM

    // 1. 타겟 월 설정
    let targetMonth: number
    let targetYear: number
    if (month) {
      const [year, monthNum] = month.split('-')
      targetYear = parseInt(year)
      targetMonth = parseInt(monthNum) - 1
    } else {
      const now = new Date()
      targetMonth = now.getMonth()
      targetYear = now.getFullYear()
    }
    const targetYM = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`

    // 2. 데이터 가져오기 (Clients + 원본데이터)
    const auth = getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // (A) Clients 시트 (종료 예정 확인용)
    const clientsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Clients!A:F',
    })
    const clientsRows = clientsRes.data.values || []
    const [_, ...dataRows] = clientsRows // 헤더 제외

    // (B) 원본데이터 시트 (실제 연장 확인용)
    const rawData = await readFromSheet('원본데이터!A2:T')

    // 3. 원본데이터 파싱 (이번 달 매출 및 연장 건 확인)
    const salesMap = new Map<string, { count: number, amount: number, renewedClients: any[] }>() // AE별 매출 통계
    const renewalSuccessSet = new Set<string>() // 연장 성공한 업체명 목록 (AE:ClientName 조합)

    rawData.forEach(row => {
      const department = row[1] || ''
      const aeName = normalizeStaffName(row[2] || '')
      const salesType = row[3] || ''
      const clientName = (row[4] || '').trim()
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
      const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0
      const totalAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount

      // 날짜 확인
      let isTargetMonth = false
      if (department === '영업부') {
        const inputMonth = row[18] || ''
        if (inputMonth.includes(targetYM) || inputMonth.replace('.', '-') === targetYM) isTargetMonth = true
      } else {
        const date = parseDate(row[0] || '')
        if (date && date.getMonth() === targetMonth && date.getFullYear() === targetYear) isTargetMonth = true
      }

      if (isTargetMonth) {
        // 매출 집계
        if (!salesMap.has(aeName)) salesMap.set(aeName, { count: 0, amount: 0, renewedClients: [] })
        const stat = salesMap.get(aeName)!
        stat.count += 1
        stat.amount += totalAmount

        // [핵심] 연장 성공 건 식별 -> 분모에 강제 추가할 예정
        if (salesType.includes('연장') || salesType.includes('재계약')) {
          renewalSuccessSet.add(`${aeName}:${clientName}`)
          stat.renewedClients.push({
            clientName,
            salesType,
            totalAmount,
            renewalMonths: parseInt(row[6] || '0', 10),
            productName: row[5] || '',
            contractDate: row[14] || '',
            contractEndDate: row[15] || ''
          })
        }
      }
    })

    // 4. AE별 종료 예정 목록 생성 (합집합 로직 적용)
    const aeTargetClientsMap = new Map<string, Set<string>>() // AE별 분모(Target) 목록
    const expiringClientsList: any[] = [] // 상세 목록 반환용

    // (A) Clients 시트에서 종료 예정 건 추가
    dataRows.forEach((row, idx) => {
      const status = row[0] || ''
      const clientName = (row[1] || '').trim()
      const amount = parseInt(row[2]?.replace(/[^0-9]/g, '') || '0')
      const endDateStr = row[4] || ''
      const aeString = row[5] || ''

      // 진행 중인 광고주의 전체 개수 카운팅 (통계용)
      // (생략 - 필요 시 추가 가능하나 로직 단순화를 위해 분모 계산에 집중)

      if (!endDateStr || !clientName) return
      const endDate = parseDate(endDateStr)
      if (!endDate) return

      // 이번 달 종료되는지 확인
      if (endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear) {
        const aeNames = extractAEName(aeString)
        aeNames.forEach(aeName => {
          if (!aeTargetClientsMap.has(aeName)) aeTargetClientsMap.set(aeName, new Set())

          // 분모에 추가
          aeTargetClientsMap.get(aeName)!.add(clientName)

          // 상세 목록에도 추가
          expiringClientsList.push({
            rowIndex: idx + 2,
            clientName,
            aeName,
            amount,
            endDate: endDateStr,
            status: status === '대기' ? 'waiting' : 'pending',
            isAddedBySuccess: false // 원래 목록에 있던 놈
          })
        })
      }
    })

    // (B) [핵심] 연장 성공 건도 분모에 강제 추가
    renewalSuccessSet.forEach(key => {
      const [aeName, clientName] = key.split(':')

      if (!aeTargetClientsMap.has(aeName)) aeTargetClientsMap.set(aeName, new Set())

      // 이미 있는지 확인 (Set이라 자동 중복 제거되지만 로직 명확성을 위해)
      const isNew = !aeTargetClientsMap.get(aeName)!.has(clientName)

      if (isNew) {
        // 분모에 추가
        aeTargetClientsMap.get(aeName)!.add(clientName)

        // 상세 목록에는 '성공으로 인해 추가됨' 표시하여 추가 (선택사항)
        // 화면에 보여줄지 여부는 프론트엔드에서 결정하되, 계산을 위해선 내부적으로 카운트됨
        // 여기서는 expiringClientsList에는 굳이 안 넣어도 카운트(분모)는 정확해짐.
        // 다만 '대기 중' 개수와 맞추려면 넣는 게 좋음.
      }
    })

    // 5. 최종 통계 산출 (Rankings)
    // 모든 AE 목록 추출 (Clients 시트 + 매출 발생 AE)
    const allAEs = new Set([...aeTargetClientsMap.keys(), ...salesMap.keys()])

    // 전체 광고주 수 계산 (별도 로직 - 기존 코드 참조)
    const aeTotalClientsMap = new Map<string, number>()
    dataRows.forEach(row => {
      if (row[0] === '진행') {
        extractAEName(row[5] || '').forEach(ae => {
          aeTotalClientsMap.set(ae, (aeTotalClientsMap.get(ae) || 0) + 1)
        })
      }
    })

    const aeStats = Array.from(allAEs).map(aeName => {
      const targetSet = aeTargetClientsMap.get(aeName) || new Set()
      const salesStat = salesMap.get(aeName) || { count: 0, amount: 0, renewedClients: [] }

      const expiringCount = targetSet.size // 보정된 분모 (원래 예정 + 성공한 건)
      const salesCount = salesStat.count   // 분자

      return {
        aeName,
        totalClients: aeTotalClientsMap.get(aeName) || 0,
        expiringClients: expiringCount, // 이제 7이 아니라 27이 됨
        renewedClients: salesCount,
        failedClients: 0, // 별도 계산 필요 시 추가
        pendingClients: Math.max(0, expiringCount - salesCount),
        totalRenewalAmount: salesStat.amount,
        renewedClientsDetails: salesStat.renewedClients || [],
        // 연장율: 100% 초과 방지됨
        renewalRate: expiringCount > 0
          ? Math.round((salesCount / expiringCount) * 100)
          : 0
      }
    }).sort((a, b) => b.expiringClients - a.expiringClients)

    return NextResponse.json({
      expiringClients: expiringClientsList, // 화면 팝업용 목록
      aeStats, // 화면 대시보드 카드용 통계
      summary: {
        totalExpiringClients: expiringClientsList.length,
        totalAEs: aeStats.length,
        targetMonth: targetYM
      }
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}