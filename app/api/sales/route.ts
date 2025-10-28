import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet, SHEETS } from '@/lib/google-sheets'

// GET: 매출 데이터 조회
export async function GET(request: NextRequest) {
  try {
    // TODO: Enable authentication once auth is properly configured
    // const session = await auth()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const department = searchParams.get('department')

    // Google Sheets에서 데이터 읽기
    const data = await readFromSheet(`${SHEETS.SALES}!A2:J`)

    // 데이터 파싱 및 필터링
    const sales = data.map((row, index) => ({
      id: `sale-${index + 2}`,
      date: row[0] || '',
      department: row[1] || '',
      inputUser: row[2] || '',
      contractType: row[3] || '',
      clientName: row[4] || '',
      productName: row[5] || '',
      contractMonths: parseInt(row[6]) || 0,
      monthlyAmount: parseInt(row[7]) || 0,
      totalAmount: parseInt(row[8]) || 0,
      salesPerson: row[9] || '',
    }))

    // 필터링 적용
    let filteredSales = sales

    if (startDate) {
      filteredSales = filteredSales.filter(sale => sale.date >= startDate)
    }

    if (endDate) {
      filteredSales = filteredSales.filter(sale => sale.date <= endDate)
    }

    if (department) {
      filteredSales = filteredSales.filter(sale => sale.department === department)
    }

    return NextResponse.json({
      data: filteredSales,
      total: filteredSales.length,
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}

// POST: 새 매출 데이터 등록
export async function POST(request: NextRequest) {
  try {
    // TODO: Enable authentication once auth is properly configured
    // const session = await auth()
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const {
      // 섹션 1: 입력자 정보
      department,
      inputPerson,

      // 섹션 2: 계약정보
      contractDate,
      salesType,
      clientName,
      productName,
      productOther,
      contractMonths,

      // 섹션 3: 결제 정보
      totalAmount,
      paymentMethod,
      paymentMethodOther,
      approvalNumber,
      outsourcingCost,

      // 섹션 4: 상세 내용
      consultationContent,
      specialNotes,
    } = body

    // 현재 날짜와 시간
    const now = new Date().toISOString()

    // 최종 상품명 결정 (기타 선택 시 productOther 값 사용)
    const finalProductName = productName === '기타' ? productOther : productName

    // 최종 결제 방식 결정 (기타 선택 시 paymentMethodOther 값 사용)
    const finalPaymentMethod = paymentMethod === '기타' ? paymentMethodOther : paymentMethod

    // Google Sheets에 데이터 쓰기
    // Sales 시트 컬럼 구조
    const salesRow = [
      contractDate,
      department,
      inputPerson,
      salesType,
      clientName,
      finalProductName,
      contractMonths.toString(),
      '', // 월 계약금액 (계산 필요시 추가)
      totalAmount.toString(),
      finalPaymentMethod,
      approvalNumber || '',
      outsourcingCost ? outsourcingCost.toString() : '0',
      consultationContent || '',
      specialNotes || '',
      now, // 생성일시
      now, // 수정일시
    ]

    // 원본데이터 탭 구조 (스크린샷 기준)
    // 타임스탬프, 부서, 입력자, 매출 유형, 광고주 업체명, 마케팅 매체 상품명,
    // 계약 개월 수, 총 계약금액, 결제 방식, 결제 승인 번호,
    // 확정 외주비, 광고주 상담 내용, 특이사항, 계약서 파일및 기타 자료,
    // 계약날짜, 계약종료일, 월 평균 금액, 순수익, 입력 년 월, 분기
    const monthlyAmount = Math.round(totalAmount / contractMonths)
    const netProfit = totalAmount - (outsourcingCost || 0)
    const contractEndDate = new Date(contractDate)
    contractEndDate.setMonth(contractEndDate.getMonth() + contractMonths)
    const inputYearMonth = contractDate.substring(0, 7) // YYYY-MM
    const quarter = `${contractDate.substring(0, 4)}-Q${Math.ceil((new Date(contractDate).getMonth() + 1) / 3)}`

    const rawDataRow = [
      now, // 타임스탬프
      department, // 부서
      inputPerson, // 입력자
      salesType, // 매출 유형
      clientName, // 광고주 업체명
      finalProductName, // 마케팅 매체 상품명
      contractMonths.toString(), // 계약 개월 수
      totalAmount.toString(), // 총 계약금액
      finalPaymentMethod, // 결제 방식
      approvalNumber || '', // 결제 승인 번호
      outsourcingCost ? outsourcingCost.toString() : '0', // 확정 외주비
      consultationContent || '', // 광고주 상담 내용
      specialNotes || '', // 특이사항
      '', // 계약서 파일및 기타 자료 (파일 업로드는 별도 처리 필요)
      contractDate, // 계약날짜
      contractEndDate.toISOString().split('T')[0], // 계약종료일
      monthlyAmount.toString(), // 월 평균 금액
      netProfit.toString(), // 순수익
      inputYearMonth, // 입력 년 월
      quarter, // 분기
    ]

    // Sales 시트와 원본데이터 탭에 동시에 쓰기
    try {
      console.log('=== Writing to Google Sheets ===')
      console.log('Sales row:', salesRow)
      console.log('Raw data row:', rawDataRow)

      const results = await Promise.all([
        writeToSheet(`${SHEETS.SALES}!A:P`, [salesRow]),
        writeToSheet('원본데이터!A:T', [rawDataRow])
      ])

      console.log('✅ Successfully written to both sheets')
      console.log('Sales result:', results[0])
      console.log('원본데이터 result:', results[1])
    } catch (writeError) {
      console.error('❌ Error writing to sheets:', writeError)
      throw writeError
    }

    return NextResponse.json({
      success: true,
      message: '매출이 성공적으로 등록되었습니다.',
    })
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}