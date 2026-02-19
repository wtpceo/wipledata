import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, SHEETS } from '@/lib/google-sheets'

// 열 번호를 문자로 변환 (1=A, 2=B, ..., 26=Z, 27=AA)
function getColumnLetter(colNum: number): string {
  let letter = ''
  while (colNum > 0) {
    const remainder = (colNum - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    colNum = Math.floor((colNum - 1) / 26)
  }
  return letter
}

// 월별 주차 목표 열 계산 (12월=L:M, 1월=O:P, ...)
function getWeekGoalsColumns(year: number, month: number): { salesCol: string; internalCol: string } {
  // 기준: 2025년 12월 = L열 (12번째)
  const baseYear = 2025
  const baseMonth = 12
  const baseColumn = 12 // L열

  // 기준점에서 몇 개월 차이나는지 계산
  const monthDiff = (year - baseYear) * 12 + (month - baseMonth)

  // 영업부 열 번호 계산 (3열씩 이동)
  const salesColumn = baseColumn + (monthDiff * 3)
  const internalColumn = salesColumn + 1

  return {
    salesCol: getColumnLetter(salesColumn),
    internalCol: getColumnLetter(internalColumn)
  }
}

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

    // 디버그: 전체 데이터 개수
    console.log('=== Dashboard Debug ===')
    console.log('Total raw data rows:', rawData.length)
    console.log('Current month filter:', month)

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

    // 디버그: 필터링된 데이터 개수
    console.log('Filtered current month sales:', currentMonthSales.length)
    if (currentMonthSales.length > 0) {
      console.log('Sample filtered data:', currentMonthSales.slice(0, 3).map(s => ({
        date: s.date,
        department: s.department,
        clientName: s.clientName,
        inputMonth: s.inputMonth,
        totalAmount: s.totalAmount
      })))
    }

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
    let monthlyGoal = 210000000 // 기본값 2억 1천만원 (목표를 찾을 수 없을 경우)

    // 1~5주차 목표 변수
    let week1GoalSales = 0, week1GoalInternal = 0
    let week2GoalSales = 0, week2GoalInternal = 0
    let week3GoalSales = 0, week3GoalInternal = 0
    let week4GoalSales = 0, week4GoalInternal = 0
    let week5GoalSales = 0, week5GoalInternal = 0

    // 주차별 날짜 범위 정의 (2026년 1월은 1~4일이 1주차)
    // 1월의 경우 특별 처리: 1주차 1~4일, 2주차 5~11일, 3주차 12~18일, 4주차 19~25일, 5주차 26~31일
    const isJanuary2026 = currentYear === 2026 && currentMonth === 1

    let week1Start, week1End, week2Start, week2End, week3Start, week3End, week4Start, week4End, week5Start, week5End

    if (isJanuary2026) {
      week1Start = new Date(`${currentYear}-01-01T00:00:00`)
      week1End = new Date(`${currentYear}-01-04T23:59:59`)
      week2Start = new Date(`${currentYear}-01-05T00:00:00`)
      week2End = new Date(`${currentYear}-01-11T23:59:59`)
      week3Start = new Date(`${currentYear}-01-12T00:00:00`)
      week3End = new Date(`${currentYear}-01-17T23:59:59`)
      week4Start = new Date(`${currentYear}-01-18T00:00:00`)
      week4End = new Date(`${currentYear}-01-24T23:59:59`)
      week5Start = new Date(`${currentYear}-01-25T00:00:00`)
      week5End = new Date(`${currentYear}-01-31T23:59:59`)
    } else {
      week1Start = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00`)
      week1End = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-07T23:59:59`)
      week2Start = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-08T00:00:00`)
      week2End = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-14T23:59:59`)
      week3Start = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-15T00:00:00`)
      week3End = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-21T23:59:59`)
      week4Start = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-22T00:00:00`)
      week4End = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-28T23:59:59`)
      week5Start = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-29T00:00:00`)
      const lastDay = new Date(currentYear, currentMonth, 0).getDate()
      week5End = new Date(`${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}T23:59:59`)
    }

    // 현재 주차 계산 (2026년 1월은 특별 처리)
    const today = new Date()
    const dayOfMonth = today.getDate()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth() + 1
    let currentWeek = 1

    if (todayYear === 2026 && todayMonth === 1) {
      // 2026년 1월: 1~4일 1주차, 5~11일 2주차, 12~17일 3주차, 18~24일 4주차, 25~31일 5주차
      if (dayOfMonth >= 5 && dayOfMonth <= 11) currentWeek = 2
      else if (dayOfMonth >= 12 && dayOfMonth <= 17) currentWeek = 3
      else if (dayOfMonth >= 18 && dayOfMonth <= 24) currentWeek = 4
      else if (dayOfMonth >= 25) currentWeek = 5
    } else {
      // 기본: 1~7일 1주차, 8~14일 2주차, ...
      if (dayOfMonth >= 8 && dayOfMonth <= 14) currentWeek = 2
      else if (dayOfMonth >= 15 && dayOfMonth <= 21) currentWeek = 3
      else if (dayOfMonth >= 22 && dayOfMonth <= 28) currentWeek = 4
      else if (dayOfMonth >= 29) currentWeek = 5
    }

    console.log(`Current week: ${currentWeek}`)

    try {
      // 월별 목표 읽기 (A2:B)
      const goalsData = await readFromSheet('목표관리!A2:B')
      const goalRow = goalsData.find((row) => {
        const goalMonth = row[0] || ''
        return goalMonth === month
      })

      if (goalRow && goalRow[1]) {
        const goalString = String(goalRow[1]).replace(/[₩,]/g, '').replace(/원/g, '')
        monthlyGoal = parseFloat(goalString) || 210000000
      }

      // 월별 주차 목표 열 계산
      const { salesCol, internalCol } = getWeekGoalsColumns(currentYear, currentMonth)
      console.log(`Week goals columns for ${currentYear}-${currentMonth}: ${salesCol}:${internalCol}`)

      // 1~5주차 목표 모두 읽기 (해당 월의 열에서, 3~7행)
      const weekGoalsRange = `목표관리!${salesCol}3:${internalCol}7`
      console.log('Reading week goals from:', weekGoalsRange)
      const allWeekGoalsData = await readFromSheet(weekGoalsRange)
      console.log('All week goals data:', allWeekGoalsData)

      if (allWeekGoalsData && allWeekGoalsData.length > 0) {
        // 1주차 (3행)
        if (allWeekGoalsData[0]) {
          week1GoalSales = parseFloat(String(allWeekGoalsData[0][0] || '0').replace(/[₩,원]/g, '').trim()) || 0
          week1GoalInternal = parseFloat(String(allWeekGoalsData[0][1] || '0').replace(/[₩,원]/g, '').trim()) || 0
        }
        // 2주차 (4행)
        if (allWeekGoalsData[1]) {
          week2GoalSales = parseFloat(String(allWeekGoalsData[1][0] || '0').replace(/[₩,원]/g, '').trim()) || 0
          week2GoalInternal = parseFloat(String(allWeekGoalsData[1][1] || '0').replace(/[₩,원]/g, '').trim()) || 0
        }
        // 3주차 (5행)
        if (allWeekGoalsData[2]) {
          week3GoalSales = parseFloat(String(allWeekGoalsData[2][0] || '0').replace(/[₩,원]/g, '').trim()) || 0
          week3GoalInternal = parseFloat(String(allWeekGoalsData[2][1] || '0').replace(/[₩,원]/g, '').trim()) || 0
        }
        // 4주차 (6행)
        if (allWeekGoalsData[3]) {
          week4GoalSales = parseFloat(String(allWeekGoalsData[3][0] || '0').replace(/[₩,원]/g, '').trim()) || 0
          week4GoalInternal = parseFloat(String(allWeekGoalsData[3][1] || '0').replace(/[₩,원]/g, '').trim()) || 0
        }
        // 5주차 (7행)
        if (allWeekGoalsData[4]) {
          week5GoalSales = parseFloat(String(allWeekGoalsData[4][0] || '0').replace(/[₩,원]/g, '').trim()) || 0
          week5GoalInternal = parseFloat(String(allWeekGoalsData[4][1] || '0').replace(/[₩,원]/g, '').trim()) || 0
        }
      }

      console.log('Week 1 goals:', week1GoalSales, week1GoalInternal)
      console.log('Week 2 goals:', week2GoalSales, week2GoalInternal)
      console.log('Week 3 goals:', week3GoalSales, week3GoalInternal)
      console.log('Week 4 goals:', week4GoalSales, week4GoalInternal)
      console.log('Week 5 goals:', week5GoalSales, week5GoalInternal)
    } catch (error) {
      console.error('Error reading 목표관리 sheet:', error)
    }

    const achievementRate = (currentMonthTotal / monthlyGoal * 100)

    // 주차별 매출 계산 함수
    const calculateWeekSales = (weekStart: Date, weekEnd: Date) => {
      // 영업부 매출 (O열의 계약 날짜 기준)
      const salesDept = sales.filter(sale => {
        if (!sale.rawRow || !sale.rawRow[14] || sale.department !== '영업부') return false
        const contractDate = sale.rawRow[14]
        let saleDate: Date | null = null
        try {
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
            return saleDate >= weekStart && saleDate <= weekEnd
          }
        } catch (error) {}
        return false
      }).reduce((sum, s) => sum + s.totalAmount, 0)

      // 내근직 매출 (A열의 타임스탬프 기준)
      const internalDept = sales.filter(sale => {
        if (!sale.date || sale.department === '영업부') return false
        const timestamp = sale.date
        let saleDate: Date | null = null
        try {
          if (timestamp.includes('T')) {
            saleDate = new Date(timestamp)
          } else if (timestamp.includes('/')) {
            const parts = timestamp.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
            }
          } else if (timestamp.includes('.')) {
            saleDate = new Date(timestamp.replace(/\./g, '-'))
          } else if (timestamp.includes('-')) {
            saleDate = new Date(timestamp)
          }
          if (saleDate && !isNaN(saleDate.getTime())) {
            return saleDate >= weekStart && saleDate <= weekEnd
          }
        } catch (error) {}
        return false
      }).reduce((sum, s) => sum + s.totalAmount, 0)

      return { salesDept, internalDept }
    }

    // 1~5주차 매출 계산
    const week1Sales = calculateWeekSales(week1Start, week1End)
    const week2Sales = calculateWeekSales(week2Start, week2End)
    const week3Sales = calculateWeekSales(week3Start, week3End)
    const week4Sales = calculateWeekSales(week4Start, week4End)
    const week5Sales = calculateWeekSales(week5Start, week5End)

    // 주차별 입력자/부서 실적 계산
    // currentMonthSales 기반: 영업부는 O열(계약일), 내근직은 A열(timestamp) 기준으로 주차 배분
    const getWeekForSale = (sale: any): number => {
      let saleDate: Date | null = null
      if (sale.department === '영업부') {
        const contractDate = sale.rawRow?.[14]
        if (!contractDate) return 0
        try {
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
        } catch {}
      } else {
        const timestamp = sale.date
        if (!timestamp) return 0
        try {
          if (timestamp.includes('T')) {
            saleDate = new Date(timestamp)
          } else if (timestamp.includes('/')) {
            const parts = timestamp.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
            }
          } else if (timestamp.includes('.')) {
            saleDate = new Date(timestamp.replace(/\./g, '-'))
          } else if (timestamp.includes('-')) {
            saleDate = new Date(timestamp)
          }
        } catch {}
      }
      if (!saleDate || isNaN(saleDate.getTime())) return 0
      if (saleDate >= week1Start && saleDate <= week1End) return 1
      if (saleDate >= week2Start && saleDate <= week2End) return 2
      if (saleDate >= week3Start && saleDate <= week3End) return 3
      if (saleDate >= week4Start && saleDate <= week4End) return 4
      if (saleDate >= week5Start && saleDate <= week5End) return 5
      return 0
    }

    const weeklyPersonMaps: { [week: number]: { [name: string]: number } } = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }
    const weeklyDeptMaps: { [week: number]: { [name: string]: number } } = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }

    currentMonthSales.forEach(sale => {
      const week = getWeekForSale(sale)
      if (week === 0) return
      if (sale.inputPerson) {
        weeklyPersonMaps[week][sale.inputPerson] = (weeklyPersonMaps[week][sale.inputPerson] || 0) + sale.totalAmount
      }
      if (sale.department) {
        const deptName = sale.department === '영업부' ? '영업부' : '내근직'
        weeklyDeptMaps[week][deptName] = (weeklyDeptMaps[week][deptName] || 0) + sale.totalAmount
      }
    })

    const weeklyInputPersonStats = [1, 2, 3, 4, 5].map(week => ({
      week,
      stats: Object.entries(weeklyPersonMaps[week])
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    }))

    const weeklyDepartmentStats = [1, 2, 3, 4, 5].map(week => ({
      week,
      stats: Object.entries(weeklyDeptMaps[week])
        .map(([name, amount]) => ({ name, amount }))
    }))

    console.log('Week 1 sales:', week1Sales)
    console.log('Week 2 sales:', week2Sales)
    console.log('Week 3 sales:', week3Sales)
    console.log('Week 4 sales:', week4Sales)
    console.log('Week 5 sales:', week5Sales)

    // 주차별 달성률 계산
    const week1AchievementSales = week1GoalSales > 0 ? (week1Sales.salesDept / week1GoalSales * 100) : 0
    const week1AchievementInternal = week1GoalInternal > 0 ? (week1Sales.internalDept / week1GoalInternal * 100) : 0
    const week2AchievementSales = week2GoalSales > 0 ? (week2Sales.salesDept / week2GoalSales * 100) : 0
    const week2AchievementInternal = week2GoalInternal > 0 ? (week2Sales.internalDept / week2GoalInternal * 100) : 0
    const week3AchievementSales = week3GoalSales > 0 ? (week3Sales.salesDept / week3GoalSales * 100) : 0
    const week3AchievementInternal = week3GoalInternal > 0 ? (week3Sales.internalDept / week3GoalInternal * 100) : 0
    const week4AchievementSales = week4GoalSales > 0 ? (week4Sales.salesDept / week4GoalSales * 100) : 0
    const week4AchievementInternal = week4GoalInternal > 0 ? (week4Sales.internalDept / week4GoalInternal * 100) : 0
    const week5AchievementSales = week5GoalSales > 0 ? (week5Sales.salesDept / week5GoalSales * 100) : 0
    const week5AchievementInternal = week5GoalInternal > 0 ? (week5Sales.internalDept / week5GoalInternal * 100) : 0

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
      // 현재 주차
      currentWeek,
      // 1주차 목표
      week1Goals: week1GoalSales > 0 || week1GoalInternal > 0 ? {
        sales: {
          goal: week1GoalSales,
          current: week1Sales.salesDept,
          achievementRate: Math.round(week1AchievementSales * 10) / 10
        },
        internal: {
          goal: week1GoalInternal,
          current: week1Sales.internalDept,
          achievementRate: Math.round(week1AchievementInternal * 10) / 10
        }
      } : undefined,
      // 2주차 목표
      week2Goals: week2GoalSales > 0 || week2GoalInternal > 0 ? {
        sales: {
          goal: week2GoalSales,
          current: week2Sales.salesDept,
          achievementRate: Math.round(week2AchievementSales * 10) / 10
        },
        internal: {
          goal: week2GoalInternal,
          current: week2Sales.internalDept,
          achievementRate: Math.round(week2AchievementInternal * 10) / 10
        }
      } : undefined,
      // 3주차 목표 (목표가 0이어도 현재 주차가 3 이상이면 표시)
      week3Goals: (week3GoalSales > 0 || week3GoalInternal > 0 || currentWeek >= 3) ? {
        sales: {
          goal: week3GoalSales,
          current: week3Sales.salesDept,
          achievementRate: week3GoalSales > 0 ? Math.round(week3AchievementSales * 10) / 10 : 0
        },
        internal: {
          goal: week3GoalInternal,
          current: week3Sales.internalDept,
          achievementRate: week3GoalInternal > 0 ? Math.round(week3AchievementInternal * 10) / 10 : 0
        }
      } : undefined,
      // 4주차 목표
      week4Goals: week4GoalSales > 0 || week4GoalInternal > 0 ? {
        sales: {
          goal: week4GoalSales,
          current: week4Sales.salesDept,
          achievementRate: Math.round(week4AchievementSales * 10) / 10
        },
        internal: {
          goal: week4GoalInternal,
          current: week4Sales.internalDept,
          achievementRate: Math.round(week4AchievementInternal * 10) / 10
        }
      } : undefined,
      // 5주차 목표
      week5Goals: week5GoalSales > 0 || week5GoalInternal > 0 ? {
        sales: {
          goal: week5GoalSales,
          current: week5Sales.salesDept,
          achievementRate: Math.round(week5AchievementSales * 10) / 10
        },
        internal: {
          goal: week5GoalInternal,
          current: week5Sales.internalDept,
          achievementRate: Math.round(week5AchievementInternal * 10) / 10
        }
      } : undefined,
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
      weeklyInputPersonStats,
      weeklyDepartmentStats,
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