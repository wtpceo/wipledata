"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Award } from "lucide-react"

interface SalesPersonPerformance {
  salesPerson: string
  totalSales: number
  clientCount: number
  averageSale: number
  monthlyData: {
    month: string
    amount: number
  }[]
  salesByType: {
    [key: string]: {
      count: number
      amount: number
    }
  }
}

interface SalesDashboardData {
  totalSales: number
  totalClients: number
  averageSale: number
  salesPeople: SalesPersonPerformance[]
}

export default function SalesDashboardPage() {
  const [data, setData] = useState<SalesDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  )

  useEffect(() => {
    fetchSalesData(selectedMonth)
  }, [selectedMonth])

  const fetchSalesData = async (month: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales-dashboard?month=${month}`)
      if (response.ok) {
        const salesData = await response.json()
        setData(salesData)
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: amount >= 100000000 ? 'compact' : 'standard',
      maximumFractionDigits: amount >= 100000000 ? 1 : 0,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // 매출 유형별 색상 매핑
  const salesTypeColors: { [key: string]: string } = {
    '신규': 'bg-blue-500',
    '연장': 'bg-green-500',
    '재계약': 'bg-purple-500',
    '기존고객 소개': 'bg-orange-500',
    '기타': 'bg-gray-500'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">영업 실적</h2>
          <p className="text-muted-foreground">
            영업부 소속 담당자별 실적 현황
          </p>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalSales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              영업부 전체 매출
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 광고주 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totalClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              영업부 담당 광고주
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.averageSale || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              광고주당 평균
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 영업 담당자별 실적 */}
      <Card>
        <CardHeader>
          <CardTitle>담당자별 실적</CardTitle>
          <CardDescription>
            영업부 소속 담당자별 매출 및 광고주 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.salesPeople && data.salesPeople.length > 0 ? (
              data.salesPeople.map((person, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        {person.salesPerson}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        담당 광고주: {person.clientCount}개
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(person.totalSales)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        평균: {formatCurrency(person.averageSale)}
                      </p>
                    </div>
                  </div>

                  {/* 매출 유형별 상세 */}
                  {person.salesByType && Object.keys(person.salesByType).length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium mb-2">매출 유형별</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(person.salesByType).map(([type, data]) => (
                          <div key={type} className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${salesTypeColors[type] || 'bg-gray-500'}`} />
                              <span className="text-xs font-medium">{type}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {data.count}건
                            </div>
                            <div className="text-sm font-semibold">
                              {formatCurrency(data.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 월별 실적 바 */}
                  {person.monthlyData && person.monthlyData.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-sm font-medium mb-2">월별 추이</p>
                      <div className="space-y-2">
                        {person.monthlyData.slice(-3).map((monthData, idx) => {
                          const maxAmount = Math.max(...person.monthlyData.map(m => m.amount))
                          const percentage = maxAmount > 0 ? (monthData.amount / maxAmount) * 100 : 0

                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-16 text-xs text-muted-foreground">
                                {monthData.month}
                              </div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded relative overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="w-24 text-right text-xs font-medium">
                                {formatCurrency(monthData.amount)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                영업 실적 데이터가 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}