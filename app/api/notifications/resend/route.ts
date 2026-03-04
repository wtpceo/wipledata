import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'
import { notifyNewSale } from '@/lib/solapi'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientName } = body

    if (!clientName) {
      return NextResponse.json({ error: 'clientName is required' }, { status: 400 })
    }

    // 원본데이터에서 해당 광고주 검색
    const data = await readFromSheet('원본데이터!A2:AF')

    const matchingRows = data.filter((row: string[]) => {
      const name = row[4] || '' // E열: 광고주명
      return name.includes(clientName)
    })

    if (matchingRows.length === 0) {
      return NextResponse.json({ error: `'${clientName}' 광고주를 찾을 수 없습니다.` }, { status: 404 })
    }

    // 가장 최근 행 사용
    const row = matchingRows[matchingRows.length - 1]

    await notifyNewSale({
      department: row[1] || '-',
      inputPerson: row[2] || '-',
      clientName: row[4] || '-',
      productName: row[5] || '-',
      totalAmount: parseInt((row[7] || '0').replace(/,/g, '')) || 0,
      salesType: row[3] || '-',
      specialNotes: row[12] || '',
    })

    return NextResponse.json({
      success: true,
      message: `'${clientName}' 알림 재발송 완료`,
    })
  } catch (error) {
    console.error('알림 재발송 실패:', error)
    return NextResponse.json({ error: 'Failed to resend notification' }, { status: 500 })
  }
}
