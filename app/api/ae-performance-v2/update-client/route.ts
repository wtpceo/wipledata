import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleAuth, readFromSheet, writeToSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'
import { notifyNewSale } from '@/lib/solapi'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 날짜 파싱
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    // YYYY.MM.DD 형식
    if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('.')
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }

    return new Date(dateStr)
  } catch {
    return null
  }
}

// 날짜를 YYYY.MM.DD 형식으로 포맷
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 담당자 이름 추출 (이메일 제거)
function extractAEName(aeString: string): string[] {
  if (!aeString) return []

  const aes = aeString.split(',').map(ae => ae.trim())

  return aes.map(ae => {
    const match = ae.match(/^([^(]+)/)
    return match ? match[1].trim() : ae
  })
}

// 연장 성공 처리
async function handleRenewalSuccess(
  rowIndex: number,
  currentEndDate: string,
  renewalMonths: number,
  renewalWeeks: number,
  renewalAmount: number,
  clientName: string,
  aeString: string,
  productName: string,
  productOther: string,
  paymentMethod: string,
  paymentMethodOther: string,
  approvalNumber: string,
  outsourcingCost: number,
  depositorName: string
) {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // 현재 종료일 파싱
  const endDate = parseDate(currentEndDate)
  if (!endDate) {
    throw new Error('Invalid end date format')
  }

  // 포커스미디어만 주 단위, 나머지는 개월 단위
  const finalProductName_temp = productName === '기타' ? productOther : productName
  const isFocusMedia = finalProductName_temp && finalProductName_temp.includes('포커스미디어')

  // 새로운 종료일 계산
  const newEndDate = new Date(endDate)
  if (isFocusMedia && renewalWeeks) {
    newEndDate.setDate(newEndDate.getDate() + (renewalWeeks * 7))
  } else {
    newEndDate.setMonth(newEndDate.getMonth() + renewalMonths)
  }
  const contractPeriodStr = isFocusMedia && renewalWeeks ? `${renewalWeeks}주` : `${renewalMonths}개월`
  const effectiveMonths = renewalMonths || (renewalWeeks ? Math.ceil(renewalWeeks / 4) : 1)

  // Clients 탭의 E열(종료일) 업데이트
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Clients!E${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[formatDate(newEndDate)]]
    }
  })

  // 원본데이터 탭에 새로운 매출 데이터 추가
  const now = new Date().toISOString()
  const contractDate = formatDate(endDate) // 원래 종료일을 계약 시작일로 사용
  const contractEndDate = formatDate(newEndDate)

  // 최종 상품명 결정
  const finalProductName = productName === '기타' ? productOther : productName
  // 최종 결제 방식 결정
  const finalPaymentMethod = paymentMethod === '기타' ? paymentMethodOther : paymentMethod

  // 월 평균 금액 계산
  const monthlyAmount = Math.round(renewalAmount / effectiveMonths)
  // 순수익 계산
  const netProfit = renewalAmount - (outsourcingCost || 0)
  // 입력 년월
  const inputYearMonth = contractDate.substring(0, 7).replace('.', '-') // YYYY-MM
  // 분기
  const year = contractDate.substring(0, 4)
  const month = parseInt(contractDate.substring(5, 7))
  const quarter = `${year}-Q${Math.ceil(month / 3)}`

  // Staff 탭에서 부서 정보 가져오기
  const staffData = await readFromSheet('Staff!A:D')
  const staffMap = new Map()

  if (staffData.length > 1) {
    const [headers, ...staffRows] = staffData
    staffRows.forEach(row => {
      const name = row[0] || ''
      const department = row[2] || ''
      if (name) {
        staffMap.set(name, department)
      }
    })
  }

  // 담당자 이름 추출 및 정규화 - 직책/직급 제거하여 일관성 유지
  const normalizedAeName = normalizeStaffName(aeString)
  const department = staffMap.get(aeString) || staffMap.get(normalizedAeName) || '미지정'

  // 원본데이터 탭 구조에 맞게 데이터 생성
  const rawDataRow = [
    now, // A: 타임스탬프
    department, // B: 부서
    normalizedAeName, // C: 입력자 (담당자) - 정규화된 이름
    '연장', // D: 매출 유형
    clientName, // E: 광고주 업체명
    finalProductName, // F: 마케팅 매체 상품명
    contractPeriodStr, // G: 계약 기간 (주 또는 개월)
    renewalAmount.toString(), // H: 총 계약금액
    finalPaymentMethod, // I: 결제 방식
    approvalNumber || '', // J: 결제 승인 번호
    outsourcingCost ? outsourcingCost.toString() : '0', // K: 확정 외주비
    `연장 계약 - ${contractPeriodStr}`, // L: 광고주 상담 내용
    '', // M: 특이사항
    '', // N: 계약서 파일 및 기타 자료
    contractDate, // O: 계약날짜 (원래 종료일)
    contractEndDate, // P: 계약종료일 (새 종료일)
    monthlyAmount.toString(), // Q: 월 평균 금액
    netProfit.toString(), // R: 순수익
    inputYearMonth, // S: 입력 년월
    quarter, // T: 분기
    '', // U: 마케팅 담당자
    '', // V: 온라인 점검 여부
    '', // W: 점검 일시
    '', // X: 광고주 주소
    '', // Y: 광고주 연락처
    '', // Z: 점검상태
    '', // AA: 처리메모
    '', // AB: 단지명
    '', // AC: 설치대수
    '', // AD: 대당단가
    '', // AE: 월단가
    finalPaymentMethod === '입금예정' ? (depositorName || '') : '', // AF: 입금자명
  ]

  // 원본데이터 탭에 저장
  await writeToSheet('원본데이터!A:AF', [rawDataRow])

  // 알림 발송 (실패해도 매출 등록은 성공)
  try {
    await notifyNewSale({
      inputPerson: normalizedAeName,
      department,
      clientName,
      productName: finalProductName,
      totalAmount: renewalAmount,
      salesType: '연장',
      specialNotes: finalPaymentMethod === '입금예정'
        ? `💰 입금예정${depositorName ? ` (입금자: ${depositorName})` : ''}`
        : (approvalNumber ? `${finalPaymentMethod} (승인번호: ${approvalNumber})` : ''),
    })
    console.log('✅ AE 연장 매출 알림 발송 성공:', clientName)
  } catch (notifyError) {
    console.error('❌ AE 연장 매출 알림 발송 실패:', notifyError)
  }

  return { success: true, newEndDate: formatDate(newEndDate) }
}

// 연장 실패 처리
async function handleRenewalFailure(rowIndex: number) {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Clients 탭의 A열(상태) 업데이트 -> "연장 실패"로 변경
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Clients!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['연장 실패']]
    }
  })

  return { success: true }
}

// 대기 처리
async function handlePending(rowIndex: number) {
  const auth = getGoogleAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Clients 탭의 A열(상태) 업데이트 -> "대기"로 변경
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Clients!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['대기']]
    }
  })

  return { success: true }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rowIndex,
      action,
      renewalMonths,
      renewalWeeks,
      renewalAmount,
      failureReason,
      currentEndDate,
      clientName,
      aeString,
      productName,
      productOther,
      paymentMethod,
      paymentMethodOther,
      approvalNumber,
      outsourcingCost,
      depositorName
    } = body

    console.log('=== Client Update Request ===')
    console.log('Row Index:', rowIndex)
    console.log('Action:', action)
    console.log('Renewal Months:', renewalMonths)
    console.log('Renewal Amount:', renewalAmount)
    console.log('Client Name:', clientName)
    console.log('AE String:', aeString)
    console.log('Product Name:', productName)
    console.log('Payment Method:', paymentMethod)

    if (!rowIndex || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: rowIndex, action' },
        { status: 400 }
      )
    }

    let result

    if (action === 'renewed') {
      // 연장 성공 처리
      const isFocusRenewal = productName && productName.includes('포커스미디어')
      if (isFocusRenewal ? (!renewalWeeks || renewalWeeks < 1) : (!renewalMonths || renewalMonths < 1)) {
        return NextResponse.json(
          { error: 'Renewal period must be at least 1' },
          { status: 400 }
        )
      }

      if (!currentEndDate) {
        return NextResponse.json(
          { error: 'Current end date is required for renewal' },
          { status: 400 }
        )
      }

      if (!clientName || !aeString) {
        return NextResponse.json(
          { error: 'Client name and AE string are required for performance tracking' },
          { status: 400 }
        )
      }

      if (!productName || !paymentMethod) {
        return NextResponse.json(
          { error: 'Product name and payment method are required' },
          { status: 400 }
        )
      }

      result = await handleRenewalSuccess(
        rowIndex,
        currentEndDate,
        renewalMonths || 0,
        renewalWeeks || 0,
        renewalAmount || 0,
        clientName,
        aeString,
        productName,
        productOther || '',
        paymentMethod,
        paymentMethodOther || '',
        approvalNumber || '',
        outsourcingCost || 0,
        depositorName || ''
      )

      console.log('✅ Client renewed successfully')
      console.log('New end date:', result.newEndDate)

      return NextResponse.json({
        success: true,
        message: '연장 성공으로 처리되었습니다.',
        newEndDate: result.newEndDate,
        renewalAmount: renewalAmount || 0
      })

    } else if (action === 'failed') {
      // 연장 실패 처리
      result = await handleRenewalFailure(rowIndex)

      console.log('✅ Client marked as failed')

      return NextResponse.json({
        success: true,
        message: '연장 실패로 처리되었습니다.',
        failureReason: failureReason || ''
      })

    } else if (action === 'pending') {
      // 대기 처리
      result = await handlePending(rowIndex)

      console.log('✅ Client marked as pending')

      return NextResponse.json({
        success: true,
        message: '대기 상태로 설정되었습니다.'
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "renewed", "failed", or "pending"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error updating client:', error)
    return NextResponse.json(
      {
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
