"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function SalesFeedPage() {
    const [allData, setAllData] = useState<any[]>([])
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchSalesFeed()
        // 1분(60초)마다 데이터 자동 갱신하여 게시판에 반영
        const interval = setInterval(() => {
            fetchSalesFeed()
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!searchQuery.trim()) {
            setData(allData)
            return
        }
        const lowerQ = searchQuery.toLowerCase()
        const filtered = allData.filter(sale =>
            (sale.clientName || '').toLowerCase().includes(lowerQ) ||
            (sale.inputPerson || '').toLowerCase().includes(lowerQ) ||
            (sale.productName || '').toLowerCase().includes(lowerQ) ||
            (sale.consultationContent || '').toLowerCase().includes(lowerQ) ||
            (sale.specialNotes || '').toLowerCase().includes(lowerQ)
        )
        setData(filtered)
    }, [searchQuery, allData])

    const fetchSalesFeed = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/sales-feed')
            if (response.ok) {
                const json = await response.json()
                setAllData(json.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch sales feed data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">매출 자료</h2>
                    <p className="text-muted-foreground mt-1">
                        2026년 1월부터의 모든 매출 및 연장 내역이 실시간으로 제공되며, 원본 내용이 그대로 표시됩니다.
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-2 my-4 relative">
                <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                <Input
                    type="text"
                    placeholder="담당자 이름, 업체명, 상품명, 특이사항/입금 등 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 border-gray-300"
                />
            </div>

            {/* 실시간 매출 게시판 (Naver Band Style) */}
            <Card className="bg-[#ebedf0] shadow-inner border-0">
                <CardHeader className="pb-2 pt-4 px-4 bg-white rounded-t-lg border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            전체 실시간 매출 피드 (2026년~)
                        </CardTitle>
                        <CardDescription>
                            1분 주기로 자동 업데이트 됩니다. {data.length} 건 검색됨.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSalesFeed} disabled={loading}>
                        {loading ? '로딩 중...' : '새로고침'}
                    </Button>
                </CardHeader>
                <CardContent className="p-4 h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto flex flex-col gap-4">
                    {data && data.length > 0 ? (
                        data.map((sale) => (
                            <div key={sale.id} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-lg font-bold text-gray-600 shadow-sm mt-1">
                                    {sale.inputPerson?.charAt(0) || '👤'}
                                </div>
                                <div className="flex flex-col max-w-[90%]">
                                    <span className="text-sm text-gray-500 mb-1 ml-1 font-medium">{sale.inputPerson} ({sale.department})</span>
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-base whitespace-pre-line text-gray-800 leading-relaxed font-normal">
                                        <div className="font-semibold text-[17px] flex items-center gap-2 mb-1 flex-wrap">
                                            {sale.contractType === '연장' ? (
                                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm whitespace-nowrap border border-blue-100">[연장]</span>
                                            ) : sale.contractType === '신규' ? (
                                                <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-sm whitespace-nowrap border border-pink-100">[신규]</span>
                                            ) : sale.contractType ? (
                                                <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-sm whitespace-nowrap border border-gray-200">[{sale.contractType}]</span>
                                            ) : null}
                                            <span className="tracking-tight">{sale.productName ? `${sale.productName}) ` : ''}{sale.clientName}</span>
                                        </div>

                                        <div className="mt-2 text-[15px] bg-slate-50 p-3 rounded border border-slate-100 inline-block w-full">
                                            {sale.contractPeriod ? <span className="mr-3"><b>계약기간:</b> {sale.contractPeriod}</span> : ''}
                                            <span><b>금액:</b> {formatCurrency(sale.totalAmount)} {sale.paymentMethod ? ` / ${sale.paymentMethod}` : ''}</span>
                                        </div>

                                        {(sale.consultationContent || sale.specialNotes) && (
                                            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 text-[14.5px] text-gray-700">
                                                {sale.consultationContent && (
                                                    <div className="mb-2">
                                                        <span className="font-semibold text-gray-600">📝 상담내용:</span>
                                                        <div className="mt-1 pl-2 whitespace-pre-wrap leading-snug">{sale.consultationContent}</div>
                                                    </div>
                                                )}
                                                {sale.specialNotes && (
                                                    <div className="mt-2 text-red-700 bg-red-50 p-2 rounded">
                                                        <span className="font-semibold text-red-600">🚨 입금현황 및 특이사항:</span>
                                                        <div className="mt-1 pl-1 whitespace-pre-wrap leading-snug">{sale.specialNotes}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-400 mt-1.5 ml-1 flex items-center gap-2 tracking-wide">
                                        작성: {sale.timestamp ? new Date(sale.timestamp.replace(/\./g, '-')).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                        {sale.contractDate ? ` ǀ 계약: ${sale.contractDate}` : ''}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-10">
                            {loading ? (
                                <div className="animate-pulse">데이터를 불러오는 중입니다...</div>
                            ) : (
                                <>
                                    <Search className="w-12 h-12 mb-3 text-gray-300" />
                                    <div className="text-base font-medium">검색 결과가 없습니다.</div>
                                    <div className="text-sm mt-1">다른 검색어를 입력해보세요.</div>
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
