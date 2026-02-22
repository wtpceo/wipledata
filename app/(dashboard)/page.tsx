"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, Cell
} from "recharts"

interface WeekGoals {
  sales: {
    goal: number
    current: number
    achievementRate: number
  }
  internal: {
    goal: number
    current: number
    achievementRate: number
  }
}

interface WeeklyStatEntry {
  week: number
  stats: { name: string; amount: number }[]
}

interface DashboardData {
  overview: {
    currentMonthTotal: number
    prevMonthTotal: number
    monthGrowthRate: number
    newClients: number
    renewals: number
    referrals: number
    totalClients: number
    achievementRate: number
    monthlyGoal: number
    currentMonth: string
  }
  currentWeek?: number
  week1Goals?: WeekGoals
  week2Goals?: WeekGoals
  week3Goals?: WeekGoals
  week4Goals?: WeekGoals
  week5Goals?: WeekGoals
  departmentSales: { name: string; amount: number }[]
  salesPersonStats: { name: string; amount: number }[]
  productSales: { name: string; amount: number }[]
  inputPersonStats: { name: string; amount: number }[]
  weeklyInputPersonStats?: WeeklyStatEntry[]
  weeklyDepartmentStats?: WeeklyStatEntry[]
  monthlyTrend: { month: string; amount: number }[]
  yearlyTrend: { month: string; label: string; salesDept: number; internalDept: number; total: number; isCurrent: boolean }[]
  recentSales: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  )
  const [showAllDepartments, setShowAllDepartments] = useState(false)
  const [inputPersonWeek, setInputPersonWeek] = useState<number>(0) // 0 = 월별
  const [departmentWeek, setDepartmentWeek] = useState<number>(0) // 0 = 월별

  useEffect(() => {
    fetchDashboardData(selectedMonth)
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

  const changeMonth = (direction: 'prev' | 'next') => {
    const date = new Date(selectedMonth + '-01')
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }
    setSelectedMonth(date.toISOString().substring(0, 7))
    // 월 변경 시 주차 상태 초기화
    setShowAllDepartments(false)
    setInputPersonWeek(0)
    setDepartmentWeek(0)
  }

  const formatMonthDisplay = (month: string) => {
    const date = new Date(month + '-01')
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">대시보드</h2>
          <p className="text-muted-foreground">
            위즈더플래닝 비즈니스 현황을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 min-w-[150px] text-center font-semibold">
            {formatMonthDisplay(selectedMonth)}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => changeMonth('next')}
            disabled={selectedMonth >= new Date().toISOString().substring(0, 7)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 연간 매출 트렌드 그래프 */}
      {data?.yearlyTrend && data.yearlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2026년 월별 매출 현황</CardTitle>
            <CardDescription>
              영업부 / 내무부 부서별 월 매출 추이 (현재 월 강조)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data.yearlyTrend}
                margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const entry = data?.yearlyTrend?.find(d => d.label === payload.value);
                    const total = entry?.total || 0;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
                          {payload.value}
                        </text>
                        {total > 0 && (
                          <text x={0} y={0} dy={34} textAnchor="middle" fill="#f97316" fontSize={11} fontWeight="bold">
                            {formatCurrency(total)}
                          </text>
                        )}
                      </g>
                    );
                  }}
                  height={50}
                />
                <YAxis
                  tickFormatter={(v: number) => new Intl.NumberFormat('ko-KR').format(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const entry = data.yearlyTrend.find(d => d.label === label)
                    const total = entry?.total ?? 0
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md text-sm min-w-[180px]">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.map((p: any) => {
                          const pct = total > 0 ? Math.round((p.value / total) * 100) : 0
                          return (
                            <div key={p.dataKey} className="flex justify-between gap-4">
                              <span style={{ color: p.fill }}>{p.name}</span>
                              <span className="font-medium">
                                {formatCurrency(p.value)}
                                <span className="text-muted-foreground ml-1">({pct}%)</span>
                              </span>
                            </div>
                          )
                        })}
                        <div className="flex justify-between gap-4 border-t mt-1 pt-1 font-semibold">
                          <span>합계</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Legend content={({ payload }) => {
                  const items = [
                    { value: '영업부', color: '#3b82f6' },
                    { value: '내무부', color: '#22c55e' }
                  ]
                  return (
                    <div className="flex justify-center gap-6 text-sm mb-4 mt-2">
                      {items.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span style={{ color: entry.color, fontWeight: 'bold' }}>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }} />
                <Bar dataKey="salesDept" name="영업부" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={40}>
                  {data.yearlyTrend.map((entry, index) => (
                    <Cell
                      key={`sales-${index}`}
                      fill="#3b82f6"
                    />
                  ))}
                  <LabelList
                    dataKey="salesDept"
                    position="inside"
                    content={(props: any) => {
                      const { x, y, width, height, value, index } = props
                      const total = data.yearlyTrend[index]?.total ?? 0
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0
                      if (height < 22 || pct === 0) return null
                      return (
                        <text
                          x={x + width / 2} y={y + height / 2}
                          fill="white" textAnchor="middle" dominantBaseline="middle"
                          fontSize={10} fontWeight={600}
                        >
                          {pct}%
                        </text>
                      )
                    }}
                  />
                </Bar>
                <Bar dataKey="internalDept" name="내무부" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {data.yearlyTrend.map((entry, index) => (
                    <Cell
                      key={`internal-${index}`}
                      fill="#22c55e"
                    />
                  ))}
                  <LabelList
                    dataKey="internalDept"
                    content={(props: any) => {
                      const { x, y, width, index } = props
                      const entry = data.yearlyTrend[index]
                      if (entry?.isCurrent) {
                        return (
                          <g>
                            <text
                              x={x + width / 2} y={y - 12}
                              fill="#22c55e" textAnchor="middle" dominantBaseline="middle"
                              fontSize={24}
                            >
                              &#x25BC;
                            </text>
                          </g>
                        )
                      }
                      return null
                    }}
                  />
                  <LabelList
                    dataKey="internalDept"
                    position="inside"
                    content={(props: any) => {
                      const { x, y, width, height, value, index } = props
                      const total = data.yearlyTrend[index]?.total ?? 0
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0
                      if (height < 22 || pct === 0) return null
                      return (
                        <text
                          x={x + width / 2} y={y + height / 2}
                          fill="white" textAnchor="middle" dominantBaseline="middle"
                          fontSize={10} fontWeight={600}
                        >
                          {pct}%
                        </text>
                      )
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 주요 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.overview?.currentMonthTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              전월 대비 {(data?.overview?.monthGrowthRate ?? 0) > 0 ? '+' : ''}{data?.overview?.monthGrowthRate ?? 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신규 광고주</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.overview?.newClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              이번 달 신규
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">목표 달성률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={
                (data?.overview?.achievementRate || 0) >= 100
                  ? "text-green-600"
                  : (data?.overview?.achievementRate || 0) >= 80
                    ? "text-yellow-600"
                    : "text-red-600"
              }>
                {data?.overview?.achievementRate || 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              목표: {formatCurrency(data?.overview?.monthlyGoal || 0)}
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${(data?.overview?.achievementRate || 0) >= 100
                  ? "bg-green-600"
                  : (data?.overview?.achievementRate || 0) >= 80
                    ? "bg-yellow-600"
                    : "bg-red-600"
                  }`}
                style={{ width: `${Math.min(100, data?.overview?.achievementRate || 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 광고주</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.overview?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              전체 광고주 수
            </p>
          </CardContent>
        </Card>
      </div>


      {/* 1주차 목표 섹션 */}
      {data?.week1Goals && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">영업부 1주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week1Goals.sales.achievementRate >= 100
                    ? "text-green-600"
                    : data.week1Goals.sales.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week1Goals.sales.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week1Goals.sales.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week1Goals.sales.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week1Goals.sales.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week1Goals.sales.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week1Goals.sales.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내무부 1주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week1Goals.internal.achievementRate >= 100
                    ? "text-green-600"
                    : data.week1Goals.internal.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week1Goals.internal.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week1Goals.internal.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week1Goals.internal.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week1Goals.internal.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week1Goals.internal.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week1Goals.internal.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2주차 목표 섹션 */}
      {data?.week2Goals && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">영업부 2주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week2Goals.sales.achievementRate >= 100
                    ? "text-green-600"
                    : data.week2Goals.sales.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week2Goals.sales.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week2Goals.sales.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week2Goals.sales.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week2Goals.sales.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week2Goals.sales.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week2Goals.sales.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내무부 2주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week2Goals.internal.achievementRate >= 100
                    ? "text-green-600"
                    : data.week2Goals.internal.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week2Goals.internal.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week2Goals.internal.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week2Goals.internal.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week2Goals.internal.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week2Goals.internal.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week2Goals.internal.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3주차 목표 섹션 */}
      {data?.week3Goals && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">영업부 3주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week3Goals.sales.achievementRate >= 100
                    ? "text-green-600"
                    : data.week3Goals.sales.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week3Goals.sales.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week3Goals.sales.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week3Goals.sales.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week3Goals.sales.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week3Goals.sales.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week3Goals.sales.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내무부 3주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week3Goals.internal.achievementRate >= 100
                    ? "text-green-600"
                    : data.week3Goals.internal.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week3Goals.internal.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week3Goals.internal.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week3Goals.internal.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week3Goals.internal.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week3Goals.internal.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week3Goals.internal.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4주차 목표 섹션 */}
      {data?.week4Goals && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">영업부 4주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week4Goals.sales.achievementRate >= 100
                    ? "text-green-600"
                    : data.week4Goals.sales.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week4Goals.sales.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week4Goals.sales.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week4Goals.sales.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week4Goals.sales.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week4Goals.sales.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week4Goals.sales.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내무부 4주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week4Goals.internal.achievementRate >= 100
                    ? "text-green-600"
                    : data.week4Goals.internal.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week4Goals.internal.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week4Goals.internal.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week4Goals.internal.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week4Goals.internal.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week4Goals.internal.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week4Goals.internal.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5주차 목표 섹션 */}
      {data?.week5Goals && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">영업부 5주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week5Goals.sales.achievementRate >= 100
                    ? "text-green-600"
                    : data.week5Goals.sales.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week5Goals.sales.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week5Goals.sales.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week5Goals.sales.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week5Goals.sales.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week5Goals.sales.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week5Goals.sales.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내무부 5주차 목표 달성률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={
                  data.week5Goals.internal.achievementRate >= 100
                    ? "text-green-600"
                    : data.week5Goals.internal.achievementRate >= 80
                      ? "text-yellow-600"
                      : "text-red-600"
                }>
                  {data.week5Goals.internal.achievementRate}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                목표: {formatCurrency(data.week5Goals.internal.goal)}
              </p>
              <p className="text-xs text-muted-foreground">
                현재: {formatCurrency(data.week5Goals.internal.current)}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${data.week5Goals.internal.achievementRate >= 100
                    ? "bg-green-600"
                    : data.week5Goals.internal.achievementRate >= 80
                      ? "bg-yellow-600"
                      : "bg-red-600"
                    }`}
                  style={{ width: `${Math.min(100, data.week5Goals.internal.achievementRate)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 차트 영역 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>마케팅 매체 상품별 매출</CardTitle>
            <CardDescription>{formatMonthDisplay(selectedMonth)} 매체별 매출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.productSales && data.productSales.length > 0 ? (
              <div className="space-y-3">
                {data.productSales.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(product.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(product.amount / data.overview.currentMonthTotal * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                매체별 매출 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>입력자별 실적</CardTitle>
            <CardDescription>{formatMonthDisplay(selectedMonth)} 입력자별 매출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 주차 탭 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { label: '월별', value: 0 },
                { label: '1주', value: 1 },
                { label: '2주', value: 2 },
                { label: '3주', value: 3 },
                { label: '4주', value: 4 },
                { label: '5주', value: 5 },
              ].filter(tab => {
                if (tab.value === 0) return true
                const weekStats = data?.weeklyInputPersonStats?.find(w => w.week === tab.value)
                return weekStats && weekStats.stats.length > 0
              }).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => { setInputPersonWeek(tab.value) }}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${inputPersonWeek === tab.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {(() => {
              const list = inputPersonWeek === 0
                ? data?.inputPersonStats ?? []
                : data?.weeklyInputPersonStats?.find(w => w.week === inputPersonWeek)?.stats ?? []
              const total = list.reduce((s, p) => s + p.amount, 0)
              return list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((person, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{person.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(person.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({total > 0 ? Math.round(person.amount / total * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  입력자별 실적 데이터가 없습니다
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>부서별 실적</CardTitle>
            <CardDescription>{formatMonthDisplay(selectedMonth)} 부서별 매출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 주차 탭 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {[
                { label: '월별', value: 0 },
                { label: '1주', value: 1 },
                { label: '2주', value: 2 },
                { label: '3주', value: 3 },
                { label: '4주', value: 4 },
                { label: '5주', value: 5 },
              ].filter(tab => {
                if (tab.value === 0) return true
                const weekStats = data?.weeklyDepartmentStats?.find(w => w.week === tab.value)
                return weekStats && weekStats.stats.length > 0
              }).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => { setDepartmentWeek(tab.value); setShowAllDepartments(false) }}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${departmentWeek === tab.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {(() => {
              const list = departmentWeek === 0
                ? data?.departmentSales ?? []
                : data?.weeklyDepartmentStats?.find(w => w.week === departmentWeek)?.stats ?? []
              const total = list.reduce((s, d) => s + d.amount, 0)
              return list.length > 0 ? (
                <div className="space-y-3">
                  {(showAllDepartments ? list : list.slice(0, 5)).map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(dept.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({total > 0 ? Math.round(dept.amount / total * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                  {list.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowAllDepartments(!showAllDepartments)}
                    >
                      {showAllDepartments ? '접기' : `+${list.length - 5}개 더 보기`}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  부서별 매출 데이터가 없습니다
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}