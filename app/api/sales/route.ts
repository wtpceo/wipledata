import { NextRequest, NextResponse, after } from 'next/server'
import { writeToSheet, readFromSheet, SHEETS, touchLastModified, applyBorderFormat } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'
import { notifyNewSale } from '@/lib/solapi'
import { randomUUID } from 'crypto'

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
      productNames,
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

      // 매체별 계약정보 (매체명 → { complexName, installCount, unitPrice, monthlyPrice })
      mediaContractsByMedia,

      // 하위 호환: 기존 단일 필드
      mediaComplexName,
      mediaInstallCount,
      mediaUnitPrice,
      mediaMonthlyPrice,

      // 입금자명 (입금예정 선택 시)
      depositorName,

      // 매체별 금액 { 매체명: 금액 }
      mediaAmounts,
    } = body

    // 하위 호환: 기존 단일 필드가 오면 폴백용 객체 생성
    const legacyContract = mediaComplexName ? {
      complexName: mediaComplexName,
      installCount: mediaInstallCount,
      unitPrice: mediaUnitPrice,
      monthlyPrice: mediaMonthlyPrice,
    } : null

    // 현재 날짜와 시간
    const now = new Date().toISOString()

    // 매체 목록: mediaAmounts의 키 또는 productNames 배열에서 추출
    const mediaKeys: string[] = mediaAmounts && Object.keys(mediaAmounts).length > 0
      ? Object.keys(mediaAmounts as Record<string, number>)
      : (productNames || [])

    // 최종 상품명 결정 (기타 선택 시 productOther 값 사용)
    let finalProductName = mediaKeys
      .map((p: string) => (p === '기타' && productOther) ? productOther : p)
      .join(', ')

    // 최종 결제 방식 결정 (기타 선택 시 paymentMethodOther 값 사용)
    const finalPaymentMethod = paymentMethod === '기타' ? paymentMethodOther : paymentMethod

    // 포커스미디어만 주 단위, 나머지는 개월 단위
    const isFocusMedia = mediaKeys.includes('포커스미디어')

    // 계약 기간 표시 (개월 또는 주)
    const contractPeriod = isFocusMedia && contractWeeks
      ? `${contractWeeks}주`
      : contractMonths ? `${contractMonths}개월` : ''

    // 계산 필드 (salesRow, rawDataRow 공용)
    const effectiveMonths = contractMonths || (contractWeeks ? Math.ceil(contractWeeks / 4) : 1)
    const monthlyAmount = Math.round(totalAmount / effectiveMonths)
    const netProfit = totalAmount - (outsourcingCost || 0)
    const contractEndDate = new Date(contractDate)
    if (isFocusMedia && contractWeeks) {
      contractEndDate.setDate(contractEndDate.getDate() + (contractWeeks * 7))
    } else {
      contractEndDate.setMonth(contractEndDate.getMonth() + (contractMonths || 0))
    }
    const inputYearMonth = contractDate.substring(0, 7) // YYYY-MM
    const quarter = `${contractDate.substring(0, 4)}-Q${Math.ceil((new Date(contractDate).getMonth() + 1) / 3)}`

    // 고유 계약 ID 생성 (매체별 행 묶음 식별용)
    const contractId = randomUUID()

    // 매체별 행 목록 생성
    // mediaAmounts: { 매체명: 금액 } 형태로 전달됨
    const mediaEntries: [string, number][] = mediaAmounts && Object.keys(mediaAmounts).length > 0
      ? Object.entries(mediaAmounts as Record<string, number>)
      : [[finalProductName, totalAmount]]

    // 매체명으로 해당 매체의 계약정보 조회 (하위 호환 폴백 포함)
    const getMediaInfo = (productName: string) => {
      if (mediaContractsByMedia && mediaContractsByMedia[productName]) {
        return mediaContractsByMedia[productName]
      }
      return legacyContract || { complexName: '', installCount: '', unitPrice: '', monthlyPrice: '' }
    }

    // Google Sheets에 데이터 쓰기 - 매체별 행 분리
    // 외주비는 첫 번째 행에만 기록 (중복 집계 방지)
    // Sales 시트 컬럼 구조 (A:AE, AE열=contractId 추가)
    const buildSalesRow = (productNameForRow: string, amountForRow: number, isFirst: boolean) => {
      const rowMonthlyAmount = Math.round(amountForRow / effectiveMonths)
      const rowOutsourcingCost = isFirst ? (outsourcingCost || 0) : 0
      const rowNetProfit = amountForRow - rowOutsourcingCost
      const mediaInfo = getMediaInfo(productNameForRow)
      return [
        contractDate,
        department,
        inputPerson,
        salesType,
        clientName,
        productNameForRow,              // F: 단일 매체명
        contractPeriod,                 // G: 개월 또는 주 단위로 표시
        '',                             // H: 월 계약금액 (계산 필요시 추가)
        amountForRow.toString(),        // I: 해당 매체의 금액
        finalPaymentMethod,
        approvalNumber || '',
        rowOutsourcingCost.toString(),  // L: 외주비 (첫 행에만)
        consultationContent || '',
        specialNotes || '',
        now,    // O: 생성일시
        now,    // P: 수정일시
        '',     // Q: 마케팅 담당자 (추후 배정)
        onlineCheckRequested ? 'Y' : 'N',
        onlineCheckDateTime || '',
        clientAddress || '',
        clientContact || '',
        mediaInfo.complexName || '',
        mediaInfo.installCount ? `'${mediaInfo.installCount.toString()}` : '',
        mediaInfo.unitPrice ? `'${mediaInfo.unitPrice.toString()}` : '',
        mediaInfo.monthlyPrice ? `'${mediaInfo.monthlyPrice.toString()}` : '',
        depositorName || '',
        contractEndDate.toISOString().split('T')[0],
        rowMonthlyAmount.toString(),    // AB: 월평균금액
        rowNetProfit.toString(),        // AC: 순수익
        inputYearMonth,
        contractId,                     // AE: 계약 묶음 ID (신규)
      ]
    }

    // 원본데이터 시트 컬럼 구조 (A:AH, AH열=contractId 추가)
    const buildRawDataRow = (productNameForRow: string, amountForRow: number, isFirst: boolean) => {
      const rowMonthlyAmount = Math.round(amountForRow / effectiveMonths)
      const rowOutsourcingCost = isFirst ? (outsourcingCost || 0) : 0
      const rowNetProfit = amountForRow - rowOutsourcingCost
      const mediaInfo = getMediaInfo(productNameForRow)
      return [
        now,                                // A: 타임스탬프
        department,                         // B: 부서
        normalizeStaffName(inputPerson),    // C: 입력자
        salesType,                          // D: 매출 유형
        clientName,                         // E: 광고주 업체명
        productNameForRow,                  // F: 단일 매체명
        contractPeriod,                     // G: 계약 기간
        amountForRow.toString(),            // H: 해당 매체의 금액
        finalPaymentMethod,                 // I: 결제 방식
        approvalNumber || '',               // J: 결제 승인 번호
        rowOutsourcingCost.toString(),      // K: 확정 외주비 (첫 행에만)
        consultationContent || '',          // L: 광고주 상담 내용
        specialNotes || '',                 // M: 특이사항
        '',                                 // N: 계약서 파일 (별도 처리 필요)
        contractDate,                       // O: 계약날짜
        contractEndDate.toISOString().split('T')[0], // P: 계약종료일
        rowMonthlyAmount.toString(),        // Q: 월 평균 금액
        rowNetProfit.toString(),            // R: 순수익
        inputYearMonth,                     // S: 입력 년 월
        quarter,                            // T: 분기
        '',                                 // U: 마케팅 담당자 (추후 배정)
        onlineCheckRequested ? 'Y' : 'N',  // V: 온라인 점검 희망 여부
        onlineCheckDateTime || '',          // W: 온라인 점검 희망 일시
        clientAddress || '',               // X: 광고주 주소
        clientContact || '',               // Y: 광고주 연락처
        '',                                // Z: 점검상태
        '',                                // AA: 처리메모
        mediaInfo.complexName || '',       // AB: 단지명
        mediaInfo.installCount ? `'${mediaInfo.installCount.toString()}` : '', // AC: 설치대수
        mediaInfo.unitPrice ? `'${mediaInfo.unitPrice.toString()}` : '',       // AD: 대당단가
        mediaInfo.monthlyPrice ? `'${mediaInfo.monthlyPrice.toString()}` : '', // AE: 월단가
        depositorName || '',               // AF: 입금자명
        '',                                // AG: 입금완료날짜 (수동 입력)
        contractId,                        // AH: 계약 묶음 ID (신규)
      ]
    }

    const salesRows = mediaEntries.map(([product, amount], idx) => buildSalesRow(product, amount, idx === 0))
    const rawDataRows = mediaEntries.map(([product, amount], idx) => buildRawDataRow(product, amount, idx === 0))

    // Sales 시트와 원본데이터 탭에 동시에 쓰기
    try {
      console.log('=== Writing to Google Sheets ===')
      console.log('Number of rows:', salesRows.length, '(contractId:', contractId, ')')

      // 테두리 포맷팅을 위해 Sales 시트의 현재 마지막 행 번호 파악
      const existingSalesData = await readFromSheet(`${SHEETS.SALES}!A:A`)
      const salesStartRow = existingSalesData.length + 1

      const results = await Promise.all([
        writeToSheet(`${SHEETS.SALES}!A:AE`, salesRows),
        writeToSheet('원본데이터!A:AH', rawDataRows)
      ])

      console.log('✅ Successfully written to both sheets')
      console.log('Sales result:', results[0])
      console.log('원본데이터 result:', results[1])

      // 2개 이상 매체일 경우 테두리 포맷팅으로 같은 계약 시각화
      if (salesRows.length > 1) {
        const salesEndRow = salesStartRow + salesRows.length - 1
        await applyBorderFormat(SHEETS.SALES, salesStartRow, salesEndRow)
        console.log(`✅ Border applied to rows ${salesStartRow}~${salesEndRow}`)
      }
    } catch (writeError) {
      console.error('❌ Error writing to sheets:', writeError)
      throw writeError
    }

    await touchLastModified()

    // 알림 발송: after()로 응답 반환 후 백그라운드 실행 (Vercel 함수 타임아웃 방지)
    let notificationNotes = specialNotes || ''
    if (finalPaymentMethod === '입금예정') {
      const depositInfo = `💰 입금예정${depositorName ? ` (입금자: ${depositorName})` : ''}`
      notificationNotes = notificationNotes ? `${depositInfo} / ${notificationNotes}` : depositInfo
    }

    // 알림 발송: after()로 응답 반환 후 백그라운드 실행 (Vercel 타임아웃 방지)
    after(async () => {
      try {
        await notifyNewSale({
          inputPerson,
          department,
          clientName,
          productName: finalProductName,
          totalAmount,
          salesType,
          specialNotes: notificationNotes,
        })
        console.log('✅ 매출 등록 알림 발송 성공:', clientName)
      } catch (notifyError) {
        console.error('❌ 매출 등록 알림 발송 실패:', notifyError)
      }
    })

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