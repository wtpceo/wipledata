import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const data = await readFromSheet('원본데이터!A2:Y')

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

                let contractDate = row[14] || ''
                // YYYY. MM. DD 또는 YYYY.MM.DD 형식을 YYYY-MM-DD로 변환
                if (contractDate.includes('.')) {
                    const parts = contractDate.split('.').map((p: string) => p.trim()).filter(Boolean);
                    if (parts.length >= 3) {
                        contractDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    }
                } else if (contractDate.includes('/')) {
                    const parts = contractDate.split('/').map((p: string) => p.trim()).filter(Boolean);
                    if (parts.length >= 3) {
                        // MM/DD/YYYY 또는 YYYY/MM/DD 대응
                        if (parts[0].length === 4) {
                            contractDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                        } else if (parts[2].length === 4) {
                            contractDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                        }
                    }
                }

                const inputMonth = row[18] || ''

                return {
                    id: `feed-${index}`,
                    rowIndex: index + 2, // 1-based index and skipping header
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
                    inputMonth
                }
            })
            .filter(item => {
                // 2026년 1월부터의 데이터만 가져오기
                return item.contractDate >= '2026-01-01' || item.inputMonth >= '2026-01'
            })
            // 최신 등록순으로 정렬
            .reverse()

        return NextResponse.json({ data: feedData })
    } catch (error) {
        console.error('Failed to fetch sales feed', error)
        return NextResponse.json({ error: 'Failed to fetch sales feed' }, { status: 500 })
    }
}
