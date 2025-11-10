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
      const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0 // K열: 확정 외주비
      const department = row[1] || '' // B열: 부서
      const marketingProduct = row[5] || '' // F열: 마케팅 매체 상품명
      const inputPerson = row[2] || '' // C열: 입력자

      // 영업부는 총계약금액 - 외주비, 나머지는 총계약금액
      const actualAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount

      // 다른 필요한 데이터
      return {
        date: row[0] || '',
        department: department,
        inputPerson: inputPerson,
        contractType: row[3] || '',
        clientName: row[4] || '',
        productName: marketingProduct,
        contractMonths: parseInt(row[6]) || 0,
        totalAmount: actualAmount,
        salesPerson: row[9] || '',
        inputMonth: monthValue,
        rawRow: row
      }
    })

    // 현재 월 데이터 필터링
    // 영업부: S열(입력 월) 기준, 내근직: A열(타임스탬프) 기준
    const currentMonthSales = sales.filter(sale => {
      // 영업부는 S열(입력 월) 사용
      if (sale.department === '영업부') {
        const inputMonth = sale.inputMonth
        if (!inputMonth) return false

        // 입력 월 형식 파싱
        if (inputMonth.includes('-')) {
          return inputMonth === month
        } else if (inputMonth.includes('.')) {
          const formatted = inputMonth.replace('.', '-')
          return formatted === month
        } else if (inputMonth.length <= 2) {
          const monthNum = parseInt(inputMonth)
          return monthNum === currentMonth
        } else if (inputMonth.length === 6) {
          const year = inputMonth.substring(0, 4)
          const mon = inputMonth.substring(4, 6)
          return `${year}-${mon}` === month
        }
        return false
      } else {
        // 내근직(영업부 제외)은 A열(타임스탬프) 사용
        if (!sale.date) return false

        const timestamp = sale.date
        try {
          let saleDate: Date | null = null

          // ISO 형식 (2024-11-03T12:34:56.789Z)
          if (timestamp.includes('T')) {
            saleDate = new Date(timestamp)
          }
          // MM/DD/YYYY 형식
          else if (timestamp.includes('/')) {
            const parts = timestamp.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
            }
          }
          // YYYY.MM.DD 형식
          else if (timestamp.includes('.')) {
            saleDate = new Date(timestamp.replace(/\./g, '-'))
          }
          // YYYY-MM-DD 형식
          else if (timestamp.includes('-')) {
            saleDate = new Date(timestamp)
          }

          if (saleDate && !isNaN(saleDate.getTime())) {
            const saleMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`
            return saleMonth === month
          }
        } catch (error) {
          console.error('Timestamp parsing error:', timestamp, error)
        }
        return false
      }
    })

    // 이전 월 데이터 필터링
    // 영업부: S열(입력 월) 기준, 내근직: A열(타임스탬프) 기준
    const prevMonthSales = sales.filter(sale => {
      // 영업부는 S열(입력 월) 사용
      if (sale.department === '영업부') {
        const inputMonth = sale.inputMonth
        if (!inputMonth) return false

        if (inputMonth.includes('-')) {
          return inputMonth === prevMonth
        } else if (inputMonth.includes('.')) {
          const formatted = inputMonth.replace('.', '-')
          return formatted === prevMonth
        } else if (inputMonth.length <= 2) {
          const monthNum = parseInt(inputMonth)
          return monthNum === prevMonthNum
        } else if (inputMonth.length === 6) {
          const year = inputMonth.substring(0, 4)
          const mon = inputMonth.substring(4, 6)
          return `${year}-${mon.padStart(2, '0')}` === prevMonth
        }
        return false
      } else {
        // 내근직(영업부 제외)은 A열(타임스탬프) 사용
        if (!sale.date) return false

        const timestamp = sale.date
        try {
          let saleDate: Date | null = null

          // ISO 형식 (2024-11-03T12:34:56.789Z)
          if (timestamp.includes('T')) {
            saleDate = new Date(timestamp)
          }
          // MM/DD/YYYY 형식
          else if (timestamp.includes('/')) {
            const parts = timestamp.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
            }
          }
          // YYYY.MM.DD 형식
          else if (timestamp.includes('.')) {
            saleDate = new Date(timestamp.replace(/\./g, '-'))
          }
          // YYYY-MM-DD 형식
          else if (timestamp.includes('-')) {
            saleDate = new Date(timestamp)
          }

          if (saleDate && !isNaN(saleDate.getTime())) {
            const saleMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`
            return saleMonth === prevMonth
          }
        } catch (error) {
          console.error('Timestamp parsing error:', timestamp, error)
        }
        return false
      }
    })

    // 신규/연장/추천 구분
    const newClients = currentMonthSales.filter(s => s.contractType === '신규').length
    const renewals = currentMonthSales.filter(s => s.contractType === '연장').length
    const referrals = currentMonthSales.filter(s => s.contractType === '기존고객 소개').length

    // 부서별 매출 집계 (영업부 / 내근직으로 통합)
    const departmentSales: { [key: string]: number } = {}
    currentMonthSales.forEach(sale => {
      if (sale.department) {
        // 영업부는 그대로, 나머지는 모두 "내근직"으로 통합
        const deptName = sale.department === '영업부' ? '영업부' : '내근직'
        departmentSales[deptName] = (departmentSales[deptName] || 0) + sale.totalAmount
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

    // 현재 월 광고주 수 (중복 제거)
    const uniqueClients = new Set(currentMonthSales.map(s => s.clientName)).size

    // 목표관리 시트에서 해당 월의 목표 읽기
    let monthlyGoal = 500000000 // 기본값 (목표를 찾을 수 없을 경우)
    let week1GoalSales = 0 // 영업부 1주차 목표
    let week1GoalInternal = 0 // 내근직 1주차 목표
    let week2GoalSales = 0 // 영업부 2주차 목표
    let week2GoalInternal = 0 // 내근직 2주차 목표

    try {
      // 월별 목표 읽기 (A2:B)
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

      // 1주차 목표 읽기 (I3:J3)
      const week1GoalsData = await readFromSheet('목표관리!I3:J3')
      console.log('Week 1 goals data from sheet:', week1GoalsData)

      if (week1GoalsData && week1GoalsData.length > 0 && week1GoalsData[0]) {
        // I3 셀: 영업부 1주차 목표 (인덱스 0)
        if (week1GoalsData[0][0]) {
          const salesGoalStr = String(week1GoalsData[0][0]).replace(/[₩,]/g, '').replace(/원/g, '').trim()
          week1GoalSales = parseFloat(salesGoalStr) || 0
          console.log('Week 1 Sales goal:', week1GoalSales)
        }
        // J3 셀: 내근직 1주차 목표 (인덱스 1)
        if (week1GoalsData[0][1]) {
          const internalGoalStr = String(week1GoalsData[0][1]).replace(/[₩,]/g, '').replace(/원/g, '').trim()
          week1GoalInternal = parseFloat(internalGoalStr) || 0
          console.log('Week 1 Internal goal:', week1GoalInternal)
        }
      }

      // 2주차 목표 읽기 (I4:J4)
      const week2GoalsData = await readFromSheet('목표관리!I4:J4')
      console.log('Week 2 goals data from sheet:', week2GoalsData)

      if (week2GoalsData && week2GoalsData.length > 0 && week2GoalsData[0]) {
        // I4 셀: 영업부 2주차 목표 (인덱스 0)
        if (week2GoalsData[0][0]) {
          const salesGoalStr = String(week2GoalsData[0][0]).replace(/[₩,]/g, '').replace(/원/g, '').trim()
          week2GoalSales = parseFloat(salesGoalStr) || 0
          console.log('Week 2 Sales goal:', week2GoalSales)
        }
        // J4 셀: 내근직 2주차 목표 (인덱스 1)
        if (week2GoalsData[0][1]) {
          const internalGoalStr = String(week2GoalsData[0][1]).replace(/[₩,]/g, '').replace(/원/g, '').trim()
          week2GoalInternal = parseFloat(internalGoalStr) || 0
          console.log('Week 2 Internal goal:', week2GoalInternal)
        }
      }
    } catch (error) {
      console.error('Error reading 목표관리 sheet:', error)
      // 에러 발생 시 기본값 사용
    }

    const achievementRate = (currentMonthTotal / monthlyGoal * 100)

    // 1주차 매출 계산 (2025-11-01 ~ 2025-11-09)
    // O열(인덱스 14): 계약 날짜
    const week1Start = new Date('2025-11-01T00:00:00')
    const week1End = new Date('2025-11-09T23:59:59')

    // 1주차 영업부 매출 (O열의 계약 날짜 기준)
    const week1SalesSales = sales.filter(sale => {
      if (!sale.rawRow || !sale.rawRow[14] || sale.department !== '영업부') return false

      const contractDate = sale.rawRow[14] // O열: 계약 날짜
      let saleDate: Date | null = null

      try {
        // 날짜 형식 파싱 (YYYY-MM-DD, MM/DD/YYYY, YYYY.MM.DD 등)
        if (contractDate.includes('/')) {
          const parts = contractDate.split('/')
          if (parts.length === 3) {
            const [m, d, y] = parts
            saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
          }
        } else if (contractDate.includes('.')) {
          saleDate = new Date(contractDate.replace(/\./g, '-'))
        } else if (contractDate.includes('-')) {
          saleDate = new Date(contractDate)
        }

        if (saleDate && !isNaN(saleDate.getTime())) {
          return saleDate >= week1Start && saleDate <= week1End
        }
      } catch (error) {
        console.error('Date parsing error:', contractDate, error)
      }

      return false
    }).reduce((sum, s) => sum + s.totalAmount, 0)

    // 1주차 내근직 매출 (A열의 타임스탬프 기준)
    // 영업부를 제외한 모든 부서를 내근직으로 간주
    const week1SalesInternal = sales.filter(sale => {
      if (!sale.date || sale.department === '영업부') return false

      const timestamp = sale.date // A열: 타임스탬프
      let saleDate: Date | null = null

      try {
        // ISO 형식 (2024-11-03T12:34:56.789Z)
        if (timestamp.includes('T')) {
          saleDate = new Date(timestamp)
        }
        // MM/DD/YYYY 형식
        else if (timestamp.includes('/')) {
          const parts = timestamp.split('/')
          if (parts.length === 3) {
            const [m, d, y] = parts
            saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
          }
        }
        // YYYY.MM.DD 형식
        else if (timestamp.includes('.')) {
          saleDate = new Date(timestamp.replace(/\./g, '-'))
        }
        // YYYY-MM-DD 형식
        else if (timestamp.includes('-')) {
          saleDate = new Date(timestamp)
        }

        if (saleDate && !isNaN(saleDate.getTime())) {
          return saleDate >= week1Start && saleDate <= week1End
        }
      } catch (error) {
        console.error('Timestamp parsing error:', timestamp, error)
      }

      return false
    }).reduce((sum, s) => sum + s.totalAmount, 0)

    // 2주차 매출 계산 (2025-11-10 ~ 2025-11-16)
    const week2Start = new Date('2025-11-10T00:00:00')
    const week2End = new Date('2025-11-16T23:59:59')

    // 2주차 영업부 매출 (O열의 계약 날짜 기준)
    const week2SalesSales = sales.filter(sale => {
      if (!sale.rawRow || !sale.rawRow[14] || sale.department !== '영업부') return false

      const contractDate = sale.rawRow[14] // O열: 계약 날짜
      let saleDate: Date | null = null

      try {
        // 날짜 형식 파싱 (YYYY-MM-DD, MM/DD/YYYY, YYYY.MM.DD 등)
        if (contractDate.includes('/')) {
          const parts = contractDate.split('/')
          if (parts.length === 3) {
            const [m, d, y] = parts
            saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
          }
        } else if (contractDate.includes('.')) {
          saleDate = new Date(contractDate.replace(/\./g, '-'))
        } else if (contractDate.includes('-')) {
          saleDate = new Date(contractDate)
        }

        if (saleDate && !isNaN(saleDate.getTime())) {
          return saleDate >= week2Start && saleDate <= week2End
        }
      } catch (error) {
        console.error('Date parsing error:', contractDate, error)
      }

      return false
    }).reduce((sum, s) => sum + s.totalAmount, 0)

    // 2주차 내근직 매출 (A열의 타임스탬프 기준)
    const week2SalesInternal = sales.filter(sale => {
      if (!sale.date || sale.department === '영업부') return false

      const timestamp = sale.date // A열: 타임스탬프
      let saleDate: Date | null = null

      try {
        // ISO 형식 (2024-11-03T12:34:56.789Z)
        if (timestamp.includes('T')) {
          saleDate = new Date(timestamp)
        }
        // MM/DD/YYYY 형식
        else if (timestamp.includes('/')) {
          const parts = timestamp.split('/')
          if (parts.length === 3) {
            const [m, d, y] = parts
            saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
          }
        }
        // YYYY.MM.DD 형식
        else if (timestamp.includes('.')) {
          saleDate = new Date(timestamp.replace(/\./g, '-'))
        }
        // YYYY-MM-DD 형식
        else if (timestamp.includes('-')) {
          saleDate = new Date(timestamp)
        }

        if (saleDate && !isNaN(saleDate.getTime())) {
          return saleDate >= week2Start && saleDate <= week2End
        }
      } catch (error) {
        console.error('Timestamp parsing error:', timestamp, error)
      }

      return false
    }).reduce((sum, s) => sum + s.totalAmount, 0)

    // 주간 목표 달성률
    const week1AchievementSales = week1GoalSales > 0 ? (week1SalesSales / week1GoalSales * 100) : 0
    const week1AchievementInternal = week1GoalInternal > 0 ? (week1SalesInternal / week1GoalInternal * 100) : 0
    const week2AchievementSales = week2GoalSales > 0 ? (week2SalesSales / week2GoalSales * 100) : 0
    const week2AchievementInternal = week2GoalInternal > 0 ? (week2SalesInternal / week2GoalInternal * 100) : 0

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
      week1Goals: {
        sales: {
          goal: week1GoalSales,
          current: week1SalesSales,
          achievementRate: Math.round(week1AchievementSales * 10) / 10
        },
        internal: {
          goal: week1GoalInternal,
          current: week1SalesInternal,
          achievementRate: Math.round(week1AchievementInternal * 10) / 10
        }
      },
      week2Goals: {
        sales: {
          goal: week2GoalSales,
          current: week2SalesSales,
          achievementRate: Math.round(week2AchievementSales * 10) / 10
        },
        internal: {
          goal: week2GoalInternal,
          current: week2SalesInternal,
          achievementRate: Math.round(week2AchievementInternal * 10) / 10
        }
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