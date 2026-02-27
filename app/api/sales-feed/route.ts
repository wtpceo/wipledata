import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

// Google Sheets 날짜 형식 정규화 (M/D/YYYY → YYYY-MM-DD)
function normalizeDateStr(dateStr: string): string {
    if (!dateStr) return ''
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/')
        if (parts.length === 3) {
            const [m, d, y] = parts
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        }
    }
    return dateStr
}

export async function GET(request: NextRequest) {
    try {
        const data = await readFromSheet('원본데이터!A2:AF')

        const feedData = data
            .map((row, index) => {
                const timestamp = row[0] || ''
                const department = row[1] || ''
                const inputPerson = row[2] || ''
                const contractType = row[3] || ''
                const clientName = row[4] || ''
                const productName = row[5] || ''
                const contractPeriod = row[6] || ''
                const totalAmount = parseInt((row[7] || '0').replace(/,/g, '')) || 0
                const paymentMethod = row[8] || ''
                const approvalNum = row[9] || ''
                const consultationContent = row[11] || ''
                const specialNotes = row[12] || ''

                // O열 계약일자 대신 A열 timestamp의 날짜(T 앞부분)를 계약일로 직관적으로 사용
                const contractDate = timestamp ? timestamp.split('T')[0] : (row[14] || '')
                const inputMonth = row[18] || ''

                // 미디어 계약 정보 (AB/AC/AD 열)
                const mediaComplexName = row[27] || '' // AB: 단지명
                const mediaInstallCount = row[28] || '' // AC: 설치대수
                const mediaUnitPrice = row[29] || '' // AD: 대당단가
                const depositorName = row[30] || '' // AE: 입금자명
                const paymentCompletedDate = normalizeDateStr(row[31] || '') // AF: 입금완료 댓글단 날짜

                return {
                    id: `feed-${index}`,
                    rowIndex: index + 2,
                    timestamp,
                    department,
                    inputPerson,
                    contractType,
                    clientName,
                    productName,
                    contractPeriod,
                    totalAmount,
                    paymentMethod,
                    approvalNum,
                    consultationContent,
                    specialNotes,
                    contractDate,
                    inputMonth,
                    mediaComplexName,
                    mediaInstallCount,
                    mediaUnitPrice,
                    depositorName,
                    paymentCompletedDate,
                }
            })
            .filter(item => {
                // timestamp (O열 등)에서 'T' 앞부분 날짜(YYYY-MM-DD)를 추출하여 필터링
                const datePart = item.timestamp.split('T')[0]
                // 2026년 1월부터의 데이터만 가져오기
                return datePart >= '2026-01-01'
            })
            // 최신 등록순으로 정렬
            .reverse()

        return NextResponse.json({ data: feedData })
    } catch (error) {
        console.error('Failed to fetch sales feed', error)
        return NextResponse.json({ error: 'Failed to fetch sales feed' }, { status: 500 })
    }
}
