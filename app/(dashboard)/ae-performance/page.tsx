"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trophy, TrendingUp, TrendingDown, Award, Users, DollarSign } from "lucide-react"

interface AERanking {
  aeName: string
  department: string
  totalClients: number
  renewedClients: number
  failedRenewals: number
  renewalRevenue: number
  renewalRate: number
}

interface DepartmentStats {
  department: string
  totalAEs: number
  totalClients: number
  renewalRate: number
  renewedClients: number
  failedRenewals: number
  renewalRevenue: number
}

interface MonthlyStats {
  month: string
  totalAEs: number
  totalClients: number
  totalExpiring: number
  totalRenewed: number
  totalFailed: number
  totalRevenue: number
  renewalRate: number
  performances: any[]
}

interface PerformanceData {
  monthlyStats: MonthlyStats[]
  aeRankings: AERanking[]
  departmentStats: DepartmentStats[]
  totalStats: {
    totalMonths: number
    averageRenewalRate: number
  }
}

export default function AEPerformanceDashboard() {
  const router = useRouter()
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    fetchPerformanceData()
  }, [])

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ae-performance')
      if (response.ok) {
        const performanceData = await response.json()
        setData(performanceData)

        // 최신 월 선택
        if (performanceData.monthlyStats.length > 0) {
          setSelectedMonth(performanceData.monthlyStats[0].month)
        }
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Award className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-orange-400" />
    return null
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  const selectedMonthData = data?.monthlyStats.find(m => m.month === selectedMonth)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AE 실적 대시보드</h2>
          <p className="text-muted-foreground">
            AE별 연장 실적과 성과를 분석합니다
          </p>
        </div>
        <Button onClick={() => router.push('/ae-performance/new')}>
          <Plus className="mr-2 h-4 w-4" />
          실적 입력
        </Button>
      </div>

      {/* 월 선택 */}
      {data && data.monthlyStats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {data.monthlyStats.map((stats) => (
            <Button
              key={stats.month}
              variant={selectedMonth === stats.month ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth(stats.month)}
            >
              {new Date(stats.month + '-01').toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long'
              })}
            </Button>
          ))}
        </div>
      )}

      {selectedMonthData ? (
        <>
          {/* 핵심 지표 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 연장률</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  selectedMonthData.renewalRate >= 80 ? 'text-green-600' :
                  selectedMonthData.renewalRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {selectedMonthData.renewalRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMonthData.totalRenewed}/{selectedMonthData.totalExpiring} 연장
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">연장 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(selectedMonthData.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMonthData.totalRenewed}개 광고주 연장
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">연장 성공</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {selectedMonthData.totalRenewed}개
                </div>
                <p className="text-xs text-muted-foreground">
                  총 {selectedMonthData.totalExpiring}개 중
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">연장 실패</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {selectedMonthData.totalFailed}개
                </div>
                <p className="text-xs text-muted-foreground">
                  이탈 광고주
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* AE 실적 랭킹 */}
            <Card>
              <CardHeader>
                <CardTitle>AE 실적 랭킹</CardTitle>
                <CardDescription>
                  {new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long'
                  })} 기준
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.aeRankings.map((ae, index) => (
                    <div
                      key={ae.aeName}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(index + 1) || (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{ae.aeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ae.department} | 담당 {ae.totalClients}개 | 연장률 {Math.round(ae.renewalRate)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(ae.renewalRevenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          성공 {ae.renewedClients} / 실패 {ae.failedRenewals}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 월별 추이 */}
            <Card>
              <CardHeader>
                <CardTitle>월별 연장률 추이</CardTitle>
                <CardDescription>최근 6개월 연장 실적</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.monthlyStats.slice(0, 6).map((stats) => (
                    <div key={stats.month} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {new Date(stats.month + '-01').toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </span>
                        <span className="text-muted-foreground">
                          {stats.renewalRate}% ({stats.totalRenewed}/{stats.totalExpiring})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stats.renewalRate >= 80
                              ? "bg-green-600"
                              : stats.renewalRate >= 50
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${Math.min(100, stats.renewalRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 부서별 실적 */}
          {data?.departmentStats && data.departmentStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>부서별 실적 현황</CardTitle>
                <CardDescription>
                  {new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long'
                  })} 부서별 통합 실적
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.departmentStats.map((dept, index) => (
                    <div
                      key={dept.department}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{dept.department}</h4>
                          <p className="text-sm text-muted-foreground">
                            AE {dept.totalAEs}명 | 담당 광고주 {dept.totalClients}개
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {formatCurrency(dept.renewalRevenue)}
                          </p>
                          <p className="text-sm text-muted-foreground">연장 매출</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">연장률</p>
                          <p className={`font-semibold text-lg ${
                            dept.renewalRate >= 80 ? 'text-green-600' :
                            dept.renewalRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {dept.renewalRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">연장 성공</p>
                          <p className="font-semibold text-lg text-green-600">
                            {dept.renewedClients}개
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">연장 실패</p>
                          <p className="font-semibold text-lg text-red-600">
                            {dept.failedRenewals}개
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">평균 매출</p>
                          <p className="font-semibold text-lg">
                            {dept.renewedClients > 0
                              ? formatCurrency(dept.renewalRevenue / dept.renewedClients)
                              : '₩0'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AE별 상세 실적 */}
          <Card>
            <CardHeader>
              <CardTitle>AE별 상세 실적</CardTitle>
              <CardDescription>
                {new Date(selectedMonth + '-01').toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long'
                })} 상세 데이터
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">부서</th>
                      <th className="text-left p-2">AE</th>
                      <th className="text-center p-2">담당 광고주</th>
                      <th className="text-center p-2">종료 예정</th>
                      <th className="text-center p-2">연장 성공</th>
                      <th className="text-center p-2">연장 실패</th>
                      <th className="text-center p-2">연장률</th>
                      <th className="text-right p-2">연장 매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonthData.performances.map((perf, index) => {
                      const rate = perf.expiringClients > 0
                        ? Math.round((perf.renewedClients / perf.expiringClients) * 100)
                        : 0

                      return (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2">{perf.department}</td>
                          <td className="p-2 font-medium">{perf.aeName}</td>
                          <td className="text-center p-2">{perf.totalClients}</td>
                          <td className="text-center p-2">{perf.expiringClients}</td>
                          <td className="text-center p-2 text-green-600">{perf.renewedClients}</td>
                          <td className="text-center p-2 text-red-600">{perf.failedRenewals}</td>
                          <td className="text-center p-2">
                            <span className={`font-medium ${
                              rate >= 80 ? 'text-green-600' :
                              rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatCurrency(perf.renewalRevenue)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-50">
                      <td className="p-2" colSpan={2}>합계</td>
                      <td className="text-center p-2">{selectedMonthData.totalClients}</td>
                      <td className="text-center p-2">{selectedMonthData.totalExpiring}</td>
                      <td className="text-center p-2 text-green-600">{selectedMonthData.totalRenewed}</td>
                      <td className="text-center p-2 text-red-600">{selectedMonthData.totalFailed}</td>
                      <td className="text-center p-2">
                        <span className={`${
                          selectedMonthData.renewalRate >= 80 ? 'text-green-600' :
                          selectedMonthData.renewalRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {selectedMonthData.renewalRate}%
                        </span>
                      </td>
                      <td className="text-right p-2">
                        {formatCurrency(selectedMonthData.totalRevenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">데이터가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              AE 실적 데이터를 입력해주세요
            </p>
            <Button onClick={() => router.push('/ae-performance/new')}>
              <Plus className="mr-2 h-4 w-4" />
              실적 입력하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}