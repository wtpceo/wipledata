"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react"

interface DepartmentProfitability {
  department: string
  revenue: number
  purchase: number
  profit: number
  profitMargin: number
  isPositive: boolean
}

interface DepartmentData {
  departments: DepartmentProfitability[]
  positiveDepartments: DepartmentProfitability[]
  negativeDepartments: DepartmentProfitability[]
}

export default function DepartmentProfitabilityPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DepartmentData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/department-profitability')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching department profitability data:', error)
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
        <h2 className="text-3xl font-bold tracking-tight">부서별 수익성 분석</h2>
        <p className="text-muted-foreground">
          각 부서의 매출, 매입, 수익 현황
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 부서 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.departments.length}개
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">흑자 부서</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.positiveDepartments.length}개
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">적자 부서</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.negativeDepartments.length}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 흑자 부서 */}
      {data.positiveDepartments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              흑자 부서 ({data.positiveDepartments.length}개)
            </CardTitle>
            <CardDescription>매출이 매입보다 많은 부서</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.positiveDepartments.map((dept) => (
                <div key={dept.department} className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg text-green-900">{dept.department}</h4>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-bold">{formatPercent(dept.profitMargin)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-green-700 font-medium">매출</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(dept.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">매입</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(dept.purchase)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">순이익</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatCurrency(dept.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">수익률</p>
                      <p className="text-lg font-bold text-green-900">
                        {formatPercent(dept.profitMargin)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 적자 부서 */}
      {data.negativeDepartments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              적자 부서 ({data.negativeDepartments.length}개)
            </CardTitle>
            <CardDescription>매입이 매출보다 많은 부서</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.negativeDepartments.map((dept) => (
                <div key={dept.department} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg text-red-900">{dept.department}</h4>
                    <div className="flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      <span className="font-bold">{formatPercent(dept.profitMargin)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-red-700 font-medium">매출</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(dept.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">매입</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(dept.purchase)}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">손실</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(dept.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-red-700 font-medium">수익률</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatPercent(dept.profitMargin)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 부서 순위 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 부서 수익성 순위</CardTitle>
          <CardDescription>순이익 기준 정렬</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.departments.map((dept, index) => (
              <div
                key={dept.department}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  dept.isPositive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold ${dept.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className={`font-bold ${dept.isPositive ? 'text-green-900' : 'text-red-900'}`}>
                      {dept.department}
                    </h4>
                    <p className={`text-sm ${dept.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                      순이익: {formatCurrency(dept.profit)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${dept.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dept.profitMargin)}
                  </p>
                  <div className="flex items-center gap-1">
                    {dept.isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-xs ${dept.isPositive ? 'text-green-700' : 'text-red-700'}`}>
                      {dept.isPositive ? '흑자' : '적자'}
                    </span>
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
