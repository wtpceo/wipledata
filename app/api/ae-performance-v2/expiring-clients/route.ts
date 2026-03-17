import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

// 👇 [필수] 캐시 무력화를 위한 강제 동적 설정
export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 인바운드 포지션 AE (연장율 추적 제외, 매출 통계만 표시)
const INBOUND_AES = new Set(['박한제'])

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
    let cleaned = dateStr.trim()

    // 물결표(~) 접두사 제거: "~2025.03.15" → "2025.03.15"
    cleaned = cleaned.replace(/^~/, '')

    // 범위 형식에서 종료일(뒤쪽) 추출: "2025.03.15~2025.09.15" → "2025.09.15"
    if (cleaned.includes('~')) {
      cleaned = cleaned.split('~').pop()!.trim()
    }

    // 공백 제거: "2026. 3. 14" → "2026.3.14"
    cleaned = cleaned.replace(/\s/g, '')

    // 끝에 붙은 점 제거: "2026.3.14." → "2026.3.14"
    cleaned = cleaned.replace(/\.$/, '')

    // ISO 형식
    if (cleaned.includes('T')) {
      const d = new Date(cleaned)
      return isNaN(d.getTime()) ? null : d
    }
    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(cleaned)) {
      const [year, month, day] = cleaned.split('.')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    // YYYY-MM-DD 형식 (명시적 처리)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
      const [year, month, day] = cleaned.split('-')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    // MM/DD/YYYY 형식
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/')
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
      }
    }
    // 폴백
    const fallback = new Date(cleaned)
    return isNaN(fallback.getTime()) ? null : fallback
  } catch {
    return null
  }
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
      range: 'Clients!A:G',
    })
    const clientsRows = clientsRes.data.values || []
    const [_, ...dataRows] = clientsRows // 헤더 제외

    // (B) 원본데이터 시트 (실제 연장 확인용)
    const rawData = await readFromSheet('원본데이터!A2:T')

    // 3. 원본데이터 파싱 (이번 달 매출 및 연장 건 확인)
    const salesMap = new Map<string, { count: number, amount: number, renewedClients: any[] }>() // AE별 매출 통계
    const renewalSuccessSet = new Set<string>() // 연장 성공한 업체명 목록 (AE:ClientName 조합)
    const allSalesClientsSet = new Set<string>() // 모든 매출 입력 업체 (AE:ClientName 조합) - 분모용

    rawData.forEach(row => {
      const department = row[1] || ''
      if (department === '영업부') return // 영업부 제외 - 내무부만 통계에 포함
      const aeName = normalizeStaffName(row[2] || '')
      const salesType = row[3] || ''
      const clientName = (row[4] || '').trim()
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
      const paymentMethod = row[8] || ''
      const totalAmount = paymentMethod === '입금예정' ? 0 : contractAmount // 내무부는 외주비 차감 없음

      // 날짜 확인 (내무부: A열 타임스탬프 기준)
      let isTargetMonth = false
      const date = parseDate(row[0] || '')
      if (date && date.getMonth() === targetMonth && date.getFullYear() === targetYear) isTargetMonth = true

      if (isTargetMonth) {
        // 매출 집계
        if (!salesMap.has(aeName)) salesMap.set(aeName, { count: 0, amount: 0, renewedClients: [] })
        const stat = salesMap.get(aeName)!
        stat.count += 1
        stat.amount += totalAmount

        // 모든 매출 입력 건을 분모에 포함
        if (clientName) {
          allSalesClientsSet.add(`${aeName}:${clientName}`)
        }

        // [핵심] 연장 성공 건 식별 (분자 계산용: 연장, 재계약, 소개만)
        if (salesType.includes('연장') || salesType.includes('재계약') || salesType.includes('소개')) {
          renewalSuccessSet.add(`${aeName}:${clientName}`)
          stat.renewedClients.push({
            clientName,
            salesType,
            totalAmount,
            renewalMonths: parseInt(row[6] || '0', 10),
            productName: row[5] || '',
            contractDate: row[14] || '',
            contractEndDate: row[15] || '',
            inputDate: row[0] || ''
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
      if (status !== '진행') return
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
            isAddedBySuccess: false, // 원래 목록에 있던 놈
            marketingMedia: row[6] || ''
          })
        })
      }
    })

    // (B) [핵심] 모든 매출 입력 건을 분모에 강제 추가 (신규 포함)
    allSalesClientsSet.forEach(key => {
      const [aeName, clientName] = key.split(':')
      if (!aeTargetClientsMap.has(aeName)) aeTargetClientsMap.set(aeName, new Set())
      aeTargetClientsMap.get(aeName)!.add(clientName)
    })

    // (C) 연장 실패 건도 분모에 추가 (V1 로직 복원)
    const aeFailedMap = new Map<string, number>()
    dataRows.forEach(row => {
      if (row[0] !== '연장 실패') return
      const clientName = (row[1] || '').trim()
      const endDateStr = row[4] || ''
      const aeString = row[5] || ''
      if (!endDateStr || !clientName) return

      const endDate = parseDate(endDateStr)
      if (!endDate) return

      if (endDate.getMonth() === targetMonth && endDate.getFullYear() === targetYear) {
        const aeNames = extractAEName(aeString)
        aeNames.forEach(aeName => {
          // 분모에 추가
          if (!aeTargetClientsMap.has(aeName)) aeTargetClientsMap.set(aeName, new Set())
          aeTargetClientsMap.get(aeName)!.add(clientName)

          // 실패 건수 집계
          aeFailedMap.set(aeName, (aeFailedMap.get(aeName) || 0) + 1)
        })
      }
    })

    // expiringClientsList 날짜 오름차순(빠른 종료일 순)으로 정렬
    expiringClientsList.sort((a, b) => {
      const dateA = parseDate(a.endDate)?.getTime() || 0;
      const dateB = parseDate(b.endDate)?.getTime() || 0;
      return dateA - dateB;
    });

    // 5. 최종 통계 산출 (Rankings)
    // AE별 연장 성공 고유 업체 수 집계 (분자)
    const aeRenewalCount = new Map<string, number>()
    renewalSuccessSet.forEach(key => {
      const aeName = key.split(':')[0]
      aeRenewalCount.set(aeName, (aeRenewalCount.get(aeName) || 0) + 1)
    })

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
      const salesStat = salesMap.get(aeName) || { count: 0, amount: 0, renewedClients: [] }
      const isInbound = INBOUND_AES.has(aeName)

      // 인바운드 AE는 연장율 추적 제외 (매출 통계만)
      const targetSet = isInbound ? new Set<string>() : (aeTargetClientsMap.get(aeName) || new Set())
      const expiringCount = targetSet.size
      const renewalCount = isInbound ? 0 : (aeRenewalCount.get(aeName) || 0)
      const failedCount = isInbound ? 0 : (aeFailedMap.get(aeName) || 0)

      return {
        aeName,
        totalClients: aeTotalClientsMap.get(aeName) || 0,
        expiringClients: expiringCount,
        renewedClients: renewalCount,
        failedClients: failedCount,
        pendingClients: Math.max(0, expiringCount - renewalCount - failedCount),
        totalRenewalAmount: salesStat.amount,
        renewedClientsDetails: salesStat.renewedClients || [],
        renewalRate: expiringCount > 0
          ? Math.min(100, Math.round((renewalCount / expiringCount) * 100))
          : 0
      }
    }).sort((a, b) => b.expiringClients - a.expiringClients)

    return NextResponse.json({
      expiringClients: expiringClientsList, // 정렬된 화면 팝업용 목록
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