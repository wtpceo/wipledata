"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Minus } from "lucide-react"

interface ProfitabilityData {
  totalRevenue: number
  totalPurchase: number
  totalProfit: number
  profitMargin: number
  isPositive: boolean
  monthlyData: {
    month: string
    revenue: number
    purchase: number
    profit: number
    margin: number
  }[]
}

export default function ProfitabilityPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProfitabilityData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/profitability')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching profitability data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">전체 수익성 분석</h2>
        <p className="text-muted-foreground">
          매출 대비 매입 분석 및 전체 수익 현황
        </p>
      </div>

      {/* 전체 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매입</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.totalPurchase)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순이익</CardTitle>
            {data.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수익률</CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(data.profitMargin)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 전체 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 수익성 상태</CardTitle>
          <CardDescription>매출 대비 매입 분석 결과</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`p-6 rounded-lg ${data.isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3 mb-4">
                {data.isPositive ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-2xl font-bold ${data.isPositive ? 'text-green-900' : 'text-red-900'}`}>
                    {data.isPositive ? '수익 발생 중' : '손실 발생 중'}
                  </h3>
                  <p className={`text-sm ${data.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                    전체 사업이 {data.isPositive ? '플러스' : '마이너스'} 상태입니다
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className={`${data.isPositive ? 'text-green-700' : 'text-red-700'} font-medium`}>
                    총 매출
                  </p>
                  <p className={`text-2xl font-bold ${data.isPositive ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(data.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className={`${data.isPositive ? 'text-green-700' : 'text-red-700'} font-medium`}>
                    총 매입
                  </p>
                  <p className={`text-2xl font-bold ${data.isPositive ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(data.totalPurchase)}
                  </p>
                </div>
                <div>
                  <p className={`${data.isPositive ? 'text-green-700' : 'text-red-700'} font-medium`}>
                    차액 (순이익)
                  </p>
                  <p className={`text-2xl font-bold ${data.isPositive ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(data.totalProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 월별 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 수익성 추이</CardTitle>
          <CardDescription>최근 월별 매출, 매입, 순이익 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.monthlyData.map((month) => (
              <div key={month.month} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg">{month.month}</h4>
                  <div className={`flex items-center gap-2 ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {month.profit >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span className="font-bold">{formatPercent(month.margin)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">매출</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(month.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">매입</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(month.purchase)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">순이익</p>
                    <p className={`text-lg font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">수익률</p>
                    <p className={`text-lg font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(month.margin)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
