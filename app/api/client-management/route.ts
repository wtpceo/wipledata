import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    // Google Sheets에서 고객 관리 데이터 읽기
    // 시트 구조: A열(날짜), B열(광고주명), C열(담당AE), D열(상태), E열(계약종료일), F열(월계약금액), G열(비고), H열(월구분)
    const data = await readFromSheet('ClientManagement!A2:H')

    // 현재 월 기준으로 데이터 필터링
    const currentMonth = new Date().toISOString().substring(0, 7)
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().substring(0, 7)
    const monthAfterNext = new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().substring(0, 7)

    const categorizedData = {
      currentMonth: [] as any[],
      nextMonth: [] as any[],
      monthAfterNext: [] as any[],
      statistics: {
        totalActiveClients: 0,
        expiringClients: 0,
        renewedClients: 0,
        terminatedClients: 0
      }
    }

    data.forEach((row) => {
      const clientData = {
        date: row[0] || '',
        clientName: row[1] || '',
        aeName: row[2] || '',
        status: row[3] || '',
        contractEndDate: row[4] || '',
        monthlyAmount: parseFloat(String(row[5] || '0').replace(/[^\d.-]/g, '')) || 0,
        notes: row[6] || '',
        monthCategory: row[7] || ''
      }

      // 월별로 분류
      if (clientData.monthCategory === currentMonth) {
        categorizedData.currentMonth.push(clientData)
      } else if (clientData.monthCategory === nextMonth) {
        categorizedData.nextMonth.push(clientData)
      } else if (clientData.monthCategory === monthAfterNext) {
        categorizedData.monthAfterNext.push(clientData)
      }

      // 통계 계산
      if (clientData.status === 'active') categorizedData.statistics.totalActiveClients++
      if (clientData.status === 'expiring') categorizedData.statistics.expiringClients++
      if (clientData.status === 'renewed') categorizedData.statistics.renewedClients++
      if (clientData.status === 'terminated') categorizedData.statistics.terminatedClients++
    })

    return NextResponse.json(categorizedData)
  } catch (error) {
    console.error('Error fetching client management data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client management data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentMonth, nextMonth, monthAfterNext, timestamp } = body

    const currentMonthStr = new Date().toISOString().substring(0, 7)
    const nextMonthStr = new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().substring(0, 7)
    const monthAfterNextStr = new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().substring(0, 7)

    // 모든 데이터를 하나의 배열로 합치기
    const allData: any[][] = []

    // 현재 월 데이터
    currentMonth.forEach((client: any) => {
      allData.push([
        timestamp,
        client.clientName,
        client.aeName,
        client.status,
        client.contractEndDate,
        client.monthlyAmount,
        client.notes,
        currentMonthStr
      ])
    })

    // 다음 월 데이터
    nextMonth.forEach((client: any) => {
      allData.push([
        timestamp,
        client.clientName,
        client.aeName,
        client.status,
        client.contractEndDate,
        client.monthlyAmount,
        client.notes,
        nextMonthStr
      ])
    })

    // 다다음 월 데이터
    monthAfterNext.forEach((client: any) => {
      allData.push([
        timestamp,
        client.clientName,
        client.aeName,
        client.status,
        client.contractEndDate,
        client.monthlyAmount,
        client.notes,
        monthAfterNextStr
      ])
    })

    // Google Sheets에 데이터 저장
    if (allData.length > 0) {
      await writeToSheet('ClientManagement!A:H', allData)
    }

    return NextResponse.json({
      success: true,
      message: '고객 관리 데이터가 저장되었습니다.',
      count: allData.length
    })
  } catch (error) {
    console.error('Error saving client management data:', error)
    return NextResponse.json(
      { error: 'Failed to save client management data' },
      { status: 500 }
    )
  }
}