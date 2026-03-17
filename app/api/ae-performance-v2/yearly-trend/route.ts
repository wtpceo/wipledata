import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuth, readFromSheet } from '@/lib/google-sheets'
import { normalizeStaffName } from '@/lib/normalize-staff-name'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!

// 인바운드 포지션 AE (연장율 추적 제외)
const INBOUND_AES = new Set(['박한'])

// 담당자 이름 정규화 (이름만 추출)
function extractAEName(aeString: string): string[] {
    if (!aeString) return []
    return aeString.split(',').map(ae => {
        const name = ae.match(/^([^(]+)/)?.[1]?.trim() || ae.trim()
        return name.split(/\s+/)[0]
    })
}

// 날짜 파싱
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null
    try {
        let cleaned = dateStr.trim().replace(/^~/, '')
        if (cleaned.includes('~')) cleaned = cleaned.split('~').pop()!.trim()
        cleaned = cleaned.replace(/\s/g, '').replace(/\.$/, '')
        if (cleaned.includes('T')) return new Date(cleaned)
        if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(cleaned)) {
            const [year, month, day] = cleaned.split('.')
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        }
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
            const [year, month, day] = cleaned.split('-')
            return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        }
        if (cleaned.includes('/')) {
            const parts = cleaned.split('/')
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
            }
        }
        const fb = new Date(cleaned)
        return isNaN(fb.getTime()) ? null : fb
    } catch { return null }
}

export async function GET(request: NextRequest) {
    try {
        const rawData = await readFromSheet('원본데이터!A2:T')

        // Clients 시트 (연장율 계산용)
        const auth = getGoogleAuth()
        const sheets = google.sheets({ version: 'v4', auth })
        const clientsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Clients!A:G',
        })
        const clientsRows = clientsRes.data.values || []
        const [, ...clientDataRows] = clientsRows

        const year = 2026
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: `${year}-${String(i + 1).padStart(2, '0')}`,
            label: `${i + 1}월`,
            monthIndex: i // 0-based
        }))

        const yearlyTrendMap = new Map<string, any>()
        months.forEach(({ month, label }) => {
            yearlyTrendMap.set(month, { month, label, total: 0, aes: {} })
        })

        const allAEs = new Set<string>()

        // 월별 연장율 계산용 데이터
        // key: "YYYY-MM", value: { aeTargets: Map<AE, Set<ClientName>>, aeRenewals: Map<AE, Set<ClientName>> }
        const monthlyRenewalData = new Map<string, {
            aeTargets: Map<string, Set<string>>,
            aeRenewals: Map<string, Set<string>>,
        }>()
        months.forEach(({ month }) => {
            monthlyRenewalData.set(month, {
                aeTargets: new Map(),
                aeRenewals: new Map(),
            })
        })

        // 원본데이터 파싱: 매출 집계 + 연장율 분모/분자
        rawData.forEach(row => {
            const department = row[1] || ''
            if (department === '영업부') return

            const aeName = normalizeStaffName(row[2] || '')
            if (!aeName) return

            const salesType = row[3] || ''
            const clientName = (row[4] || '').trim()
            const contractAmount = parseFloat(String(row[7] || '0').replace(/[^\d.-]/g, '')) || 0
            const paymentMethod = row[8] || ''
            const totalAmount = paymentMethod === '입금예정' ? 0 : contractAmount

            const date = parseDate(row[0] || '')
            if (!date || isNaN(date.getTime())) return

            const targetMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`

            if (yearlyTrendMap.has(targetMonth)) {
                allAEs.add(aeName)
                const monthData = yearlyTrendMap.get(targetMonth)
                monthData.aes[aeName] = (monthData.aes[aeName] || 0) + totalAmount
                monthData.total += totalAmount

                // 연장율 계산: 모든 매출 입력 건 → 분모에 추가
                if (clientName && !INBOUND_AES.has(aeName)) {
                    const rd = monthlyRenewalData.get(targetMonth)!
                    if (!rd.aeTargets.has(aeName)) rd.aeTargets.set(aeName, new Set())
                    rd.aeTargets.get(aeName)!.add(clientName)

                    // 연장/재계약/소개 → 분자에도 추가
                    if (salesType.includes('연장') || salesType.includes('재계약') || salesType.includes('소개')) {
                        if (!rd.aeRenewals.has(aeName)) rd.aeRenewals.set(aeName, new Set())
                        rd.aeRenewals.get(aeName)!.add(clientName)
                    }
                }
            }
        })

        // Clients 시트에서 진행/연장실패 건 → 분모에 추가
        clientDataRows.forEach(row => {
            const status = row[0] || ''
            if (status !== '진행' && status !== '연장 실패') return

            const clientName = (row[1] || '').trim()
            const endDateStr = row[4] || ''
            const aeString = row[5] || ''
            if (!endDateStr || !clientName) return

            const endDate = parseDate(endDateStr)
            if (!endDate) return

            const endMonth = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
            if (!monthlyRenewalData.has(endMonth)) return

            const aeNames = extractAEName(aeString)
            aeNames.forEach(aeName => {
                if (INBOUND_AES.has(aeName)) return
                const rd = monthlyRenewalData.get(endMonth)!
                if (!rd.aeTargets.has(aeName)) rd.aeTargets.set(aeName, new Set())
                rd.aeTargets.get(aeName)!.add(clientName)
            })
        })

        // 최종 데이터 구성
        const yearlyTrend = Array.from(yearlyTrendMap.values()).map(monthData => {
            const now = new Date()
            const nowMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`

            const isCurrentMonth = monthData.month === nowMonth
            const res: any = {
                month: monthData.month,
                label: monthData.label,
                total: monthData.total,
                isCurrent: isCurrentMonth
            }

            Array.from(allAEs).forEach(ae => {
                res[ae] = monthData.aes[ae] || 0
            })

            // 월별 AE별 연장율
            const rd = monthlyRenewalData.get(monthData.month)!
            const renewalRates: Record<string, number> = {}
            rd.aeTargets.forEach((targetSet, aeName) => {
                const renewalSet = rd.aeRenewals.get(aeName) || new Set()
                const denom = targetSet.size
                const numer = renewalSet.size
                renewalRates[aeName] = denom > 0 ? Math.min(100, Math.round((numer / denom) * 100)) : 0
            })
            res.renewalRates = renewalRates

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
