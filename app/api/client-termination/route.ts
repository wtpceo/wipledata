import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    // Google Sheets의 clients 탭에서 데이터 읽기
    // 컬럼 구조를 예상: A(광고주명), B(담당AE), C(서비스종료일) 등
    const data = await readFromSheet('clients!A:Z')

    if (!data || data.length === 0) {
      return NextResponse.json({
        monthlyTerminations: [],
        aeTerminations: [],
        upcomingTerminations: []
      })
    }

    // 헤더 행을 기준으로 컬럼 인덱스 찾기
    const headers = data[0]
    console.log('=== Google Sheets Data Debug ===')
    console.log('Headers:', headers)
    console.log('Total rows:', data.length)
    if (data.length > 1) {
      console.log('First data row:', data[1])
    }

    // 모든 헤더와 인덱스 출력
    headers.forEach((header: string, index: number) => {
      console.log(`Column ${index}: "${header}"`)
    })

    const clientNameIndex = headers.findIndex((h: string) => {
      const header = h?.toLowerCase() || ''
      return header.includes('광고주') || header.includes('업체') || header.includes('클라이언트') || header.includes('회사') || header.includes('client')
    })

    const aeNameIndex = headers.findIndex((h: string) => {
      const header = h?.toLowerCase() || ''
      return header.includes('담당') || header.includes('ae') || header.includes('매니저') || header.includes('영업') || header.includes('manager')
    })

    const endDateIndex = headers.findIndex((h: string) => {
      const header = h?.toLowerCase() || ''
      // Look specifically for "서비스 종료" or just "종료" but not "계약"
      return (header.includes('서비스') && header.includes('종료')) ||
             (header.includes('종료') && !header.includes('계약')) ||
             header.includes('end') ||
             header.includes('expire') ||
             header.includes('만료')
    })

    console.log('Column indices - Client:', clientNameIndex, 'AE:', aeNameIndex, 'EndDate:', endDateIndex)

    // 인덱스가 -1인 경우 기본값 설정 (임시)
    const finalClientIndex = clientNameIndex >= 0 ? clientNameIndex : 0
    const finalAEIndex = aeNameIndex >= 0 ? aeNameIndex : 1
    const finalEndDateIndex = endDateIndex >= 0 ? endDateIndex : 4 // Changed default to 4 (서비스 종료 일)

    // Debug: Show first few rows with end dates
    if (data.length > 1) {
      console.log('Sample data rows with end dates:')
      for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
        const row = data[i]
        if (row[finalEndDateIndex]) {
          console.log(`Row ${i}: Client="${row[finalClientIndex]}", AE="${row[finalAEIndex]}", EndDate="${row[finalEndDateIndex]}"`)
        }
      }
    }
    console.log('=== End Debug ===')

    // 모든 클라이언트 데이터 파싱 (종료일 유무 관계없이)
    const allClients = data.slice(1).map((row) => ({
      clientName: row[finalClientIndex] || '',
      aeName: row[finalAEIndex] || '',
      endDate: row[finalEndDateIndex] || '',
      // 추가 필드들
      department: row[headers.findIndex((h: string) => h?.toLowerCase()?.includes('부서'))] || '',
      monthlyAmount: parseFloat(String(row[headers.findIndex((h: string) => h?.toLowerCase()?.includes('월매출') || h?.toLowerCase()?.includes('금액'))] || '0').replace(/[^0-9.-]/g, '')) || 0,
      status: row[headers.findIndex((h: string) => h?.toLowerCase()?.includes('상태'))] || 'active'
    })).filter(client => client.clientName)

    // 종료일이 있는 클라이언트만 필터링
    const terminatingClients = allClients.filter(client => client.endDate)

    console.log('Total clients:', allClients.length)
    console.log('Terminating clients:', terminatingClients.length)
    if (terminatingClients.length > 0) {
      console.log('Sample terminating client:', terminatingClients[0])
    }

    // 현재 날짜 기준 계산
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // AE별 전체 클라이언트 수 계산
    const aeClientCounts: { [key: string]: number } = {}
    allClients.forEach(client => {
      if (client.aeName) {
        aeClientCounts[client.aeName] = (aeClientCounts[client.aeName] || 0) + 1
      }
    })

    // 월별 종료 예정 집계
    const monthlyTerminations: { [key: string]: any } = {}
    const aeTerminations: { [key: string]: any } = {}

    terminatingClients.forEach(client => {
      // 날짜 파싱 (YYYY-MM-DD 또는 YYYY/MM/DD 형식 가정)
      const endDateStr = client.endDate
      if (!endDateStr) return

      let endDate: Date
      try {
        // 다양한 날짜 형식 처리
        if (endDateStr.includes('-') || endDateStr.includes('/')) {
          endDate = new Date(endDateStr)
        } else if (endDateStr.includes('년') && endDateStr.includes('월')) {
          // 한국어 날짜 형식 처리 (예: "2025년 10월 30일")
          const koreanDate = endDateStr.replace(/[년월]/g, '-').replace(/일/g, '').trim()
          endDate = new Date(koreanDate)
        } else if (endDateStr.match(/^\d{8}$/)) {
          // YYYYMMDD 형식
          const year = endDateStr.substring(0, 4)
          const month = endDateStr.substring(4, 6)
          const day = endDateStr.substring(6, 8)
          endDate = new Date(`${year}-${month}-${day}`)
        } else if (endDateStr.includes('.')) {
          // 점으로 구분된 형식 (예: "2025.10.30")
          const dotDate = endDateStr.replace(/\./g, '-')
          endDate = new Date(dotDate)
        } else {
          // Excel serial date number 처리
          const excelDate = parseInt(endDateStr)
          if (!isNaN(excelDate) && excelDate > 10000 && excelDate < 100000) {
            endDate = new Date((excelDate - 25569) * 86400 * 1000)
          } else {
            console.log('Unable to parse date:', endDateStr)
            return
          }
        }
      } catch (error) {
        console.error('Date parsing error:', endDateStr, error)
        return
      }

      if (isNaN(endDate.getTime())) return

      const year = endDate.getFullYear()
      const month = endDate.getMonth() + 1
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`

      // 월별 집계
      if (!monthlyTerminations[monthKey]) {
        monthlyTerminations[monthKey] = {
          month: monthKey,
          totalClients: 0,
          totalAmount: 0,
          clients: [],
          aeData: {} // AE별 데이터 추가
        }
      }
      monthlyTerminations[monthKey].totalClients++
      monthlyTerminations[monthKey].totalAmount += client.monthlyAmount
      monthlyTerminations[monthKey].clients.push(client)

      // AE별 월별 데이터 집계
      if (!monthlyTerminations[monthKey].aeData[client.aeName]) {
        monthlyTerminations[monthKey].aeData[client.aeName] = {
          aeName: client.aeName,
          department: client.department,
          totalClients: aeClientCounts[client.aeName] || 0, // 전체 클라이언트 수
          terminatingClients: 0, // 종료 예정 클라이언트 수
          clients: []
        }
      }
      monthlyTerminations[monthKey].aeData[client.aeName].terminatingClients++
      monthlyTerminations[monthKey].aeData[client.aeName].clients.push(client)

      // AE별 집계
      const aeKey = client.aeName
      if (!aeTerminations[aeKey]) {
        aeTerminations[aeKey] = {
          aeName: aeKey,
          department: client.department,
          totalClients: 0,
          monthlyData: {}
        }
      }
      aeTerminations[aeKey].totalClients++

      if (!aeTerminations[aeKey].monthlyData[monthKey]) {
        aeTerminations[aeKey].monthlyData[monthKey] = {
          count: 0,
          amount: 0,
          clients: []
        }
      }
      aeTerminations[aeKey].monthlyData[monthKey].count++
      aeTerminations[aeKey].monthlyData[monthKey].amount += client.monthlyAmount
      aeTerminations[aeKey].monthlyData[monthKey].clients.push(client)
    })

    // 향후 3개월 종료 예정 업체 필터링
    const upcomingMonths = []
    for (let i = 0; i < 3; i++) {
      const date = new Date(currentYear, currentMonth - 1 + i, 1)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      upcomingMonths.push(monthKey)
    }

    const upcomingTerminations = upcomingMonths.map(monthKey => {
      const data = monthlyTerminations[monthKey] || {
        month: monthKey,
        totalClients: 0,
        totalAmount: 0,
        clients: [],
        aeData: {}
      }
      return {
        ...data,
        monthName: new Date(monthKey + '-01').toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long'
        })
      }
    })

    // 월별 데이터를 배열로 변환하고 정렬 (현재 날짜에서 가까운 순서)
    const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
    const sortedMonthlyTerminations = Object.values(monthlyTerminations)
      .sort((a: any, b: any) => {
        // 현재 월과의 차이를 계산하여 정렬 (절대값 기준)
        const aDiff = Math.abs(new Date(a.month + '-01').getTime() - new Date(currentMonthKey + '-01').getTime())
        const bDiff = Math.abs(new Date(b.month + '-01').getTime() - new Date(currentMonthKey + '-01').getTime())
        return aDiff - bDiff
      })
      .slice(0, 12) // 최근 12개월

    // AE별 데이터를 배열로 변환
    const sortedAeTerminations = Object.values(aeTerminations)
      .sort((a: any, b: any) => b.totalClients - a.totalClients)

    // 향후 3개월 합계 계산
    const threeMonthsTotal = upcomingTerminations.reduce((sum, month) => sum + month.totalClients, 0)

    return NextResponse.json({
      monthlyTerminations: sortedMonthlyTerminations,
      aeTerminations: sortedAeTerminations,
      upcomingTerminations,
      summary: {
        totalClients: allClients.length, // 전체 클라이언트 수
        totalTerminatingClients: terminatingClients.length,
        currentMonthTerminations: monthlyTerminations[`${currentYear}-${currentMonth.toString().padStart(2, '0')}`]?.totalClients || 0,
        nextMonthTerminations: monthlyTerminations[`${currentMonth === 12 ? currentYear + 1 : currentYear}-${((currentMonth % 12) + 1).toString().padStart(2, '0')}`]?.totalClients || 0,
        threeMonthsTerminations: threeMonthsTotal
      },
      aeClientCounts // AE별 전체 클라이언트 수 정보
    })
  } catch (error) {
    console.error('Error fetching client termination data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client termination data' },
      { status: 500 }
    )
  }
}