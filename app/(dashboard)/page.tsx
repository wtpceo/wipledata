"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  departmentSales: { name: string; amount: number }[]
  salesPersonStats: { name: string; amount: number }[]
  productSales: { name: string; amount: number }[]
  inputPersonStats: { name: string; amount: number }[]
  monthlyTrend: { month: string; amount: number }[]
  recentSales: any[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  )
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [showAllInputPerson, setShowAllInputPerson] = useState(false)
  const [showAllDepartments, setShowAllDepartments] = useState(false)

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
    // 월 변경 시 더보기 상태 초기화
    setShowAllProducts(false)
    setShowAllInputPerson(false)
    setShowAllDepartments(false)
  }

  const formatMonthDisplay = (month: string) => {
    const date = new Date(month + '-01')
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
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
              전월 대비 {data?.overview?.monthGrowthRate > 0 ? '+' : ''}{data?.overview?.monthGrowthRate || 0}%
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
                className={`h-2 rounded-full ${
                  (data?.overview?.achievementRate || 0) >= 100
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
                {(showAllProducts ? data.productSales : data.productSales.slice(0, 5)).map((product, index) => (
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
                {data.productSales.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAllProducts(!showAllProducts)}
                  >
                    {showAllProducts ? '접기' : `+${data.productSales.length - 5}개 더 보기`}
                  </Button>
                )}
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
            {data?.inputPersonStats && data.inputPersonStats.length > 0 ? (
              <div className="space-y-3">
                {(showAllInputPerson ? data.inputPersonStats : data.inputPersonStats.slice(0, 5)).map((person, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(person.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(person.amount / data.overview.currentMonthTotal * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
                {data.inputPersonStats.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAllInputPerson(!showAllInputPerson)}
                  >
                    {showAllInputPerson ? '접기' : `+${data.inputPersonStats.length - 5}명 더 보기`}
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                입력자별 실적 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>부서별 실적</CardTitle>
            <CardDescription>{formatMonthDisplay(selectedMonth)} 부서별 매출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.departmentSales && data.departmentSales.length > 0 ? (
              <div className="space-y-3">
                {(showAllDepartments ? data.departmentSales : data.departmentSales.slice(0, 5)).map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatCurrency(dept.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(dept.amount / data.overview.currentMonthTotal * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
                {data.departmentSales.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAllDepartments(!showAllDepartments)}
                  >
                    {showAllDepartments ? '접기' : `+${data.departmentSales.length - 5}개 더 보기`}
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                부서별 매출 데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>매출 내역</CardTitle>
          <CardDescription>{formatMonthDisplay(selectedMonth)} 매출 내역</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentSales && data.recentSales.length > 0 ? (
            <div className="space-y-4">
              {data.recentSales.map((sale, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{sale.clientName}</p>
                    <p className="text-sm text-muted-foreground">{sale.productName || '제품명 없음'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                    <p className="text-sm text-muted-foreground">{sale.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              아직 등록된 데이터가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}