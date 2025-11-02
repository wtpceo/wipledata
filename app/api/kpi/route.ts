import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7)
    const year = parseInt(month.split('-')[0])

    // 원본데이터에서 전체 데이터 읽기
    const rawData = await readFromSheet('원본데이터!A2:Z')

    // 목표관리 데이터 읽기
    const goalsData = await readFromSheet('목표관리!A2:B')

    // 데이터 파싱
    const sales = rawData.map((row) => {
      const date = row[0] || ''
      const inputMonth = row[18] || '' // S열: 입력 월
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
      const marketingProduct = row[5] || '' // F열: 매체
      const clientName = row[4] || ''
      const contractType = row[3] || ''
      const salesPerson = row[9] || ''
      const department = row[1] || ''

      return {
        date,
        inputMonth,
        contractAmount,
        marketingProduct,
        clientName,
        contractType,
        salesPerson,
        department
      }
    })

    // 월별 목표 맵 생성
    const goalsMap: { [key: string]: number } = {}
    goalsData.forEach((row) => {
      const month = row[0] || ''
      const goalString = String(row[1] || '0').replace(/[₩,]/g, '').replace(/원/g, '')
      goalsMap[month] = parseFloat(goalString) || 0
    })

    // 월별 매출 및 목표 달성률 계산
    const monthlyTrend: any[] = []
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`

      // 해당 월 매출 필터링
      const monthSales = sales.filter(sale => {
        const inputMonth = sale.inputMonth
        if (!inputMonth) return false

        if (inputMonth.includes('-')) {
          return inputMonth === monthStr
        } else if (inputMonth.includes('.')) {
          const formatted = inputMonth.replace('.', '-')
          return formatted === monthStr
        } else if (inputMonth.length === 6) {
          const y = inputMonth.substring(0, 4)
          const m = inputMonth.substring(4, 6)
          return `${y}-${m}` === monthStr
        } else if (inputMonth.length <= 2) {
          const monthNum = parseInt(inputMonth)
          const currentDate = new Date(monthStr + '-01')
          return monthNum === (currentDate.getMonth() + 1)
        }
        return false
      })

      const revenue = monthSales.reduce((sum, s) => sum + s.contractAmount, 0)
      const goal = goalsMap[monthStr] || 130000000 // 기본값 1.3억
      const achievementRate = goal > 0 ? (revenue / goal * 100) : 0

      // 현재 월 이후는 표시하지 않음
      const currentDate = new Date()
      const monthDate = new Date(monthStr + '-01')
      if (monthDate <= currentDate) {
        monthlyTrend.push({
          month: monthStr,
          revenue,
          goal,
          achievementRate
        })
      }
    }

    // 전년 대비 성장률 계산
    const currentYearSales = sales.filter(s => s.date.startsWith(year.toString()))
    const previousYearSales = sales.filter(s => s.date.startsWith((year - 1).toString()))
    const currentYearRevenue = currentYearSales.reduce((sum, s) => sum + s.contractAmount, 0)
    const previousYearRevenue = previousYearSales.reduce((sum, s) => sum + s.contractAmount, 0)
    const growthRate = previousYearRevenue > 0
      ? ((currentYearRevenue - previousYearRevenue) / previousYearRevenue * 100)
      : 0

    // 영업 효율성 지표
    const salesPeople = new Set(currentYearSales.map(s => s.salesPerson).filter(s => s))
    const averagePerPerson = salesPeople.size > 0
      ? currentYearRevenue / salesPeople.size
      : 0

    const newCustomers = currentYearSales.filter(s => s.contractType === '신규')
    const newCustomerCost = newCustomers.length > 0
      ? newCustomers.reduce((sum, s) => sum + s.contractAmount, 0) / newCustomers.length
      : 0

    const uniqueCustomers = new Set(currentYearSales.map(s => s.clientName).filter(c => c))
    const averagePerCustomer = uniqueCustomers.size > 0
      ? currentYearRevenue / uniqueCustomers.size
      : 0

    const renewals = currentYearSales.filter(s => s.contractType === '연장')
    const renewalRate = currentYearSales.length > 0
      ? (renewals.length / currentYearSales.length * 100)
      : 0

    // 수익성 지표 (가정값 - 실제로는 비용 데이터가 필요)
    const netProfit = currentYearRevenue * 0.25 // 25% 순이익률 가정
    const netProfitMargin = currentYearRevenue > 0
      ? (netProfit / currentYearRevenue * 100)
      : 0
    const operatingExpenseRatio = 30 // 30% 운영비 가정

    // 매체별 ROI (가정값)
    const productSales: { [key: string]: number } = {}
    currentYearSales.forEach(sale => {
      if (sale.marketingProduct) {
        productSales[sale.marketingProduct] = (productSales[sale.marketingProduct] || 0) + sale.contractAmount
      }
    })

    const roi = Object.entries(productSales)
      .map(([name, revenue]) => ({
        name,
        value: Math.random() * 150 + 50 // 50-200% ROI 랜덤값 (실제로는 투자비용 대비 계산 필요)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    // 고객 지표
    const totalActiveCustomers = uniqueCustomers.size
    const currentMonth = `${year}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
    const currentMonthSales = sales.filter(s => {
      const inputMonth = s.inputMonth
      return inputMonth === currentMonth ||
             inputMonth === currentMonth.replace('-', '.') ||
             inputMonth === currentMonth.replace('-', '')
    })
    const newCustomersThisMonth = currentMonthSales.filter(s => s.contractType === '신규').length
    const churnRate = 5.2 // 가정값
    const averageContractLength = 6 // 평균 6개월 가정

    // 분기별 목표 달성 현황
    const quarterlyGoals: any[] = []
    for (let q = 1; q <= 4; q++) {
      const quarterMonths = [(q-1)*3 + 1, (q-1)*3 + 2, (q-1)*3 + 3]
      const quarterSales = quarterMonths.reduce((sum, month) => {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`
        const monthData = monthlyTrend.find(m => m.month === monthStr)
        return sum + (monthData?.revenue || 0)
      }, 0)

      const quarterGoal = quarterMonths.reduce((sum, month) => {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`
        return sum + (goalsMap[monthStr] || 130000000)
      }, 0)

      const achievementRate = quarterGoal > 0 ? (quarterSales / quarterGoal * 100) : 0

      // 현재 분기까지만 표시
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
      if (q <= currentQuarter || year < new Date().getFullYear()) {
        quarterlyGoals.push({
          quarter: `${year}년 ${q}분기`,
          goal: quarterGoal,
          actual: quarterSales,
          achievementRate
        })
      }
    }

    return NextResponse.json({
      monthlyTrend,
      yearlyComparison: {
        currentYear: currentYearRevenue,
        previousYear: previousYearRevenue,
        growthRate
      },
      salesEfficiency: {
        averagePerPerson,
        newCustomerCost,
        averagePerCustomer,
        renewalRate
      },
      profitability: {
        netProfitMargin,
        operatingExpenseRatio,
        roi
      },
      customerMetrics: {
        churnRate,
        averageContractLength,
        totalActiveCustomers,
        newCustomersThisMonth
      },
      quarterlyGoals
    })
  } catch (error) {
    console.error('Error fetching KPI data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    )
  }
}