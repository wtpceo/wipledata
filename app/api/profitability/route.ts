import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET() {
  try {
    // 원본데이터 탭에서 매출 데이터 읽기
    const salesData = await readFromSheet('원본데이터!A:T')

    // Purchase 탭에서 매입 데이터 읽기 (가정: Purchase 시트가 있다고 가정)
    // 실제 시트 구조에 맞게 수정 필요
    let purchaseData: any[] = []
    try {
      purchaseData = await readFromSheet('Purchase!A:Z')
    } catch (error) {
      console.log('Purchase 시트가 없거나 읽을 수 없습니다.')
    }

    // 헤더 제거
    const salesRows = salesData.slice(1)
    const purchaseRows = purchaseData.slice(1)

    // 매출 집계 (총 계약금액 컬럼: 인덱스 7)
    let totalRevenue = 0
    const monthlyRevenue: { [key: string]: number } = {}

    salesRows.forEach(row => {
      const amountStr = row[7]?.toString().replace(/[^0-9.-]/g, '') || '0'
      const amount = parseFloat(amountStr) || 0
      const dateStr = row[14]?.trim() || '' // 계약날짜

      if (amount > 0) {
        totalRevenue += amount

        // 월별 집계
        if (dateStr) {
          try {
            const monthKey = dateStr.substring(0, 7) // YYYY-MM
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + amount
          } catch (error) {
            console.error('Date parsing error:', dateStr)
          }
        }
      }
    })

    // 매입 집계 (Purchase 시트 구조에 따라 조정 필요)
    let totalPurchase = 0
    const monthlyPurchase: { [key: string]: number } = {}

    purchaseRows.forEach(row => {
      // Purchase 시트 구조를 확인하여 적절한 인덱스 사용
      // 예시: 금액이 5번 인덱스, 날짜가 1번 인덱스라고 가정
      const amountStr = row[5]?.toString().replace(/[^0-9.-]/g, '') || '0'
      const amount = parseFloat(amountStr) || 0
      const dateStr = row[1]?.trim() || ''

      if (amount > 0) {
        totalPurchase += amount

        // 월별 집계
        if (dateStr) {
          try {
            const monthKey = dateStr.substring(0, 7) // YYYY-MM
            monthlyPurchase[monthKey] = (monthlyPurchase[monthKey] || 0) + amount
          } catch (error) {
            console.error('Date parsing error:', dateStr)
          }
        }
      }
    })

    // 순이익 계산
    const totalProfit = totalRevenue - totalPurchase
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const isPositive = totalProfit >= 0

    // 월별 데이터 생성
    const allMonths = new Set([
      ...Object.keys(monthlyRevenue),
      ...Object.keys(monthlyPurchase)
    ])

    const monthlyData = Array.from(allMonths)
      .sort()
      .reverse()
      .slice(0, 12) // 최근 12개월
      .map(month => {
        const revenue = monthlyRevenue[month] || 0
        const purchase = monthlyPurchase[month] || 0
        const profit = revenue - purchase
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0

        return {
          month,
          revenue,
          purchase,
          profit,
          margin
        }
      })

    return NextResponse.json({
      totalRevenue,
      totalPurchase,
      totalProfit,
      profitMargin,
      isPositive,
      monthlyData
    })
  } catch (error) {
    console.error('Error fetching profitability data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profitability data' },
      { status: 500 }
    )
  }
}
