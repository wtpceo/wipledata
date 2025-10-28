import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, SHEETS } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    // TODO: Enable authentication once auth is properly configured
    // const session = await auth()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7)

    // 원본데이터 시트에서 데이터 읽기
    // A-Z 열까지 모두 읽기 (S열: 입력 월, H열: 총 계약금액)
    const rawData = await readFromSheet('원본데이터!A2:Z')

    // 현재 월 정보
    const currentDate = new Date(month + '-01')
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    // 이전 월 계산
    const prevMonthDate = new Date(month + '-01')
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
    const prevMonth = prevMonthDate.toISOString().substring(0, 7)
    const prevYear = prevMonthDate.getFullYear()
    const prevMonthNum = prevMonthDate.getMonth() + 1

    // 데이터 파싱
    const sales = rawData.map((row) => {
      // S열(인덱스 18): 입력 월, H열(인덱스 7): 총 계약금액, F열(인덱스 5): 매체, C열(인덱스 2): 입력자
      const monthValue = row[18] || ''
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
      const marketingProduct = row[5] || '' // F열: 마케팅 매체 상품명
      const inputPerson = row[2] || '' // C열: 입력자

      // 다른 필요한 데이터
      return {
        date: row[0] || '',
        department: row[1] || '',
        inputPerson: inputPerson,
        contractType: row[3] || '',
        clientName: row[4] || '',
        productName: marketingProduct,
        contractMonths: parseInt(row[6]) || 0,
        totalAmount: contractAmount,
        salesPerson: row[9] || '',
        inputMonth: monthValue,
        rawRow: row
      }
    })

    // 현재 월 데이터 필터링 (S열 기준)
    const currentMonthSales = sales.filter(sale => {
      const inputMonth = sale.inputMonth
      if (!inputMonth) return false

      // 입력 월 형식 파싱
      if (inputMonth.includes('-')) {
        // "2024-10" 형식
        return inputMonth === month
      } else if (inputMonth.includes('.')) {
        // "2024.10" 형식
        const formatted = inputMonth.replace('.', '-')
        return formatted === month
      } else if (inputMonth.length <= 2) {
        // "10" 형식 (월만 있는 경우)
        const monthNum = parseInt(inputMonth)
        return monthNum === currentMonth
      } else if (inputMonth.length === 6) {
        // "202410" 형식
        const year = inputMonth.substring(0, 4)
        const mon = inputMonth.substring(4, 6)
        return `${year}-${mon}` === month
      }
      return false
    })

    // 이전 월 데이터 필터링 (S열 기준)
    const prevMonthSales = sales.filter(sale => {
      const inputMonth = sale.inputMonth
      if (!inputMonth) return false

      // 입력 월 형식 파싱
      if (inputMonth.includes('-')) {
        // "2024-10" 형식
        return inputMonth === prevMonth
      } else if (inputMonth.includes('.')) {
        // "2024.10" 형식
        const formatted = inputMonth.replace('.', '-')
        return formatted === prevMonth
      } else if (inputMonth.length <= 2) {
        // "10" 형식 (월만 있는 경우)
        const monthNum = parseInt(inputMonth)
        return monthNum === prevMonthNum
      } else if (inputMonth.length === 6) {
        // "202410" 형식
        const year = inputMonth.substring(0, 4)
        const mon = inputMonth.substring(4, 6)
        return `${year}-${mon.padStart(2, '0')}` === prevMonth
      }
      return false
    })

    // 신규/연장/추천 구분
    const newClients = currentMonthSales.filter(s => s.contractType === '신규').length
    const renewals = currentMonthSales.filter(s => s.contractType === '연장').length
    const referrals = currentMonthSales.filter(s => s.contractType === '기존고객 소개').length

    // 부서별 매출 집계
    const departmentSales: { [key: string]: number } = {}
    currentMonthSales.forEach(sale => {
      if (sale.department) {
        departmentSales[sale.department] = (departmentSales[sale.department] || 0) + sale.totalAmount
      }
    })

    // 영업사원별 실적
    const salesPersonStats: { [key: string]: number } = {}
    currentMonthSales.forEach(sale => {
      if (sale.salesPerson) {
        salesPersonStats[sale.salesPerson] = (salesPersonStats[sale.salesPerson] || 0) + sale.totalAmount
      }
    })

    // 마케팅 매체 상품별 매출 집계
    const productSales: { [key: string]: number } = {}
    currentMonthSales.forEach(sale => {
      if (sale.productName) {
        productSales[sale.productName] = (productSales[sale.productName] || 0) + sale.totalAmount
      }
    })

    // 입력자별 실적 집계
    const inputPersonStats: { [key: string]: number } = {}
    currentMonthSales.forEach(sale => {
      if (sale.inputPerson) {
        inputPersonStats[sale.inputPerson] = (inputPersonStats[sale.inputPerson] || 0) + sale.totalAmount
      }
    })

    // 월별 매출 추이 (최근 6개월)
    const monthlyTrend: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(month + '-01')
      trendDate.setMonth(trendDate.getMonth() - i)
      const trendMonth = trendDate.toISOString().substring(0, 7)
      const trendSales = sales.filter(s => s.date && s.date.startsWith(trendMonth))
      const trendAmount = trendSales.reduce((sum, s) => sum + s.totalAmount, 0)

      monthlyTrend.push({
        month: trendMonth,
        amount: trendAmount
      })
    }

    // 통계 계산
    const currentMonthTotal = currentMonthSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const prevMonthTotal = prevMonthSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const monthGrowthRate = prevMonthTotal > 0
      ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal * 100)
      : 0

    // 전체 광고주 수 (중복 제거)
    const uniqueClients = new Set(sales.map(s => s.clientName)).size

    // 목표관리 시트에서 해당 월의 목표 읽기
    let monthlyGoal = 500000000 // 기본값 (목표를 찾을 수 없을 경우)
    try {
      const goalsData = await readFromSheet('목표관리!A2:B')
      const goalRow = goalsData.find((row) => {
        const goalMonth = row[0] || ''
        return goalMonth === month
      })

      if (goalRow && goalRow[1]) {
        // B열의 목표 매출 파싱 (₩ 기호와 쉼표 제거)
        const goalString = String(goalRow[1]).replace(/[₩,]/g, '').replace(/원/g, '')
        monthlyGoal = parseFloat(goalString) || 500000000
      }
    } catch (error) {
      console.error('Error reading 목표관리 sheet:', error)
      // 에러 발생 시 기본값 사용
    }

    const achievementRate = (currentMonthTotal / monthlyGoal * 100)

    return NextResponse.json({
      overview: {
        currentMonthTotal,
        prevMonthTotal,
        monthGrowthRate: Math.round(monthGrowthRate * 10) / 10,
        newClients,
        renewals,
        referrals,
        totalClients: uniqueClients,
        achievementRate: Math.round(achievementRate * 10) / 10,
        monthlyGoal,
        currentMonth: month,
      },
      departmentSales: Object.entries(departmentSales).map(([name, amount]) => ({
        name,
        amount
      })),
      salesPersonStats: Object.entries(salesPersonStats)
        .map(([name, amount]) => ({
          name,
          amount
        }))
        .sort((a, b) => b.amount - a.amount),
      productSales: Object.entries(productSales)
        .map(([name, amount]) => ({
          name,
          amount
        }))
        .sort((a, b) => b.amount - a.amount),
      inputPersonStats: Object.entries(inputPersonStats)
        .map(([name, amount]) => ({
          name,
          amount
        }))
        .sort((a, b) => b.amount - a.amount),
      monthlyTrend,
      recentSales: currentMonthSales.slice(0, 10).map((sale, index) => ({
        id: `recent-${index}`,
        ...sale
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}