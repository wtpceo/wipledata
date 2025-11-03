import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET() {
  try {
    // clients 탭에서 모든 데이터 읽기
    const data = await readFromSheet('clients!A:Z')

    if (!data || data.length === 0) {
      return NextResponse.json({
        claimClients: [],
        summary: {
          totalCount: 0,
          totalAmount: 0,
          byDepartment: {},
          byAE: {}
        }
      })
    }

    // 헤더 행 제거
    const headers = data[0]
    const rows = data.slice(1)

    console.log('=== Claim Dashboard Debug ===')
    console.log('Headers:', headers)

    // A열: 상태, B열: 광고주명, C열: 담당 AE, D열: 서비스 시작일, E열: 서비스 종료일,
    // F열: 계약 개월, G열: 계약 금액, H열: 매체, I열: 부서
    const claimClients = rows
      .filter(row => {
        const status = row[0]?.trim()
        return status === '클라임'
      })
      .map(row => ({
        status: row[0] || '',
        clientName: row[1] || '',
        ae: row[2] || '',
        startDate: row[3] || '',
        endDate: row[4] || '',
        contractMonths: parseInt(row[5]) || 0,
        contractAmount: parseFloat(String(row[6] || '0').replace(/[^0-9.-]/g, '')) || 0,
        product: row[7] || '',
        department: row[8] || '',
        claimReason: row[9] || '', // J열: 클라임 사유 (있다면)
        claimDate: row[10] || '' // K열: 클라임 발생일 (있다면)
      }))

    console.log('Claim clients found:', claimClients.length)

    // 통계 계산
    const totalCount = claimClients.length
    const totalAmount = claimClients.reduce((sum, client) => sum + client.contractAmount, 0)

    // 부서별 집계
    const byDepartment: { [key: string]: { count: number; amount: number } } = {}
    claimClients.forEach(client => {
      if (client.department) {
        if (!byDepartment[client.department]) {
          byDepartment[client.department] = { count: 0, amount: 0 }
        }
        byDepartment[client.department].count++
        byDepartment[client.department].amount += client.contractAmount
      }
    })

    // AE별 집계
    const byAE: { [key: string]: { count: number; amount: number; clients: string[] } } = {}
    claimClients.forEach(client => {
      if (client.ae) {
        if (!byAE[client.ae]) {
          byAE[client.ae] = { count: 0, amount: 0, clients: [] }
        }
        byAE[client.ae].count++
        byAE[client.ae].amount += client.contractAmount
        byAE[client.ae].clients.push(client.clientName)
      }
    })

    // 매체별 집계
    const byProduct: { [key: string]: { count: number; amount: number } } = {}
    claimClients.forEach(client => {
      if (client.product) {
        if (!byProduct[client.product]) {
          byProduct[client.product] = { count: 0, amount: 0 }
        }
        byProduct[client.product].count++
        byProduct[client.product].amount += client.contractAmount
      }
    })

    return NextResponse.json({
      claimClients: claimClients.sort((a, b) => b.contractAmount - a.contractAmount),
      summary: {
        totalCount,
        totalAmount,
        byDepartment,
        byAE,
        byProduct
      }
    })
  } catch (error) {
    console.error('Error fetching claim dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claim dashboard data' },
      { status: 500 }
    )
  }
}
