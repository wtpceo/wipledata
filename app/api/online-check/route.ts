import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'

// GET: 온라인 점검 희망 업체 조회
export async function GET() {
  try {
    // 원본데이터에서 온라인 점검 희망 여부가 'Y'인 데이터만 조회
    // 컬럼: A(타임스탬프), B(부서), C(입력자), D(매출유형), E(광고주), F(상품명),
    //       G(계약기간), H(총금액), I(결제방식), J(승인번호), K(외주비), L(상담내용),
    //       M(특이사항), N(파일), O(계약날짜), P(종료일), Q(월평균), R(순수익),
    //       S(입력년월), T(분기), U(온라인점검여부), V(점검일시), W(주소), X(연락처), Y(점검상태)
    const data = await readFromSheet('원본데이터!A2:Y')

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 온라인 점검 희망 업체만 필터링
    // 인덱스: A=0, B=1, ..., U=20(점검여부), V=21(점검일시), W=22(주소), X=23(연락처), Y=24(점검상태)
    console.log('=== Online Check Debug ===')
    console.log('Total rows:', data.length)

    const onlineCheckData = data
      .map((row, index) => {
        const item = {
          id: `check-${index + 2}`,
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
          onlineCheckRequested: row[20] || 'N',
          onlineCheckDateTime: row[21] || '',
          clientAddress: row[22] || '',
          clientContact: row[23] || '',
          checkStatus: row[24] || 'pending',
        }

        // 옥외매체 데이터 디버깅
        if (item.productName.includes('포커스미디어') || item.productName.includes('타운보드')) {
          console.log(`Row ${index + 2}: ${item.clientName}, 상품: ${item.productName}, 점검여부: ${item.onlineCheckRequested}, U열값: "${row[20]}"`)
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

// PATCH: 점검 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Y열(25번째 컬럼)에 상태 업데이트
    await updateSheet(`원본데이터!Y${rowNumber}`, [[status]])

    return NextResponse.json({
      success: true,
      message: '상태가 업데이트되었습니다.',
    })
  } catch (error) {
    console.error('Error updating check status:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
