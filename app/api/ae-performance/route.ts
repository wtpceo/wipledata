import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

    // Google Sheets에서 AE 실적 데이터 읽기
    // 시트 구조: A열(날짜), B열(월), C열(부서), D열(AE이름), E열(총광고주), F열(종료예정),
    // G열(연장성공), H열(연장실패), I열(실패사유), J열(연장매출), K열(비고)
    const data = await readFromSheet('AEPerformance!A2:K')

    const performances = data.map((row) => ({
      timestamp: row[0] || '',
      month: row[1] || '',
      department: row[2] || '',
      aeName: row[3] || '',
      totalClients: parseInt(row[4] || '0'),
      expiringClients: parseInt(row[5] || '0'),
      renewedClients: parseInt(row[6] || '0'),
      failedRenewals: parseInt(row[7] || '0'),
      failureReasons: row[8] || '',
      renewalRevenue: parseFloat(String(row[9] || '0').replace(/[^\d.-]/g, '')) || 0,
      notes: row[10] || ''
    }))

    // 월별 필터링 (선택사항)
    let filteredData = performances
    if (month) {
      filteredData = performances.filter(p => p.month === month)
    }

    // 월별 그룹화
    const groupedByMonth = filteredData.reduce((acc, perf) => {
      if (!acc[perf.month]) {
        acc[perf.month] = []
      }
      acc[perf.month].push(perf)
      return acc
    }, {} as { [key: string]: any[] })

    // 각 월별 통계 계산
    const monthlyStats = Object.entries(groupedByMonth).map(([month, perfs]) => {
      const totalAEs = new Set(perfs.map(p => p.aeName)).size
      const totalClients = perfs.reduce((sum, p) => sum + p.totalClients, 0)
      const totalExpiring = perfs.reduce((sum, p) => sum + p.expiringClients, 0)
      const totalRenewed = perfs.reduce((sum, p) => sum + p.renewedClients, 0)
      const totalFailed = perfs.reduce((sum, p) => sum + p.failedRenewals, 0)
      const totalRevenue = perfs.reduce((sum, p) => sum + p.renewalRevenue, 0)
      const renewalRate = totalExpiring > 0 ? (totalRenewed / totalExpiring * 100) : 0

      return {
        month,
        totalAEs,
        totalClients,
        totalExpiring,
        totalRenewed,
        totalFailed,
        totalRevenue,
        renewalRate: Math.round(renewalRate * 10) / 10,
        performances: perfs
      }
    }).sort((a, b) => b.month.localeCompare(a.month))

    // 최신 월 데이터에서 AE별 랭킹 계산
    let aeRankings: any[] = []
    let departmentStats: any[] = []

    if (monthlyStats.length > 0) {
      const latestMonth = monthlyStats[0]
      const aePerformances = latestMonth.performances.reduce((acc, perf) => {
        if (!acc[perf.aeName]) {
          acc[perf.aeName] = {
            aeName: perf.aeName,
            department: perf.department,
            totalClients: 0,
            renewedClients: 0,
            failedRenewals: 0,
            renewalRevenue: 0,
            renewalRate: 0
          }
        }
        acc[perf.aeName].totalClients += perf.totalClients
        acc[perf.aeName].renewedClients += perf.renewedClients
        acc[perf.aeName].failedRenewals += perf.failedRenewals
        acc[perf.aeName].renewalRevenue += perf.renewalRevenue

        const expiring = perf.expiringClients
        if (expiring > 0) {
          acc[perf.aeName].renewalRate = (perf.renewedClients / expiring * 100)
        }
        return acc
      }, {} as { [key: string]: any })

      aeRankings = Object.values(aePerformances)
        .sort((a: any, b: any) => b.renewalRevenue - a.renewalRevenue)

      // 부서별 통계 계산
      const deptPerformances = latestMonth.performances.reduce((acc, perf) => {
        if (!acc[perf.department]) {
          acc[perf.department] = {
            department: perf.department,
            totalAEs: new Set(),
            totalClients: 0,
            totalExpiring: 0,
            renewedClients: 0,
            failedRenewals: 0,
            renewalRevenue: 0
          }
        }
        acc[perf.department].totalAEs.add(perf.aeName)
        acc[perf.department].totalClients += perf.totalClients
        acc[perf.department].totalExpiring += perf.expiringClients
        acc[perf.department].renewedClients += perf.renewedClients
        acc[perf.department].failedRenewals += perf.failedRenewals
        acc[perf.department].renewalRevenue += perf.renewalRevenue
        return acc
      }, {} as { [key: string]: any })

      departmentStats = Object.values(deptPerformances)
        .map((dept: any) => ({
          department: dept.department,
          totalAEs: dept.totalAEs.size,
          totalClients: dept.totalClients,
          renewalRate: dept.totalExpiring > 0 ? Math.round((dept.renewedClients / dept.totalExpiring) * 100 * 10) / 10 : 0,
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
        averageRenewalRate: monthlyStats.reduce((sum, m) => sum + m.renewalRate, 0) / (monthlyStats.length || 1)
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