"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Users,
  AlertCircle,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Building
} from "lucide-react"

interface ClientInfo {
  clientName: string
  aeName: string
  endDate: string
  department: string
  monthlyAmount: number
  status: string
}

interface MonthlyTermination {
  month: string
  totalClients: number
  totalAmount: number
  clients: ClientInfo[]
  monthName?: string
  aeData?: {
    [key: string]: {
      aeName: string
      department: string
      totalClients: number
      terminatingClients: number
      clients: ClientInfo[]
    }
  }
}

interface AETermination {
  aeName: string
  department: string
  totalClients: number
  monthlyData: {
    [month: string]: {
      count: number
      amount: number
      clients: ClientInfo[]
    }
  }
}

interface TerminationData {
  monthlyTerminations: MonthlyTermination[]
  aeTerminations: AETermination[]
  upcomingTerminations: MonthlyTermination[]
  summary: {
    totalClients: number
    totalTerminatingClients: number
    currentMonthTerminations: number
    nextMonthTerminations: number
    threeMonthsTerminations: number
  }
  aeClientCounts: { [key: string]: number }
}

export default function ClientTerminationPage() {
  const [data, setData] = useState<TerminationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [expandedAE, setExpandedAE] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'monthly' | 'ae'>('monthly')

  useEffect(() => {
    fetchTerminationData()
  }, [])

  const fetchTerminationData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client-termination')
      if (response.ok) {
        const terminationData = await response.json()
        setData(terminationData)

        // 최신 월 선택
        if (terminationData.monthlyTerminations.length > 0) {
          setSelectedMonth(terminationData.monthlyTerminations[0].month)
        }
      }
    } catch (error) {
      console.error('Failed to fetch termination data:', error)
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  const selectedMonthData = data?.monthlyTerminations.find(m => m.month === selectedMonth)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AE별 종료 업체 관리</h2>
          <p className="text-muted-foreground">
            서비스 종료 예정 광고주를 월별, 담당자별로 관리합니다
          </p>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 클라이언트</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.summary.totalClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              전체 관리 중인 광고주
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 종료</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {data?.summary.currentMonthTerminations || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              2025년 10월 종료 예정
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">다음달 종료</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data?.summary.nextMonthTerminations || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              2025년 11월 종료 예정
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">향후 3개월</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.summary.threeMonthsTerminations || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              10월-12월 총 종료 예정
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 뷰 모드 선택 */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'monthly' ? 'default' : 'outline'}
          onClick={() => setViewMode('monthly')}
        >
          월별 현황
        </Button>
        <Button
          variant={viewMode === 'ae' ? 'default' : 'outline'}
          onClick={() => setViewMode('ae')}
        >
          AE별 현황
        </Button>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* 향후 3개월 종료 예정 */}
          <Card>
            <CardHeader>
              <CardTitle>향후 3개월 종료 예정 현황</CardTitle>
              <CardDescription>
                앞으로 3개월간 종료 예정인 광고주 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {data?.upcomingTerminations.map((month) => (
                  <div key={month.month} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{month.monthName}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.totalClients}개 업체
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(month.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">종료되는 총 매출</p>
                      </div>
                    </div>
                    {month.clients.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {month.clients.slice(0, 3).map((client, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {client.clientName} ({client.aeName})
                          </div>
                        ))}
                        {month.clients.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            외 {month.clients.length - 3}개
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 월별 상세 현황 */}
          <Card>
            <CardHeader>
              <CardTitle>월별 종료 업체 상세</CardTitle>
              <CardDescription>
                최근 12개월 종료 업체 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 월 선택 */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
                {data?.monthlyTerminations.map((month) => (
                  <Button
                    key={month.month}
                    variant={selectedMonth === month.month ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMonth(month.month)}
                  >
                    {new Date(month.month + '-01').toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long'
                    })}
                    <span className="ml-1 text-xs">({month.totalClients})</span>
                  </Button>
                ))}
              </div>

              {/* 선택된 월의 상세 데이터 */}
              {selectedMonthData && (
                <div>
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">종료 업체 수</p>
                        <p className="text-xl font-bold">{selectedMonthData.totalClients}개</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">종료되는 총 매출</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedMonthData.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">평균 매출</p>
                        <p className="text-xl font-bold">
                          {selectedMonthData.totalClients > 0
                            ? formatCurrency(selectedMonthData.totalAmount / selectedMonthData.totalClients)
                            : '₩0'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">담당 AE 수</p>
                        <p className="text-xl font-bold">
                          {Object.keys(selectedMonthData.aeData || {}).length}명
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 담당자별 종료 예정 현황 */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg mb-2">담당자별 현황</h4>
                    {selectedMonthData.aeData && Object.values(selectedMonthData.aeData).map((ae: any) => (
                      <div key={ae.aeName} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">{ae.aeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {ae.department} | 총 담당 {ae.totalClients}개 중 {ae.terminatingClients}개 종료 예정
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              종료율: {ae.totalClients > 0 ? Math.round((ae.terminatingClients / ae.totalClients) * 100) : 0}%
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          {ae.clients.map((client: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{client.clientName}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({formatDate(client.endDate)})
                                </span>
                              </div>
                              <span className="font-medium">{formatCurrency(client.monthlyAmount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* AE별 현황 */
        <Card>
          <CardHeader>
            <CardTitle>AE별 종료 업체 현황</CardTitle>
            <CardDescription>
              담당자별 종료 예정 광고주 관리
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.aeTerminations.map((ae) => (
                <div key={ae.aeName} className="border rounded-lg p-4">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setExpandedAE(expandedAE === ae.aeName ? null : ae.aeName)}
                  >
                    <div>
                      <p className="font-semibold text-lg">{ae.aeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {ae.department} | 총 {ae.totalClients}개 종료 예정
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p className="font-bold">
                          {formatCurrency(
                            Object.values(ae.monthlyData).reduce((sum, m) => sum + m.amount, 0)
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">종료되는 총 매출</p>
                      </div>
                      {expandedAE === ae.aeName ?
                        <ChevronUp className="h-5 w-5" /> :
                        <ChevronDown className="h-5 w-5" />
                      }
                    </div>
                  </div>

                  {expandedAE === ae.aeName && (
                    <div className="mt-4 space-y-3">
                      {Object.entries(ae.monthlyData)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([month, data]) => (
                          <div key={month} className="pl-4 border-l-2">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">
                                  {new Date(month + '-01').toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long'
                                  })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {data.count}개 업체 종료
                                </p>
                              </div>
                              <p className="font-bold">{formatCurrency(data.amount)}</p>
                            </div>
                            <div className="space-y-1">
                              {data.clients.map((client, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">
                                  • {client.clientName} - {formatDate(client.endDate)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}