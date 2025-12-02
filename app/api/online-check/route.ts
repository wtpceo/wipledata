import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'

// GET: 온라인 점검 희망 업체 조회
export async function GET() {
  try {
    // 원본데이터에서 온라인 점검 희망 여부가 'Y'인 데이터만 조회
    // 컬럼: A(타임스탬프), B(부서), C(입력자), D(매출유형), E(광고주), F(상품명),
    //       G(계약기간), H(총금액), ..., O(계약날짜), U(온라인점검여부), V(점검일시)
    const data = await readFromSheet('원본데이터!A2:W')

    if (!data || data.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // 온라인 점검 희망 업체만 필터링
    const onlineCheckData = data
      .map((row, index) => ({
        id: `check-${index + 2}`,
        timestamp: row[0] || '',
        department: row[1] || '',
        inputPerson: row[2] || '',
        salesType: row[3] || '',
        clientName: row[4] || '',
        productName: row[5] || '',
        contractPeriod: row[6] || '',
        totalAmount: parseInt(row[7]?.replace(/,/g, '') || '0'),
        paymentMethod: row[8] || '',
        contractDate: row[14] || '',
        onlineCheckRequested: row[20] || 'N',
        onlineCheckDateTime: row[21] || '',
        checkStatus: row[22] || 'pending', // 점검 상태 (pending, completed, cancelled)
      }))
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

    // W열(23번째 컬럼)에 상태 업데이트
    await updateSheet(`원본데이터!W${rowNumber}`, [[status]])

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
