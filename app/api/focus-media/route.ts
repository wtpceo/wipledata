import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

// GET: 포커스미디어 매출 데이터 조회 및 분석
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7)

    // 원본데이터에서 데이터 읽기
    const data = await readFromSheet('원본데이터!A2:Y')

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [], summary: null })
    }

    // 포커스미디어 데이터만 필터링
    // F열(인덱스 5): 마케팅 매체 상품명
    const focusMediaData = data
      .map((row, index) => {
        const productName = row[5] || ''
        if (!productName.includes('포커스미디어')) return null

        const totalAmount = parseInt(String(row[7] || '0').replace(/,/g, ''))
        const outsourcingCost = parseInt(String(row[10] || '0').replace(/,/g, ''))
        const netProfit = totalAmount - outsourcingCost

        return {
          id: `focus-${index + 2}`,
          timestamp: row[0] || '',
          department: row[1] || '',
          inputPerson: row[2] || '',
          salesType: row[3] || '', // 신규/연장
          clientName: row[4] || '',
          productName: productName,
          contractPeriod: row[6] || '',
          totalAmount: totalAmount,
          paymentMethod: row[8] || '',
          outsourcingCost: outsourcingCost,
          netProfit: netProfit,
          contractDate: row[14] || '',
          contractEndDate: row[15] || '',
          inputMonth: row[18] || '',
          marketingManager: row[20] || '',
          onlineCheckRequested: row[21] || 'N',
          onlineCheckDateTime: row[22] || '',
          clientAddress: row[23] || '',
          clientContact: row[24] || '',
        }
      })
      .filter(item => item !== null)

    // 월별 필터링
    const filteredByMonth = month === 'all'
      ? focusMediaData
      : focusMediaData.filter(item => {
          if (!item) return false
          // S열(입력월) 또는 O열(계약날짜) 기준으로 필터링
          const inputMonth = item.inputMonth
          const contractDate = item.contractDate

          if (inputMonth && inputMonth.includes('-')) {
            return inputMonth === month
          }
          if (contractDate && contractDate.startsWith(month)) {
            return true
          }
          return false
        })

    // 통계 계산
    const totalSales = filteredByMonth.reduce((sum, item) => sum + (item?.totalAmount || 0), 0)
    const totalOutsourcing = filteredByMonth.reduce((sum, item) => sum + (item?.outsourcingCost || 0), 0)
    const totalNetProfit = filteredByMonth.reduce((sum, item) => sum + (item?.netProfit || 0), 0)
    const totalContracts = filteredByMonth.length

    // 신규/연장 구분
    const newContracts = filteredByMonth.filter(item => item?.salesType === '신규').length
    const renewalContracts = filteredByMonth.filter(item => item?.salesType === '연장').length

    // 온라인 점검 희망 업체
    const onlineCheckRequested = filteredByMonth.filter(item => item?.onlineCheckRequested === 'Y').length

    // 담당자별 실적
    const managerStats: { [key: string]: { count: number; amount: number } } = {}
    filteredByMonth.forEach(item => {
      if (item?.inputPerson) {
        if (!managerStats[item.inputPerson]) {
          managerStats[item.inputPerson] = { count: 0, amount: 0 }
        }
        managerStats[item.inputPerson].count++
        managerStats[item.inputPerson].amount += item.totalAmount
      }
    })

    // 월별 추이 (최근 6개월)
    const monthlyTrend: { month: string; amount: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(month + '-01')
      trendDate.setMonth(trendDate.getMonth() - i)
      const trendMonth = trendDate.toISOString().substring(0, 7)

      const monthData = focusMediaData.filter(item => {
        if (!item) return false
        const inputMonth = item.inputMonth
        const contractDate = item.contractDate

        if (inputMonth && inputMonth.includes('-')) {
          return inputMonth === trendMonth
        }
        if (contractDate && contractDate.startsWith(trendMonth)) {
          return true
        }
        return false
      })

      monthlyTrend.push({
        month: trendMonth,
        amount: monthData.reduce((sum, item) => sum + (item?.totalAmount || 0), 0),
        count: monthData.length
      })
    }

    // 계약 주수별 분포
    const weekDistribution: { [key: string]: number } = {}
    filteredByMonth.forEach(item => {
      if (item?.contractPeriod) {
        const period = item.contractPeriod
        weekDistribution[period] = (weekDistribution[period] || 0) + 1
      }
    })

    return NextResponse.json({
      data: filteredByMonth.sort((a, b) => (b?.totalAmount || 0) - (a?.totalAmount || 0)),
      summary: {
        totalSales,
        totalOutsourcing,
        totalNetProfit,
        totalContracts,
        newContracts,
        renewalContracts,
        onlineCheckRequested,
        avgContractAmount: totalContracts > 0 ? Math.round(totalSales / totalContracts) : 0,
      },
      managerStats: Object.entries(managerStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.amount - a.amount),
      monthlyTrend,
      weekDistribution: Object.entries(weekDistribution)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => b.count - a.count),
      currentMonth: month,
    })
  } catch (error) {
    console.error('Error fetching focus media data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch focus media data' },
      { status: 500 }
    )
  }
}
