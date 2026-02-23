"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, Package } from "lucide-react"

interface DashboardData {
    recentSales: any[]
}

export default function SalesFeedPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedMonth] = useState(
        new Date().toISOString().substring(0, 7)
    )

    useEffect(() => {
        fetchDashboardData(selectedMonth)
        // 1분(60초)마다 데이터 자동 갱신하여 게시판에 반영
        const interval = setInterval(() => {
            fetchDashboardData(selectedMonth)
        }, 60000)
        return () => clearInterval(interval)
    }, [selectedMonth])

    const fetchDashboardData = async (month: string) => {
        try {
            setLoading(true)
            const response = await fetch(`/api/dashboard?month=${month}`)
            if (response.ok) {
                const dashboardData = await response.json()
                setData(dashboardData)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
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

    if (loading && !data) {
        return <div className="flex items-center justify-center h-96">로딩 중...</div>
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">매출 자료</h2>
                    <p className="text-muted-foreground">
                        실시간으로 업데이트되는 매출 및 연장 내역 게시판입니다.
                    </p>
                </div>
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
                            실시간 매출 피드
                        </CardTitle>
                        <CardDescription>
                            매출 및 연장 입력 내용이 자동으로 업데이트 됩니다. (1분 주기)
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchDashboardData(selectedMonth)} disabled={loading}>
                        새로고침
                    </Button>
                </CardHeader>
                <CardContent className="p-4 h-[calc(100vh-250px)] min-h-[500px] overflow-y-auto flex flex-col gap-4">
                    {data?.recentSales && data.recentSales.length > 0 ? (
                        data.recentSales.map((sale) => (
                            <div key={sale.id} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-lg font-bold text-gray-600 shadow-sm">
                                    {sale.inputPerson?.charAt(0) || '👤'}
                                </div>
                                <div className="flex flex-col max-w-[80%]">
                                    <span className="text-sm text-gray-500 mb-1 ml-1 font-medium">{sale.inputPerson}</span>
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-base whitespace-pre-line text-gray-800 leading-relaxed font-medium">
                                        {sale.contractType && sale.contractType !== '신규' && sale.contractType !== '연장' ? `${sale.contractType})\n` : ''}
                                        {sale.productName ? `${sale.productName}) ` : ''}{sale.clientName}
                                        {sale.contractMonths ? `\n${sale.contractMonths}개월` : ''}
                                        {'\n'}{formatCurrency(sale.totalAmount)} {sale.contractType ? `${sale.contractType}완결` : '완결'}
                                    </div>
                                    <span className="text-xs text-gray-400 mt-1 ml-1">
                                        {sale.date ? new Date(sale.date.replace(/\./g, '-')).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                            최근 입력된 매출이 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
