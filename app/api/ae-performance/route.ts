import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

// 👇 [필수] 캐시 무력화를 위한 강제 동적 설정 (V2에서 가져옴)
export const dynamic = 'force-dynamic'

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

// 날짜 파싱 함수
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    // ISO 형식
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }
    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('.')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    // MM/DD/YYYY 형식
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        // MM/DD/YYYY 가정 (한국식일 수도 있으나 기존 코드 존중)
        // MM/DD/YYYY 순서로 파싱
        return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
      }
    }
    // YYYY-MM-DD 형식
    return new Date(dateStr)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') // YYYY-MM 형식

    // 타겟 월이 지정되지 않은 경우 최근 12개월 데이터를 가져올 수 있도록 로직 수정 필요
    // 하지만 현재 클라이언트 구조상 '최신 월'을 자동으로 선택하거나 전체를 가져와서 필터링함.
    // 여기서는 모든 데이터를 가져와서 월별로 그룹화하는 기존 로직을 유지하면서,
    // *분모(종료예정)* 계산 시에만 V2 로직을 월별로 적용합니다.

    // 1. 데이터 가져오기 (Clients + 원본데이터)
    // 원본데이터: 연장 성공(분자) 및 매출 확인용
    const rawData = await readFromSheet('원본데이터!A2:AF')

    // Clients: 종료 예정(분모1) 및 연장 실패(분모2) 확인용
    const clientsRes = await readFromSheet('clients!A:F')
    const [, ...clientsRows] = clientsRes

    // 2. 원본데이터 파싱 (모든 매출)
    const allSales = rawData
      .map(row => {
        const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0 // H열: 총계약금액
        const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0 // K열: 확정 외주비
        const department = row[1] || '' // B열: 부서
        const aeName = normalizeStaffName(row[2] || '') // C열: 담당자
        const salesType = row[3] || '' // D열: 매출 유형
        const clientName = (row[4] || '').trim() // E열: 광고주명
        const paymentMethod = row[8] || '' // I열: 결제방식
        const paymentCompletedDate = row[31] || '' // AF열: 입금완료 날짜

        // 입금예정인 경우 금액 0으로 처리 (입금완료 전까지 실적 미반영)
        const isPaymentPending = paymentMethod === '입금예정'

        // 영업부는 총계약금액 - 외주비, 나머지는 총계약금액
        const calculatedAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount
        const actualAmount = isPaymentPending ? 0 : calculatedAmount

        // 날짜 파싱 (월별 그룹화를 위해)
        let saleMonth: string | null = null

        // 입금완료 건은 paymentCompletedDate 기준으로 월 판단
        if ((paymentMethod === '입금완료' || paymentMethod === '입금확인') && paymentCompletedDate) {
          saleMonth = paymentCompletedDate.substring(0, 7)
        }
        // 영업부는 S열(inputYearMonth) 사용
        else if (department === '영업부') {
          const inputMonth = row[18] || ''
          if (inputMonth) {
            if (inputMonth.includes('-')) {
              saleMonth = inputMonth
            } else if (inputMonth.includes('.')) {
              saleMonth = inputMonth.replace('.', '-')
            } else if (inputMonth.length <= 2) {
              const currentYear = new Date().getFullYear()
              saleMonth = `${currentYear}-${inputMonth.padStart(2, '0')}`
            } else if (inputMonth.length === 6) {
              const year = inputMonth.substring(0, 4)
              const mon = inputMonth.substring(4, 6)
              saleMonth = `${year}-${mon}`
            }
          }
        } else {
          // 내무부은 A열(timestamp) 사용
          const timestamp = row[0] || ''
          const saleDate = parseDate(timestamp)
          if (saleDate && !isNaN(saleDate.getTime())) {
            saleMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`
          }
        }

        return {
          department,
          aeName,
          salesType,
          clientName,
          totalAmount: actualAmount,
          saleMonth,
          isRenewal: salesType.includes('연장') || salesType.includes('재계약')
        }
      })
      .filter(sale => sale.saleMonth) // 날짜 파싱 실패한 건 제외

    // 3. 월별 데이터 그룹화
    // V2 로직의 핵심: 각 월별로 (종료예정 U 연장성공) 집합을 구해야 함.

    // 모든 월 목록 수집 (매출 발생 월 + 종료 예정 월)
    const allMonths = new Set<string>()
    allSales.forEach(s => s.saleMonth && allMonths.add(s.saleMonth))

    // Clients 시트에서 종료 월 수집
    clientsRows.forEach(row => {
      const endDateStr = row[4] || ''
      const endDate = parseDate(endDateStr)
      if (endDate) {
        const endMonth = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
        allMonths.add(endMonth)
      }
    })

    const monthlyStats = Array.from(allMonths)
      .sort((a, b) => b.localeCompare(a)) // 최신 월부터
      .map(targetYM => {
        const [tYear, tMonth] = targetYM.split('-').map(Number)

        // 3-1. 해당 월의 매출 데이터 (분자 및 매출액)
        const monthSales = allSales.filter(s => s.saleMonth === targetYM)

        // AE별 매출 집계
        const aeSalesMap = new Map<string, { count: number, amount: number, renewedClients: Set<string> }>()

        monthSales.forEach(sale => {
          if (!aeSalesMap.has(sale.aeName)) {
            aeSalesMap.set(sale.aeName, { count: 0, amount: 0, renewedClients: new Set() })
          }
          const stat = aeSalesMap.get(sale.aeName)!

          if (sale.isRenewal) {
            stat.count += 1
            stat.amount += sale.totalAmount
            stat.renewedClients.add(sale.clientName)
          } else {
            // 신규 매출도 매출액에는 포함 (연장률 계산에는 제외되더라도 총 매출에는 포함)
            // 기존 V1 로직에서는 '총 매출'은 구분 없이 다 보여줬음.
            // 하지만 Renewal Rate 계산 시에는 '연장' 건만 분자로 씀.
            // 여기서는 'renewalRevenue'라고 명시되어 있으므로 연장 건만 합산하는 게 맞음.
            // 다만 'Total Revenue' 카드에는 전체 매출이 들어가는 게 일반적이나,
            // 기존 V1 로직을 보면 `renewalRevenue += sale.totalAmount`로 모든 매출을 더하고 있었음 (필터링 없이).
            // V2 로직에서는 정확히 연장 건만 따졌음. 
            // V1의 'Renewal Revenue' 의미를 유지하기 위해 모든 매출을 더하되,
            // 'Renewed Clients' 카운트는 연장 건만 세는 것으로 수정 (기존 V1은 모든 건을 셌음 -> 버그였을 가능성 높음)

            // **수정**: V1 기존 로직은 `aeMonthPerformances` 생성 시 모든 매출을 `renewedClients`로 카운트했음.
            // 이는 '연장 실적 대시보드'라는 이름과 맞지 않음.
            // V2 로직을 따르기로 했으므로, '연장' 건만 `Renewed`로 카운트하고, 매출도 연장 매출만 집계하는 것이 정확함.
            // 단, `Total Clients`(담당 광고주) 계산은 전체를 대상으로 함.
          }
        })

        // 3-2. 해당 월의 종료 예정 데이터 (분모)
        const aeTargetClientsMap = new Map<string, Set<string>>()

        // (A) Clients 시트에서 해당 월 종료 예정 찾기
        clientsRows.forEach(row => {
          const clientName = (row[1] || '').trim()
          const endDateStr = row[4] || ''
          const aeString = row[5] || ''

          if (!endDateStr || !clientName) return
          const endDate = parseDate(endDateStr)
          if (!endDate) return

          if (endDate.getMonth() === tMonth - 1 && endDate.getFullYear() === tYear) {
            const aeNames = extractAEName(aeString)
            aeNames.forEach(aeName => {
              const normalizedAE = normalizeStaffName(aeName)
              if (!aeTargetClientsMap.has(normalizedAE)) aeTargetClientsMap.set(normalizedAE, new Set())
              aeTargetClientsMap.get(normalizedAE)!.add(clientName)
            })
          }
        })

        // (B) 원본데이터에서 연장 성공한 건도 분모에 강제 추가 (V2 핵심 로직)
        monthSales.forEach(sale => {
          if (sale.isRenewal) {
            if (!aeTargetClientsMap.has(sale.aeName)) aeTargetClientsMap.set(sale.aeName, new Set())
            aeTargetClientsMap.get(sale.aeName)!.add(sale.clientName)
          }
        })

        // (C) 연장 실패 건 추가
        // 종료일이 해당 월인 경우에만 연장 실패로 집계
        const aeFailedMap = new Map<string, number>()
        clientsRows.forEach(row => {
          if (row[0] === '연장 실패') {
            const endDateStr = row[4] || ''
            const aeString = row[5] || ''
            const endDate = parseDate(endDateStr)

            if (endDate && endDate.getMonth() === tMonth - 1 && endDate.getFullYear() === tYear) {
              const aeNames = extractAEName(aeString)
              aeNames.forEach(aeName => {
                const normalizedAE = normalizeStaffName(aeName)
                if (!aeFailedMap.has(normalizedAE)) aeFailedMap.set(normalizedAE, 0)
                aeFailedMap.set(normalizedAE, aeFailedMap.get(normalizedAE)! + 1)
              })
            }
          }
        })

        // 3-3. AE별 통계 취합
        const allAEs = new Set([...aeTargetClientsMap.keys(), ...aeSalesMap.keys()])

        // 전체 담당 광고주 수 (진행 중) -> 이건 월별로 변하지 않는 현재 상태값임 (기존 V1 유지)
        const aeTotalClientsCurrentMap = new Map<string, number>()
        clientsRows.forEach(row => {
          if (row[0] === '진행') {
            extractAEName(row[5] || '').forEach(ae => {
              const normalizedAE = normalizeStaffName(ae)
              aeTotalClientsCurrentMap.set(normalizedAE, (aeTotalClientsCurrentMap.get(normalizedAE) || 0) + 1)
            })
          }
        })

        const performances = Array.from(allAEs).map(aeName => {
          const targetSet = aeTargetClientsMap.get(aeName) || new Set()
          const salesStat = aeSalesMap.get(aeName) || { count: 0, amount: 0, renewedClients: new Set() }

          const expiringClients = targetSet.size
          const renewedClients = salesStat.renewedClients.size // 연장 성공 고유 광고주 수
          const failedRenewals = aeFailedMap.get(aeName) || 0

          // 연장률 계산: 성공 / 대상 (100% 초과 방지)
          const renewalRate = expiringClients > 0
            ? Math.min(100, Math.round((renewedClients / expiringClients) * 100 * 10) / 10)
            : 0

          // 부서 정보 찾기 (해당 월 매출 발생 부서 우선, 없으면 Clients 시트 등에서 찾아야 하나 여기선 매출 데이터 기반)
          const department = monthSales.find(s => s.aeName === aeName)?.department || ''

          return {
            aeName,
            department,
            totalClients: aeTotalClientsCurrentMap.get(aeName) || 0,
            expiringClients,
            renewedClients,
            failedRenewals,
            renewalRate,
            renewalRevenue: salesStat.amount
          }
        }).filter(p => p.expiringClients > 0 || p.renewedClients > 0) // 실적이 있거나 예정이 있는 경우만
          .sort((a, b) => b.renewalRevenue - a.renewalRevenue)

        // 월별 합계
        return {
          month: targetYM,
          totalAEs: performances.length,
          totalClients: performances.reduce((sum, p) => sum + p.totalClients, 0),
          totalExpiring: performances.reduce((sum, p) => sum + p.expiringClients, 0),
          totalRenewed: performances.reduce((sum, p) => sum + p.renewedClients, 0),
          totalFailed: performances.reduce((sum, p) => sum + p.failedRenewals, 0),
          totalRevenue: performances.reduce((sum, p) => sum + p.renewalRevenue, 0),
          renewalRate: performances.reduce((sum, p) => sum + p.expiringClients, 0) > 0
            ? Math.round((performances.reduce((sum, p) => sum + p.renewedClients, 0) / performances.reduce((sum, p) => sum + p.expiringClients, 0)) * 100 * 10) / 10
            : 0,
          performances
        }
      })
      .filter(stat => stat.performances.length > 0)

    // 4. 응답 데이터 구성
    const targetMonthStats = month
      ? monthlyStats.find(m => m.month === month) || monthlyStats[0]
      : monthlyStats[0]

    let aeRankings: any[] = []
    let departmentStats: any[] = []

    if (targetMonthStats) {
      aeRankings = targetMonthStats.performances

      // 부서별 통계
      const deptMap = new Map<string, any>()
      targetMonthStats.performances.forEach((perf: any) => {
        if (!perf.department) return

        if (!deptMap.has(perf.department)) {
          deptMap.set(perf.department, {
            department: perf.department,
            totalAEs: new Set(),
            totalClients: 0,
            renewedClients: 0,
            failedRenewals: 0,
            renewalRevenue: 0,
            expiringClients: 0
          })
        }
        const dept = deptMap.get(perf.department)!
        dept.totalAEs.add(perf.aeName)
        dept.totalClients += perf.totalClients
        dept.renewedClients += perf.renewedClients
        dept.failedRenewals += perf.failedRenewals
        dept.renewalRevenue += perf.renewalRevenue
        dept.expiringClients += perf.expiringClients
      })

      departmentStats = Array.from(deptMap.values())
        .map(dept => ({
          department: dept.department,
          totalAEs: dept.totalAEs.size,
          totalClients: dept.totalClients,
          renewalRate: dept.expiringClients > 0
            ? Math.round((dept.renewedClients / dept.expiringClients) * 100 * 10) / 10
            : 0,
          renewedClients: dept.renewedClients,
          failedRenewals: dept.failedRenewals,
          renewalRevenue: dept.renewalRevenue
        }))
        .sort((a, b) => b.renewalRevenue - a.renewalRevenue)
    }

    return NextResponse.json({
      monthlyStats,
      aeRankings,
      departmentStats,
      totalStats: {
        totalMonths: monthlyStats.length,
        averageRenewalRate: monthlyStats.length > 0
          ? Math.round((monthlyStats.reduce((sum, m) => sum + m.renewalRate, 0) / monthlyStats.length) * 10) / 10
          : 0
      }
    })

  } catch (error) {
    console.error('Error fetching AE performance data:', error)
    return NextResponse.json(
      { error: '데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, performances, timestamp } = body

    if (!month || !performances || !Array.isArray(performances)) {
      throw new Error('잘못된 요청 데이터입니다: 월 또는 실적 데이터가 누락되었습니다.')
    }

    // Google Sheets에 저장할 데이터 준비
    const dataToSave = performances.map((perf: any) => [
      timestamp,
      month,
      perf.department || '',
      perf.aeName || '',
      perf.totalClients || 0,
      perf.expiringClients || 0,
      perf.renewedClients || 0,
      perf.failedRenewals || 0,
      perf.failureReasons || '',
      perf.renewalRevenue || 0,
      perf.notes || ''
    ])

    // Google Sheets에 데이터 저장
    await writeToSheet('AEPerformance!A:K', dataToSave)

    return NextResponse.json({
      success: true,
      message: 'AE 실적 데이터가 저장되었습니다.',
      count: dataToSave.length
    })
  } catch (error) {
    console.error('Error saving AE performance data:', error)
    return NextResponse.json(
      {
        error: '데이터 저장에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}