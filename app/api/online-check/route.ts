import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'

// GET: 온라인 점검 희망 업체 조회
export async function GET() {
  try {
    // 원본데이터에서 온라인 점검 희망 여부가 'Y'인 데이터만 조회
    // 컬럼: A(타임스탬프), B(부서), C(입력자), D(매출유형), E(광고주), F(상품명),
    //       G(계약기간), H(총금액), I(결제방식), J(승인번호), K(외주비), L(상담내용),
    //       M(특이사항), N(파일), O(계약날짜), P(종료일), Q(월평균), R(순수익),
    //       S(입력년월), T(분기), U(마케팅담당자), V(온라인점검여부), W(점검일시), X(주소), Y(연락처), Z(점검상태), AA(처리메모)
    const data = await readFromSheet('원본데이터!A2:AA')

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 온라인 점검 희망 업체만 필터링
    // 인덱스: U=20(마케팅담당자), V=21(점검여부), W=22(점검일시), X=23(주소), Y=24(연락처), Z=25(점검상태)
    console.log('=== Online Check Debug ===')
    console.log('Total rows:', data.length)

    const onlineCheckData = data
      .map((row, index) => {
        const item = {
          id: `check-${index + 2}`,
          rowNumber: index + 2,
          timestamp: row[0] || '',
          department: row[1] || '',
          inputPerson: row[2] || '',
          salesType: row[3] || '',
          clientName: row[4] || '',
          productName: row[5] || '',
          contractPeriod: row[6] || '',
          totalAmount: parseInt(String(row[7] || '0').replace(/,/g, '')),
          paymentMethod: row[8] || '',
          contractDate: row[14] || '',
          marketingManager: row[20] || '', // U열: 마케팅 담당자
          onlineCheckRequested: row[21] || 'N', // V열: 온라인 점검 여부
          onlineCheckDateTime: row[22] || '', // W열: 점검 일시
          clientAddress: row[23] || '', // X열: 주소
          clientContact: row[24] || '', // Y열: 연락처
          checkStatus: row[25] || 'pending', // Z열: 점검 상태
          processMemo: row[26] || '', // AA열: 처리 메모
        }

        // 옥외매체 데이터 디버깅
        if (item.productName.includes('포커스미디어') || item.productName.includes('타운보드')) {
          console.log(`Row ${index + 2}: ${item.clientName}, 상품: ${item.productName}, 점검여부: ${item.onlineCheckRequested}, V열값: "${row[21]}"`)
        }

        return item
      })
      .filter(item =>
        item.onlineCheckRequested === 'Y' &&
        (item.productName.includes('포커스미디어') || item.productName.includes('타운보드'))
      )
      .sort((a, b) => b.totalAmount - a.totalAmount) // 금액 높은 순

    return NextResponse.json({
      data: onlineCheckData,
      total: onlineCheckData.length,
    })
  } catch (error) {
    console.error('Error fetching online check data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch online check data' },
      { status: 500 }
    )
  }
}

// PATCH: 점검 상태 및 메모 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const { id, status, memo } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    // ID에서 행 번호 추출 (check-2 -> 2)
    const rowNumber = parseInt(id.replace('check-', ''))

    if (isNaN(rowNumber)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }

    // 상태 업데이트 (Z열)
    if (status) {
      await updateSheet(`원본데이터!Z${rowNumber}`, [[status]])
    }

    // 메모 업데이트 (AA열)
    if (memo !== undefined) {
      await updateSheet(`원본데이터!AA${rowNumber}`, [[memo]])
    }

    return NextResponse.json({
      success: true,
      message: '업데이트되었습니다.',
    })
  } catch (error) {
    console.error('Error updating check status:', error)
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    )
  }
}
