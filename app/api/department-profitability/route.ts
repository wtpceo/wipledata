import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET() {
  try {
    // 원본데이터 탭에서 매출 데이터 읽기
    const salesData = await readFromSheet('원본데이터!A:T')

    // Purchase 탭에서 매입 데이터 읽기
    let purchaseData: any[] = []
    try {
      purchaseData = await readFromSheet('Purchase!A:Z')
    } catch (error) {
      console.log('Purchase 시트가 없거나 읽을 수 없습니다.')
    }

    // 헤더 제거
    const salesRows = salesData.slice(1)
    const purchaseRows = purchaseData.slice(1)

    // 부서별 매출 집계
    const departmentRevenue: { [key: string]: number } = {}

    salesRows.forEach(row => {
      const department = row[1]?.trim() || '미분류' // 부서 (인덱스 1)
      const amountStr = row[7]?.toString().replace(/[^0-9.-]/g, '') || '0' // 총 계약금액 (인덱스 7)
      const amount = parseFloat(amountStr) || 0

      if (amount > 0) {
        departmentRevenue[department] = (departmentRevenue[department] || 0) + amount
      }
    })

    // 부서별 매입 집계 (Purchase 시트 구조에 따라 조정)
    const departmentPurchase: { [key: string]: number } = {}

    purchaseRows.forEach(row => {
      // Purchase 시트에서 부서 정보 확인 (예: 인덱스 2)
      const department = row[2]?.trim() || '미분류'
      const amountStr = row[5]?.toString().replace(/[^0-9.-]/g, '') || '0'
      const amount = parseFloat(amountStr) || 0

      if (amount > 0) {
        departmentPurchase[department] = (departmentPurchase[department] || 0) + amount
      }
    })

    // 모든 부서 목록
    const allDepartments = new Set([
      ...Object.keys(departmentRevenue),
      ...Object.keys(departmentPurchase)
    ])

    // 부서별 수익성 계산
    const departments = Array.from(allDepartments).map(department => {
      const revenue = departmentRevenue[department] || 0
      const purchase = departmentPurchase[department] || 0
      const profit = revenue - purchase
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
      const isPositive = profit >= 0

      return {
        department,
        revenue,
        purchase,
        profit,
        profitMargin,
        isPositive
      }
    })

    // 순이익 기준으로 정렬 (높은 순)
    departments.sort((a, b) => b.profit - a.profit)

    // 흑자/적자 부서 분류
    const positiveDepartments = departments.filter(d => d.isPositive)
    const negativeDepartments = departments.filter(d => !d.isPositive)

    return NextResponse.json({
      departments,
      positiveDepartments,
      negativeDepartments
    })
  } catch (error) {
    console.error('Error fetching department profitability data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch department profitability data' },
      { status: 500 }
    )
  }
}
