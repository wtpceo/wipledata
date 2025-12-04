import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

// GET: 포커스미디어 매출 데이터 조회 및 분석
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7)

    // 원본데이터에서 데이터 읽기
    const data = await readFromSheet('원본데이터!A2:Y')

    console.log('=== Focus Media Debug ===')
    console.log('Total rows:', data?.length || 0)

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [], summary: null })
    }

    // 디버그: 첫 몇 행의 F열(상품명) 값 확인
    console.log('Sample product names (F열):')
    data.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i + 2}: F열="${row[5]}", H열="${row[7]}", O열="${row[14]}"`)
    })

    // 포커스미디어 데이터만 필터링
    // F열(인덱스 5): 마케팅 매체 상품명, H열(인덱스 7): 계약금액, O열(인덱스 14): 계약날짜
    const focusMediaData = data
      .map((row, index) => {
        const productName = row[5] || ''

        // 포커스미디어 포함 여부 체크 (대소문자 무시)
        if (!productName.toLowerCase().includes('포커스미디어')) return null

        console.log(`Found 포커스미디어 at row ${index + 2}: ${row[4]}, ${productName}, ${row[7]}`)

        const totalAmount = parseInt(String(row[7] || '0').replace(/,/g, ''))
        const outsourcingCost = parseInt(String(row[10] || '0').replace(/,/g, ''))
        const netProfit = totalAmount - outsourcingCost

        return {
          id: `focus-${index + 2}`,
          timestamp: row[0] || '',
          department: row[1] || '',
          inputPerson: row[2] || '', // C열: 입력자
          salesType: row[3] || '', // D열: 신규/연장
          clientName: row[4] || '', // E열: 광고주명
          productName: productName, // F열: 상품명
          contractPeriod: row[6] || '', // G열: 계약기간
          totalAmount: totalAmount, // H열: 계약금액
          paymentMethod: row[8] || '', // I열: 결제방식
          outsourcingCost: outsourcingCost, // K열: 외주비
          netProfit: netProfit,
          contractDate: row[14] || '', // O열: 계약날짜
          contractEndDate: row[15] || '', // P열: 계약종료일
          inputMonth: row[18] || '', // S열: 입력년월
          marketingManager: row[20] || '', // U열: 마케팅담당자
          onlineCheckRequested: row[21] || 'N', // V열: 온라인점검여부
          onlineCheckDateTime: row[22] || '', // W열: 점검일시
          clientAddress: row[23] || '', // X열: 주소
          clientContact: row[24] || '', // Y열: 연락처
        }
      })
      .filter(item => item !== null)

    console.log('Found focus media items:', focusMediaData.length)

    // 월별 필터링 (O열 계약날짜 기준)
    const filteredByMonth = month === 'all'
      ? focusMediaData
      : focusMediaData.filter(item => {
          if (!item) return false

          const contractDate = item.contractDate
          if (!contractDate) return false

          // 다양한 날짜 형식 처리
          let dateMonth = ''

          // YYYY-MM-DD 형식
          if (contractDate.includes('-')) {
            dateMonth = contractDate.substring(0, 7) // YYYY-MM
          }
          // YYYY.MM.DD 형식
          else if (contractDate.includes('.')) {
            const parts = contractDate.split('.')
            if (parts.length >= 2) {
              dateMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`
            }
          }
          // MM/DD/YYYY 형식
          else if (contractDate.includes('/')) {
            const parts = contractDate.split('/')
            if (parts.length === 3) {
              dateMonth = `${parts[2]}-${parts[0].padStart(2, '0')}`
            }
          }

          console.log(`Filter check: contractDate=${contractDate}, dateMonth=${dateMonth}, target=${month}`)
          return dateMonth === month
        })

    console.log(`Filtered by month ${month}: ${filteredByMonth.length} items`)

    // 통계 계산
    const totalSales = filteredByMonth.reduce((sum, item) => sum + (item?.totalAmount || 0), 0)
    const totalOutsourcing = filteredByMonth.reduce((sum, item) => sum + (item?.outsourcingCost || 0), 0)
    const totalNetProfit = filteredByMonth.reduce((sum, item) => sum + (item?.netProfit || 0), 0)
    const totalContracts = filteredByMonth.length

    // 신규/연장 구분
    const newContracts = filteredByMonth.filter(item => item?.salesType === '신규').length
    const renewalContracts = filteredByMonth.filter(item => item?.salesType === '연장').length

    // 온라인 점검 희망 업체
    const onlineCheckRequested = filteredByMonth.filter(item => item?.onlineCheckRequested === 'Y').length

    // 담당자별 실적
    const managerStats: { [key: string]: { count: number; amount: number } } = {}
    filteredByMonth.forEach(item => {
      if (item?.inputPerson) {
        if (!managerStats[item.inputPerson]) {
          managerStats[item.inputPerson] = { count: 0, amount: 0 }
        }
        managerStats[item.inputPerson].count++
        managerStats[item.inputPerson].amount += item.totalAmount
      }
    })

    // 월별 추이 (최근 6개월) - O열 계약날짜 기준
    const monthlyTrend: { month: string; amount: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(month + '-01')
      trendDate.setMonth(trendDate.getMonth() - i)
      const trendMonth = trendDate.toISOString().substring(0, 7)

      const monthData = focusMediaData.filter(item => {
        if (!item) return false
        const contractDate = item.contractDate
        if (!contractDate) return false

        let dateMonth = ''
        if (contractDate.includes('-')) {
          dateMonth = contractDate.substring(0, 7)
        } else if (contractDate.includes('.')) {
          const parts = contractDate.split('.')
          if (parts.length >= 2) {
            dateMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`
          }
        } else if (contractDate.includes('/')) {
          const parts = contractDate.split('/')
          if (parts.length === 3) {
            dateMonth = `${parts[2]}-${parts[0].padStart(2, '0')}`
          }
        }

        return dateMonth === trendMonth
      })

      monthlyTrend.push({
        month: trendMonth,
        amount: monthData.reduce((sum, item) => sum + (item?.totalAmount || 0), 0),
        count: monthData.length
      })
    }

    // 계약 주수별 분포
    const weekDistribution: { [key: string]: number } = {}
    filteredByMonth.forEach(item => {
      if (item?.contractPeriod) {
        const period = item.contractPeriod
        weekDistribution[period] = (weekDistribution[period] || 0) + 1
      }
    })

    return NextResponse.json({
      data: filteredByMonth.sort((a, b) => (b?.totalAmount || 0) - (a?.totalAmount || 0)),
      summary: {
        totalSales,
        totalOutsourcing,
        totalNetProfit,
        totalContracts,
        newContracts,
        renewalContracts,
        onlineCheckRequested,
        avgContractAmount: totalContracts > 0 ? Math.round(totalSales / totalContracts) : 0,
      },
      managerStats: Object.entries(managerStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.amount - a.amount),
      monthlyTrend,
      weekDistribution: Object.entries(weekDistribution)
        .map(([period, count]) => ({ period, count }))
        .sort((a, b) => b.count - a.count),
      currentMonth: month,
    })
  } catch (error) {
    console.error('Error fetching focus media data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch focus media data' },
      { status: 500 }
    )
  }
}
