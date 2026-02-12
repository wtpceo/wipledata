import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const department = searchParams.get('department')

    // 원본데이터 시트에서 데이터 읽기
    const data = await readFromSheet('원본데이터!A2:T')

    // 데이터 파싱
    const salesData = data.map((row) => {
      const department = row[1] || ''
      const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
      const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0

      // 영업부는 총계약금액 - 외주비, 나머지는 총계약금액
      const actualAmount = department === '영업부' ? (contractAmount - outsourcingCost) : contractAmount

      return {
        timestamp: row[0] || '',
        department: department,
        staff: normalizeStaffName(row[2] || ''), // 이름 정규화
        salesType: row[3] || '',
        clientName: row[4] || '',
        productName: row[5] || '',
        contractMonths: parseInt(row[6] || '0'),
        totalAmount: actualAmount,
        paymentMethod: row[8] || '',
        approvalNumber: row[9] || '',
        outsourcingCost: outsourcingCost,
        consultationContent: row[11] || '',
        specialNotes: row[12] || '',
        contractFile: row[13] || '',
        contractDate: row[14] || '',
        contractEndDate: row[15] || '',
        monthlyAmount: parseFloat(String(row[16] || '0').replace(/[^\d.-]/g, '')) || 0,
        netProfit: parseFloat(String(row[17] || '0').replace(/[^\d.-]/g, '')) || 0,
        inputYearMonth: row[18] || '',
        quarter: row[19] || ''
      }
    })

    // 필터링
    let filteredData = salesData

    if (month) {
      filteredData = filteredData.filter(s => {
        // 영업부는 S열(inputYearMonth) 사용
        if (s.department === '영업부') {
          return s.inputYearMonth === month
        } else {
          // 내근직(영업부 제외)은 A열(timestamp) 사용
          if (!s.timestamp) return false

          try {
            let saleDate: Date | null = null

            // ISO 형식 (2024-11-03T12:34:56.789Z)
            if (s.timestamp.includes('T')) {
              saleDate = new Date(s.timestamp)
            }
            // MM/DD/YYYY 형식
            else if (s.timestamp.includes('/')) {
              const parts = s.timestamp.split('/')
              if (parts.length === 3) {
                const [m, d, y] = parts
                saleDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
              }
            }
            // YYYY.MM.DD 형식
            else if (s.timestamp.includes('.')) {
              saleDate = new Date(s.timestamp.replace(/\./g, '-'))
            }
            // YYYY-MM-DD 형식
            else if (s.timestamp.includes('-')) {
              saleDate = new Date(s.timestamp)
            }

            if (saleDate && !isNaN(saleDate.getTime())) {
              const saleMonth = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`
              return saleMonth === month
            }
          } catch (error) {
            console.error('Timestamp parsing error:', s.timestamp, error)
          }
          return false
        }
      })
    }

    if (department) {
      filteredData = filteredData.filter(s => s.department === department)
    }

    // 담당자별로 그룹화하고 매출 유형별로 분석
    const staffPerformance = filteredData.reduce((acc, sale) => {
      if (!acc[sale.staff]) {
        acc[sale.staff] = {
          staff: sale.staff,
          department: sale.department,
          totalSales: 0,
          totalNetProfit: 0,
          totalContracts: 0,
          salesByType: {} as {
            [key: string]: {
              count: number
              totalAmount: number
              netProfit: number
              clients: string[]
            }
          }
        }
      }

      // 전체 합계
      acc[sale.staff].totalSales += sale.totalAmount
      acc[sale.staff].totalNetProfit += sale.netProfit
      acc[sale.staff].totalContracts += 1

      // 매출 유형별 집계
      if (!acc[sale.staff].salesByType[sale.salesType]) {
        acc[sale.staff].salesByType[sale.salesType] = {
          count: 0,
          totalAmount: 0,
          netProfit: 0,
          clients: []
        }
      }

      acc[sale.staff].salesByType[sale.salesType].count += 1
      acc[sale.staff].salesByType[sale.salesType].totalAmount += sale.totalAmount
      acc[sale.staff].salesByType[sale.salesType].netProfit += sale.netProfit
      acc[sale.staff].salesByType[sale.salesType].clients.push(sale.clientName)

      return acc
    }, {} as { [key: string]: any })

    // 배열로 변환하고 총 매출액 기준으로 정렬
    const staffRankings = Object.values(staffPerformance)
      .sort((a: any, b: any) => b.totalSales - a.totalSales)

    // 전체 통계
    const totalStats = {
      totalStaff: staffRankings.length,
      totalSales: filteredData.reduce((sum, s) => sum + s.totalAmount, 0),
      totalNetProfit: filteredData.reduce((sum, s) => sum + s.netProfit, 0),
      totalContracts: filteredData.length,
      averageSalesPerStaff: staffRankings.length > 0
        ? filteredData.reduce((sum, s) => sum + s.totalAmount, 0) / staffRankings.length
        : 0
    }

    // 매출 유형 통계 (전체)
    const salesTypeStats = filteredData.reduce((acc, sale) => {
      if (!acc[sale.salesType]) {
        acc[sale.salesType] = {
          type: sale.salesType,
          count: 0,
          totalAmount: 0,
          netProfit: 0,
          percentage: 0,
          clients: []
        }
      }
      acc[sale.salesType].count += 1
      acc[sale.salesType].totalAmount += sale.totalAmount
      acc[sale.salesType].netProfit += sale.netProfit
      // 광고주 정보 추가 (중복 제거)
      const clientInfo = {
        name: sale.clientName,
        amount: sale.totalAmount,
        staff: sale.staff
      }
      acc[sale.salesType].clients.push(clientInfo)
      return acc
    }, {} as { [key: string]: any })

    // 비율 계산
    const salesTypeArray = Object.values(salesTypeStats).map((stat: any) => ({
      ...stat,
      percentage: totalStats.totalSales > 0
        ? Math.round((stat.totalAmount / totalStats.totalSales) * 100 * 10) / 10
        : 0
    })).sort((a: any, b: any) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      staffRankings,
      totalStats,
      salesTypeStats: salesTypeArray
    })
  } catch (error) {
    console.error('Error fetching staff sales performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff sales performance data' },
      { status: 500 }
    )
  }
}