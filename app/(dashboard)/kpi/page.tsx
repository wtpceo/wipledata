"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Target, Users, DollarSign, ChevronLeft, ChevronRight, Activity, Award } from "lucide-react"
import { Button } from "@/components/ui/button"

interface KPIData {
  monthlyTrend: {
    month: string
    revenue: number
    goal: number
    achievementRate: number
  }[]
  yearlyComparison: {
    currentYear: number
    previousYear: number
    growthRate: number
  }
  salesEfficiency: {
    averagePerPerson: number
    newCustomerCost: number
    averagePerCustomer: number
    renewalRate: number
  }
  profitability: {
    netProfitMargin: number
    operatingExpenseRatio: number
    roi: { name: string; value: number }[]
  }
  customerMetrics: {
    churnRate: number
    averageContractLength: number
    totalActiveCustomers: number
    newCustomersThisMonth: number
  }
  quarterlyGoals: {
    quarter: string
    goal: number
    actual: number
    achievementRate: number
  }[]
}

export default function KPIPage() {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchKPIData(selectedYear)
  }, [selectedYear])

  const fetchKPIData = async (year: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/kpi?year=${year}`)
      if (response.ok) {
        const kpiData = await response.json()
        setData(kpiData)
      }
    } catch (error) {
      console.error('Failed to fetch KPI data:', error)
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KPI 대시보드</h2>
          <p className="text-muted-foreground">
            핵심 성과 지표를 통해 비즈니스 성과를 분석하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(selectedYear - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 min-w-[100px] text-center font-semibold">
            {selectedYear}년
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear(selectedYear + 1)}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전년 대비 성장률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.yearlyComparison?.growthRate ?? 0) > 0 ? '+' : ''}{formatPercent(data?.yearlyComparison?.growthRate ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              작년: {formatCurrency(data?.yearlyComparison?.previousYear || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">인당 평균 매출</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.salesEfficiency?.averagePerPerson || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              영업사원 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순이익률</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(data?.profitability?.netProfitMargin || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              운영비 비율: {formatPercent(data?.profitability?.operatingExpenseRatio || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">계약 갱신율</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(data?.salesEfficiency?.renewalRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              평균 계약 기간: {data?.customerMetrics?.averageContractLength || 0}개월
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 목표 달성률 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 목표 달성률 추이</CardTitle>
          <CardDescription>매월 목표 대비 실적 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.monthlyTrend?.map((month) => (
              <div key={month.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{month.month}</span>
                  <span className="text-muted-foreground">
                    {formatPercent(month.achievementRate)} ({formatCurrency(month.revenue)} / {formatCurrency(month.goal)})
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      month.achievementRate >= 100
                        ? "bg-green-600"
                        : month.achievementRate >= 80
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${Math.min(100, month.achievementRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 분기별 목표 달성 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>분기별 목표 달성 현황</CardTitle>
            <CardDescription>각 분기별 목표 대비 실적</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.quarterlyGoals?.map((quarter) => (
                <div key={quarter.quarter} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{quarter.quarter}</p>
                      <p className="text-sm text-muted-foreground">
                        목표: {formatCurrency(quarter.goal)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(quarter.actual)}</p>
                    <p className={`text-sm ${
                      quarter.achievementRate >= 100 ? "text-green-600" :
                      quarter.achievementRate >= 80 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {formatPercent(quarter.achievementRate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 고객 지표 */}
        <Card>
          <CardHeader>
            <CardTitle>고객 관련 지표</CardTitle>
            <CardDescription>고객 현황 및 이탈률</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">활성 고객 수</span>
                </div>
                <span className="font-bold">{data?.customerMetrics?.totalActiveCustomers || 0}개</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">이번 달 신규 고객</span>
                </div>
                <span className="font-bold">{data?.customerMetrics?.newCustomersThisMonth || 0}개</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">고객 이탈률</span>
                </div>
                <span className="font-bold text-red-600">{formatPercent(data?.customerMetrics?.churnRate || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">고객당 평균 매출</span>
                </div>
                <span className="font-bold">{formatCurrency(data?.salesEfficiency?.averagePerCustomer || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매체별 ROI */}
      <Card>
        <CardHeader>
          <CardTitle>마케팅 매체별 ROI</CardTitle>
          <CardDescription>매체별 투자 대비 수익률</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.profitability?.roi?.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, item.value)}%` }}
                    />
                  </div>
                  <span className="font-bold min-w-[60px] text-right">{formatPercent(item.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}