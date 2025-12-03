import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet, SHEETS } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

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
      clientAddress, // 광고주 주소
      clientContact, // 광고주 연락처
      productName,
      productOther,
      contractMonths,
      contractWeeks, // 옥외매체용 주 단위

      // 섹션 3: 결제 정보
      totalAmount,
      paymentMethod,
      paymentMethodOther,
      approvalNumber,
      outsourcingCost,

      // 섹션 4: 상세 내용
      consultationContent,
      specialNotes,

      // 섹션 5: 온라인 점검 (옥외매체 전용)
      onlineCheckRequested,
      onlineCheckDateTime,
    } = body

    // 현재 날짜와 시간
    const now = new Date().toISOString()

    // 최종 상품명 결정 (기타 선택 시 productOther 값 사용)
    // productName이 배열인 경우 (중복 선택) 처리
    let finalProductName = productName
    if (productName && productName.includes('기타') && productOther) {
      finalProductName = productName.replace('기타', productOther)
    }

    // 최종 결제 방식 결정 (기타 선택 시 paymentMethodOther 값 사용)
    const finalPaymentMethod = paymentMethod === '기타' ? paymentMethodOther : paymentMethod

    // 옥외매체 여부 확인
    const isOutdoorMedia = productName && (productName.includes('포커스미디어') || productName.includes('타운보드'))

    // 계약 기간 표시 (개월 또는 주)
    const contractPeriod = isOutdoorMedia && contractWeeks
      ? `${contractWeeks}주`
      : contractMonths ? `${contractMonths}개월` : ''

    // Google Sheets에 데이터 쓰기
    // Sales 시트 기존 컬럼 구조 유지 (주소/연락처는 맨 뒤에 추가)
    const salesRow = [
      contractDate,
      department,
      inputPerson,
      salesType,
      clientName,
      finalProductName,
      contractPeriod, // 개월 또는 주 단위로 표시
      '', // 월 계약금액 (계산 필요시 추가)
      totalAmount.toString(),
      finalPaymentMethod,
      approvalNumber || '',
      outsourcingCost ? outsourcingCost.toString() : '0',
      consultationContent || '',
      specialNotes || '',
      now, // 생성일시
      now, // 수정일시
      onlineCheckRequested ? 'Y' : 'N', // 온라인 점검 희망 여부
      onlineCheckDateTime || '', // 온라인 점검 희망 일시
      clientAddress || '', // 광고주 주소 (신규 추가)
      clientContact || '', // 광고주 연락처 (신규 추가)
    ]

    // 원본데이터 탭 구조 (스크린샷 기준)
    // 타임스탬프, 부서, 입력자, 매출 유형, 광고주 업체명, 마케팅 매체 상품명,
    // 계약 개월 수, 총 계약금액, 결제 방식, 결제 승인 번호,
    // 확정 외주비, 광고주 상담 내용, 특이사항, 계약서 파일및 기타 자료,
    // 계약날짜, 계약종료일, 월 평균 금액, 순수익, 입력 년 월, 분기
    const effectiveMonths = contractMonths || (contractWeeks ? Math.ceil(contractWeeks / 4) : 1)
    const monthlyAmount = Math.round(totalAmount / effectiveMonths)
    const netProfit = totalAmount - (outsourcingCost || 0)
    const contractEndDate = new Date(contractDate)
    if (isOutdoorMedia && contractWeeks) {
      contractEndDate.setDate(contractEndDate.getDate() + (contractWeeks * 7))
    } else {
      contractEndDate.setMonth(contractEndDate.getMonth() + (contractMonths || 0))
    }
    const inputYearMonth = contractDate.substring(0, 7) // YYYY-MM
    const quarter = `${contractDate.substring(0, 4)}-Q${Math.ceil((new Date(contractDate).getMonth() + 1) / 3)}`

    // 원본데이터 시트 기존 컬럼 구조 유지 (주소/연락처는 맨 뒤에 추가)
    // A: 타임스탬프, B: 부서, C: 입력자, D: 매출유형, E: 광고주명,
    // F: 상품명, G: 계약기간, H: 총금액, I: 결제방식, J: 승인번호,
    // K: 외주비, L: 상담내용, M: 특이사항, N: 파일, O: 계약날짜,
    // P: 계약종료일, Q: 월평균금액, R: 순수익, S: 입력년월, T: 분기,
    // U: 온라인점검여부, V: 온라인점검일시, W: 광고주주소, X: 광고주연락처
    const rawDataRow = [
      now, // A: 타임스탬프
      department, // B: 부서
      normalizeStaffName(inputPerson), // C: 입력자 - 정규화된 이름
      salesType, // D: 매출 유형
      clientName, // E: 광고주 업체명
      finalProductName, // F: 마케팅 매체 상품명
      contractPeriod, // G: 계약 기간 (개월 또는 주)
      totalAmount.toString(), // H: 총 계약금액
      finalPaymentMethod, // I: 결제 방식
      approvalNumber || '', // J: 결제 승인 번호
      outsourcingCost ? outsourcingCost.toString() : '0', // K: 확정 외주비
      consultationContent || '', // L: 광고주 상담 내용
      specialNotes || '', // M: 특이사항
      '', // N: 계약서 파일및 기타 자료 (파일 업로드는 별도 처리 필요)
      contractDate, // O: 계약날짜
      contractEndDate.toISOString().split('T')[0], // P: 계약종료일
      monthlyAmount.toString(), // Q: 월 평균 금액
      netProfit.toString(), // R: 순수익
      inputYearMonth, // S: 입력 년 월
      quarter, // T: 분기
      onlineCheckRequested ? 'Y' : 'N', // U: 온라인 점검 희망 여부
      onlineCheckDateTime || '', // V: 온라인 점검 희망 일시
      clientAddress || '', // W: 광고주 주소 (신규 추가)
      clientContact || '', // X: 광고주 연락처 (신규 추가)
    ]

    // Sales 시트와 원본데이터 탭에 동시에 쓰기
    try {
      console.log('=== Writing to Google Sheets ===')
      console.log('Sales row:', salesRow)
      console.log('Raw data row:', rawDataRow)

      const results = await Promise.all([
        writeToSheet(`${SHEETS.SALES}!A:T`, [salesRow]),
        writeToSheet('원본데이터!A:X', [rawDataRow])
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