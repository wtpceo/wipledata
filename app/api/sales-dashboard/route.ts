import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')

    // Google Sheets의 원본데이터 탭에서 데이터 읽기
    const data = await readFromSheet('원본데이터!A:Z')

    if (!data || data.length === 0) {
      return NextResponse.json({
        totalSales: 0,
        totalClients: 0,
        averageSale: 0,
        salesPeople: []
      })
    }

    // 헤더 행 파싱
    const headers = data[0]
    console.log('=== Sales Dashboard Debug ===')
    console.log('Headers:', headers)

    // 컬럼 인덱스 찾기
    const departmentIndex = headers.findIndex((h: string) =>
      h?.includes('부서') || h?.toLowerCase().includes('department')
    )
    const inputPersonIndex = headers.findIndex((h: string) =>
      h?.includes('입력자') || h?.toLowerCase().includes('input_person')
    )
    const salesTypeIndex = headers.findIndex((h: string) =>
      h?.includes('매출 유형') || h?.includes('Sales_Type') || h?.includes('유형')
    )
    const amountIndex = headers.findIndex((h: string) =>
      h?.includes('총 계약금액') || h?.includes('Total_Amount') || h?.includes('계약금액')
    )
    const clientIndex = headers.findIndex((h: string) =>
      h?.includes('광고주') || h?.includes('업체') || h?.toLowerCase().includes('client')
    )
    const dateIndex = headers.findIndex((h: string) =>
      h?.includes('계약날짜') || h?.includes('Contract_Date') || h?.includes('날짜') || h?.toLowerCase().includes('date')
    )

    console.log('Column indices - Dept:', departmentIndex, 'InputPerson:', inputPersonIndex,
                'Amount:', amountIndex, 'Client:', clientIndex, 'Date:', dateIndex)

    // 모든 부서 목록 확인 (디버깅용)
    const allDepartments = new Set()
    data.slice(1).forEach(row => {
      const dept = row[departmentIndex]?.trim()
      if (dept) allDepartments.add(dept)
    })
    console.log('All departments found:', Array.from(allDepartments))

    // 영업부 데이터만 필터링
    const salesDeptData = data.slice(1).filter(row => {
      const dept = row[departmentIndex]?.trim()
      return dept === '영업부' || dept === '영업'
    })

    console.log('Filtered sales dept rows:', salesDeptData.length)
    if (salesDeptData.length > 0) {
      console.log('Sample filtered rows:', salesDeptData.slice(0, 3).map(row => ({
        dept: row[departmentIndex],
        person: row[inputPersonIndex],
        amount: row[amountIndex]
      })))
    }

    // 영업 담당자별로 데이터 집계
    const salesPeopleMap: { [key: string]: {
      salesPerson: string
      totalSales: number
      clients: Set<string>
      monthlyData: { [key: string]: number }
      salesByType: { [key: string]: { count: number, amount: number } }
    }} = {}

    salesDeptData.forEach(row => {
      const salesPerson = row[inputPersonIndex]?.trim()
      const salesType = row[salesTypeIndex]?.trim() || '기타'
      const amountStr = row[amountIndex]?.toString().replace(/[^0-9.-]/g, '') || '0'
      const amount = parseFloat(amountStr) || 0
      const client = row[clientIndex]?.trim() || ''
      const dateStr = row[dateIndex]?.trim() || ''

      if (!salesPerson || amount === 0) return

      // 날짜 파싱 (YYYY-MM-DD, MM/DD/YYYY, YYYY.MM.DD 등 다양한 형식 지원)
      let monthKey = ''
      if (dateStr) {
        try {
          let normalizedDate = dateStr
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/')
            if (parts.length === 3) {
              const [m, d, y] = parts
              normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
            }
          } else if (dateStr.includes('.')) {
            normalizedDate = dateStr.replace(/\./g, '-')
          }

          const date = new Date(normalizedDate)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            monthKey = `${year}-${month}`
          }
        } catch (error) {
          console.error('Date parsing error:', dateStr, error)
        }
      }

      // 담당자별 집계
      if (!salesPeopleMap[salesPerson]) {
        salesPeopleMap[salesPerson] = {
          salesPerson,
          totalSales: 0,
          clients: new Set(),
          monthlyData: {},
          salesByType: {}
        }
      }

      salesPeopleMap[salesPerson].totalSales += amount
      if (client) {
        salesPeopleMap[salesPerson].clients.add(client)
      }
      if (monthKey) {
        salesPeopleMap[salesPerson].monthlyData[monthKey] =
          (salesPeopleMap[salesPerson].monthlyData[monthKey] || 0) + amount
      }

      // 매출 유형별 집계
      if (!salesPeopleMap[salesPerson].salesByType[salesType]) {
        salesPeopleMap[salesPerson].salesByType[salesType] = { count: 0, amount: 0 }
      }
      salesPeopleMap[salesPerson].salesByType[salesType].count += 1
      salesPeopleMap[salesPerson].salesByType[salesType].amount += amount
    })

    // 결과 데이터 변환
    const salesPeople = Object.values(salesPeopleMap).map(person => ({
      salesPerson: person.salesPerson,
      totalSales: person.totalSales,
      clientCount: person.clients.size,
      averageSale: person.clients.size > 0 ? person.totalSales / person.clients.size : 0,
      monthlyData: Object.entries(person.monthlyData)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      salesByType: person.salesByType
    }))

    // 전체 통계 계산
    const totalSales = salesPeople.reduce((sum, p) => sum + p.totalSales, 0)
    const totalClients = salesPeople.reduce((sum, p) => sum + p.clientCount, 0)
    const averageSale = totalClients > 0 ? totalSales / totalClients : 0

    console.log('Sales People:', salesPeople.length)
    console.log('Total Sales:', totalSales)
    console.log('Total Clients:', totalClients)
    console.log('=== End Debug ===')

    return NextResponse.json({
      totalSales,
      totalClients,
      averageSale,
      salesPeople: salesPeople.sort((a, b) => b.totalSales - a.totalSales)
    })
  } catch (error) {
    console.error('Error fetching sales dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales dashboard data' },
      { status: 500 }
    )
  }
}
