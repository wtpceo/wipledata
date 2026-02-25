import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'
import { notifyNewReply } from '@/lib/solapi'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rowIndex, authorName, replyText } = body

        if (!rowIndex || !authorName || !replyText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Read the current specialNotes (column M is index 12 in the row array)
        // Range: 원본데이터!M{rowIndex}
        const cellRange = `원본데이터!M${rowIndex}`
        const data = await readFromSheet(cellRange)

        // Google Sheets gives an empty array if cell is entirely empty, or nested array mapped to 1 value
        const currentNotes = data && data[0] && data[0][0] ? data[0][0] : ''

        // Prepare the formatted reply string
        const now = new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        const replyString = `\n\n[↪ ${authorName} 님의 덧글 - ${now}]\n${replyText}`

        // Append the reply
        const finalNotes = currentNotes + replyString

        // Ensure we start writing back to the exact same cell M{rowIndex}
        await updateSheet(cellRange, [[finalNotes]])

        // 입금완료 키워드 감지: 댓글에 "입금완료" 또는 "입금 완료"가 포함되며 작성자가 "김민우"일 경우에만 결제방식을 업데이트
        let paymentUpdated = false
        const isPaymentCompleteKeyword = replyText.includes('입금완료') || replyText.includes('입금 완료')
        if (isPaymentCompleteKeyword && authorName === '김민우') {
            // I열(인덱스 8): 결제 방식 읽기
            const paymentCellRange = `원본데이터!I${rowIndex}`
            const paymentData = await readFromSheet(paymentCellRange)
            const currentPaymentMethod = paymentData && paymentData[0] && paymentData[0][0] ? paymentData[0][0] : ''

            // 입금예정인 경우에만 입금완료로 변경
            if (currentPaymentMethod === '입금예정') {
                await updateSheet(paymentCellRange, [['입금완료']])
                paymentUpdated = true
                console.log(`✅ 입금완료 처리: row ${rowIndex}, 결제방식 '입금예정' → '입금완료'`)
            }
        }

        // 댓글 알림 발송 (비동기, 실패해도 댓글 등록은 성공)
        const clientData = await readFromSheet(`원본데이터!E${rowIndex}`)
        const clientName = clientData && clientData[0] && clientData[0][0] ? clientData[0][0] : ''
        notifyNewReply({ authorName, clientName, replyText })

        return NextResponse.json({ success: true, paymentUpdated })
    } catch (error) {
        console.error('Failed to post reply', error)
        return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
    }
}
