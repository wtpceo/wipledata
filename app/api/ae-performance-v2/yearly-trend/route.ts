import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'

export const dynamic = 'force-dynamic'

// 날짜 파싱
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    try {
        if (dateStr.includes('T')) return new Date(dateStr)
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('.')
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        }
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/')
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
            }
        }
        return new Date(dateStr)
    } catch { return null }
}

export async function GET(request: NextRequest) {
    try {
        const rawData = await readFromSheet('원본데이터!A2:T')

        // We want 12 months of 2026. Data format should be grouped by month, then separated by AE.
        const year = 2026
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: `${year}-${String(i + 1).padStart(2, '0')}`,
            label: `${i + 1}월`
        }))

        const yearlyTrendMap = new Map<string, any>()
        months.forEach(({ month, label }) => {
            yearlyTrendMap.set(month, { month, label, total: 0, aes: {} })
        })

        const allAEs = new Set<string>()

        rawData.forEach(row => {
            const department = row[1] || ''
            if (department !== '영업부') return // 영업부 실적만

            const aeName = normalizeStaffName(row[2] || '')
            if (!aeName) return

            const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
            const outsourcingCost = parseFloat(String(row[10] || '0').replace(/[^\d.-]/g, '')) || 0
            const totalAmount = contractAmount - outsourcingCost

            const inputMonth = row[18] || ''
            let targetMonth = ''

            if (inputMonth) {
                if (inputMonth.includes('-')) {
                    targetMonth = inputMonth
                } else if (inputMonth.includes('.')) {
                    targetMonth = inputMonth.replace('.', '-')
                } else if (inputMonth.length === 6) {
                    targetMonth = `${inputMonth.substring(0, 4)}-${inputMonth.substring(4, 6)}`
                }
            }

            if (yearlyTrendMap.has(targetMonth)) {
                allAEs.add(aeName)
                const monthData = yearlyTrendMap.get(targetMonth)
                monthData.aes[aeName] = (monthData.aes[aeName] || 0) + totalAmount
                monthData.total += totalAmount
            }
        })

        const yearlyTrend = Array.from(yearlyTrendMap.values()).map(monthData => {
            const now = new Date()
            const nowMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`

            const res: any = {
                month: monthData.month,
                label: monthData.label,
                total: monthData.total,
                isCurrent: monthData.month === nowMonth
            }

            Array.from(allAEs).forEach(ae => {
                res[ae] = monthData.aes[ae] || 0
            })

            return res
        })

        return NextResponse.json({
            yearlyTrend,
            aeList: Array.from(allAEs)
        })
    } catch (error) {
        console.error('Error in AE yearly trend:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
