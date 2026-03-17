import { NextRequest, NextResponse, after } from 'next/server'
import { readFromSheet, updateSheet, touchLastModified } from '@/lib/google-sheets'
import { notifyNewReply } from '@/lib/solapi'

// 답글 텍스트에서 금액을 파싱하는 함수 (입금완료 키워드와 함께 사용)
function parseAmountFromText(text: string): number | null {
    // "입금완료" 키워드 제거 후 금액 파싱
    const cleaned = text.replace(/입금\s*완료/g, '').trim()
    if (!cleaned) return null

    // 패턴 1: 만원 단위 ("50만원", "50만", "120만원")
    const manMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*만\s*(?:원)?/)
    if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000)

    // 패턴 2: 콤마 포함 숫자 ("500,000", "1,200,000")
    const commaMatch = cleaned.match(/(\d{1,3}(?:,\d{3})+)/)
    if (commaMatch) return parseInt(commaMatch[1].replace(/,/g, ''), 10)

    // 패턴 3: 순수 숫자 4자리 이상 ("500000")
    const numMatch = cleaned.match(/(\d{4,})/)
    if (numMatch) return parseInt(numMatch[1], 10)

    return null
}

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
        const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
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

                // AF열에 입금완료 댓글단 날짜 기록 (YYYY-MM-DD, KST 기준)
                const completedDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
                await updateSheet(`원본데이터!AF${rowIndex}`, [[completedDate]])

                // A열(timestamp) 갱신: 피드에서 입금완료 건이 오늘 날짜로 상단에 올라오도록
                const newTimestamp = new Date().toISOString()
                await updateSheet(`원본데이터!A${rowIndex}`, [[newTimestamp]])

                // 답글에 금액이 포함되어 있으면 H열(계약금액) 자동 업데이트
                const parsedAmount = parseAmountFromText(replyText)
                if (parsedAmount && parsedAmount > 0) {
                    await updateSheet(`원본데이터!H${rowIndex}`, [[parsedAmount]])
                    console.log(`✅ 계약금액 업데이트: row ${rowIndex}, H열 → ${parsedAmount}`)
                }

                paymentUpdated = true
                console.log(`✅ 입금완료 처리: row ${rowIndex}, 결제방식 '입금예정' → '입금완료', 날짜: ${completedDate}`)
            }
        }

        // 댓글 알림: after()로 응답 반환 후 백그라운드 실행 (Vercel 함수 타임아웃 방지)
        const clientData = await readFromSheet(`원본데이터!E${rowIndex}`)
        const clientName = clientData && clientData[0] && clientData[0][0] ? clientData[0][0] : ''

        after(async () => {
            try {
                await notifyNewReply({ authorName, clientName, replyText })
                console.log('✅ 댓글 알림 발송 성공:', clientName)
            } catch (e) {
                console.error('❌ 댓글 알림 발송 실패:', e)
            }
        })

        await touchLastModified()

        return NextResponse.json({ success: true, paymentUpdated })
    } catch (error) {
        console.error('Failed to post reply', error)
        return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
    }
}
