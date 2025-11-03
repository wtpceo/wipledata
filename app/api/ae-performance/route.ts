import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

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
        const [m, d, y] = parts
        return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
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

    // 원본데이터에서 연장 실적 데이터 읽기
    const rawData = await readFromSheet('원본데이터!A2:T')

    // Clients 탭에서 전체 광고주 및 연장 실패 데이터 읽기
    const clientsData = await readFromSheet('clients!A:F')

    // 원본데이터에서 연장 매출 파싱 (D열 = '연장')
    const renewalSales = rawData
      .filter(row => row[3] === '연장') // D열: 매출 유형
      .map(row => {
        const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0 // H열: 총계약금액
        const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0 // K열: 확정 외주비
        const department = row[1] || '' // B열: 부서

        // 영업부는 총계약금액 - 외주비, 나머지는 총계약금액
        const actualAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount

        return {
          timestamp: row[0] || '', // A열: 타임스탬프
          department: department,
          aeName: normalizeStaffName(row[2] || ''), // C열: 담당자 (정규화)
          salesType: row[3] || '', // D열: 매출 유형
          clientName: row[4] || '', // E열: 광고주명
          totalAmount: actualAmount,
        }
      })

    console.log('=== AE Performance Debug ===')
    console.log('Total renewal sales found:', renewalSales.length)
    if (renewalSales.length > 0) {
      console.log('Sample renewal (first 3):')
      renewalSales.slice(0, 3).forEach((sale, idx) => {
        console.log(`  ${idx + 1}. AE: ${sale.aeName}, Timestamp: ${sale.timestamp}, Amount: ${sale.totalAmount}`)
      })
    }

    // 원본데이터에서 연장 성공을 월별로 그룹화
    const renewalsByMonth = new Map<string, any[]>()
    let parsedCount = 0
    let failedCount = 0

    renewalSales.forEach(sale => {
      if (!sale.timestamp) {
        failedCount++
        return
      }

      const saleDate = parseDate(sale.timestamp)
      if (!saleDate || isNaN(saleDate.getTime())) {
        console.log('Failed to parse timestamp:', sale.timestamp)
        failedCount++
        return
      }

      parsedCount++
      const saleMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`

      if (!renewalsByMonth.has(saleMonth)) {
        renewalsByMonth.set(saleMonth, [])
      }
      renewalsByMonth.get(saleMonth)!.push(sale)
    })

    console.log('Timestamp parsing results:')
    console.log('  Successfully parsed:', parsedCount)
    console.log('  Failed to parse:', failedCount)
    console.log('  Months with renewals:', Array.from(renewalsByMonth.keys()).sort())
    renewalsByMonth.forEach((sales, month) => {
      console.log(`  ${month}: ${sales.length} renewals`)
    })

    // Clients 탭에서 전체 광고주와 연장 실패 파싱
    const [clientsHeaders, ...clientsRows] = clientsData

    // 진행 중인 광고주로 AE별 총 광고주 수 계산
    const aeTotalClientsMap = new Map<string, Set<string>>()
    clientsRows.forEach(row => {
      const status = row[0] || ''
      const clientName = row[1] || ''
      const aeString = row[2] || ''

      if (status === '진행' && clientName && aeString) {
        const aeName = normalizeStaffName(aeString)
        if (!aeTotalClientsMap.has(aeName)) {
          aeTotalClientsMap.set(aeName, new Set())
        }
        aeTotalClientsMap.get(aeName)!.add(clientName)
      }
    })

    // 연장 실패 데이터
    const failedRenewals = clientsRows
      .filter(row => row[0] === '연장 실패')
      .map(row => ({
        clientName: row[1] || '',
        ae: normalizeStaffName(row[2] || ''),
      }))

    // 월별 통계 생성
    const monthlyStats = Array.from(renewalsByMonth.keys())
      .sort((a, b) => b.localeCompare(a)) // 최신 월부터
      .map(month => {
        const monthRenewals = renewalsByMonth.get(month) || []

        // 해당 월의 AE별 실적
        const aeMonthPerformances = new Map<string, any>()

        monthRenewals.forEach(sale => {
          if (!aeMonthPerformances.has(sale.aeName)) {
            const totalClients = aeTotalClientsMap.get(sale.aeName)?.size || 0
            aeMonthPerformances.set(sale.aeName, {
              aeName: sale.aeName,
              department: sale.department,
              totalClients: totalClients,
              expiringClients: 0, // 종료 예정은 현재 시스템에서 추적하지 않음
              renewedClients: 0,
              failedRenewals: 0,
              renewalRevenue: 0
            })
          }
          const perf = aeMonthPerformances.get(sale.aeName)!
          perf.renewedClients += 1
          perf.renewalRevenue += sale.totalAmount
        })

        // 연장 실패 추가
        failedRenewals.forEach(failure => {
          if (!aeMonthPerformances.has(failure.ae)) {
            const totalClients = aeTotalClientsMap.get(failure.ae)?.size || 0
            aeMonthPerformances.set(failure.ae, {
              aeName: failure.ae,
              department: '',
              totalClients: totalClients,
              expiringClients: 0,
              renewedClients: 0,
              failedRenewals: 0,
              renewalRevenue: 0
            })
          }
          const perf = aeMonthPerformances.get(failure.ae)!
          perf.failedRenewals += 1
        })

        const performances = Array.from(aeMonthPerformances.values())
        const totalRenewed = performances.reduce((sum, p) => sum + p.renewedClients, 0)
        const totalFailed = performances.reduce((sum, p) => sum + p.failedRenewals, 0)
        const totalExpiring = totalRenewed + totalFailed
        const renewalRate = totalExpiring > 0 ? Math.round((totalRenewed / totalExpiring) * 100 * 10) / 10 : 0

        return {
          month,
          totalAEs: performances.length,
          totalClients: performances.reduce((sum, p) => sum + p.totalClients, 0),
          totalExpiring,
          totalRenewed,
          totalFailed,
          totalRevenue: performances.reduce((sum, p) => sum + p.renewalRevenue, 0),
          renewalRate,
          performances
        }
      })

    // 최신 월 또는 지정된 월의 데이터로 랭킹 생성
    let aeRankings: any[] = []
    let departmentStats: any[] = []

    const targetMonthStats = month
      ? monthlyStats.find(m => m.month === month) || monthlyStats[0]
      : monthlyStats[0]

    if (targetMonthStats) {
      // AE 랭킹
      aeRankings = targetMonthStats.performances
        .map((perf: any) => ({
          aeName: perf.aeName,
          department: perf.department,
          totalClients: perf.totalClients,
          renewedClients: perf.renewedClients,
          failedRenewals: perf.failedRenewals,
          renewalRevenue: perf.renewalRevenue,
          renewalRate: (perf.renewedClients + perf.failedRenewals) > 0
            ? Math.round((perf.renewedClients / (perf.renewedClients + perf.failedRenewals)) * 100 * 10) / 10
            : 0
        }))
        .sort((a: any, b: any) => b.renewalRevenue - a.renewalRevenue)

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
            renewalRevenue: 0
          })
        }
        const dept = deptMap.get(perf.department)!
        dept.totalAEs.add(perf.aeName)
        dept.totalClients += perf.totalClients
        dept.renewedClients += perf.renewedClients
        dept.failedRenewals += perf.failedRenewals
        dept.renewalRevenue += perf.renewalRevenue
      })

      departmentStats = Array.from(deptMap.values())
        .map(dept => ({
          department: dept.department,
          totalAEs: dept.totalAEs.size,
          totalClients: dept.totalClients,
          renewalRate: (dept.renewedClients + dept.failedRenewals) > 0
            ? Math.round((dept.renewedClients / (dept.renewedClients + dept.failedRenewals)) * 100 * 10) / 10
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
      { error: 'Failed to fetch AE performance data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, performances, timestamp } = body

    console.log('=== AE Performance Save Request ===')
    console.log('Month:', month)
    console.log('Performances count:', performances?.length)
    console.log('Timestamp:', timestamp)

    if (!month || !performances || !Array.isArray(performances)) {
      throw new Error('Invalid request data: missing month or performances')
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

    console.log('Data to save:', dataToSave.length, 'rows')

    // Google Sheets에 데이터 저장
    await writeToSheet('AEPerformance!A:K', dataToSave)

    console.log('✅ AE Performance data saved successfully')

    return NextResponse.json({
      success: true,
      message: 'AE 실적 데이터가 저장되었습니다.',
      count: dataToSave.length
    })
  } catch (error) {
    console.error('❌ Error saving AE performance data:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to save AE performance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}