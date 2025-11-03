"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Users, DollarSign, TrendingDown } from "lucide-react"

interface ClaimClient {
  status: string
  clientName: string
  ae: string
  startDate: string
  endDate: string
  contractMonths: number
  contractAmount: number
  product: string
  department: string
  claimReason: string
  claimDate: string
}

interface Summary {
  totalCount: number
  totalAmount: number
  byDepartment: { [key: string]: { count: number; amount: number } }
  byAE: { [key: string]: { count: number; amount: number; clients: string[] } }
  byProduct: { [key: string]: { count: number; amount: number } }
}

interface DashboardData {
  claimClients: ClaimClient[]
  summary: Summary
}

export default function ClaimDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/claim-dashboard')
      if (response.ok) {
        const claimData = await response.json()
        setData(claimData)
      } else {
        alert('데이터를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to fetch claim dashboard data:', error)
      alert('데이터를 불러오는 중 오류가 발생했습니다.')
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">클라임 대시보드</h2>
        <p className="text-muted-foreground">
          클라임 상태 광고주 현황 및 분석
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">총 클라임 광고주</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {data?.summary?.totalCount || 0}개
            </div>
            <p className="text-xs text-red-700 mt-1">
              클라임 상태로 표시된 광고주
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">총 계약 금액</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(data?.summary?.totalAmount || 0)}
            </div>
            <p className="text-xs text-red-700 mt-1">
              클라임 광고주 계약금액 합계
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">평균 계약 금액</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(
                (data?.summary?.totalCount || 0) > 0
                  ? (data?.summary?.totalAmount || 0) / (data?.summary?.totalCount || 1)
                  : 0
              )}
            </div>
            <p className="text-xs text-red-700 mt-1">
              광고주당 평균 계약금액
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 부서별 클라임 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>부서별 클라임 현황</CardTitle>
          <CardDescription>부서별 클라임 광고주 수 및 금액</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.summary?.byDepartment && Object.keys(data.summary.byDepartment).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(data.summary.byDepartment)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([dept, stats]) => (
                  <div key={dept} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium">{dept}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.count}개 광고주
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(stats.amount)}</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center py-6 text-muted-foreground">데이터가 없습니다.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* AE별 클라임 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>AE별 클라임 현황</CardTitle>
            <CardDescription>담당 AE별 클라임 광고주 분포</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.summary?.byAE && Object.keys(data.summary.byAE).length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Object.entries(data.summary.byAE)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([ae, stats]) => (
                    <div key={ae} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{ae}</p>
                        <span className="text-sm text-red-600 font-bold">
                          {stats.count}개
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-1">{formatCurrency(stats.amount)}</p>
                        <p className="text-xs">
                          {stats.clients.slice(0, 3).join(', ')}
                          {stats.clients.length > 3 && ` 외 ${stats.clients.length - 3}개`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 매체별 클라임 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>매체별 클라임 현황</CardTitle>
            <CardDescription>마케팅 매체별 클라임 광고주 분포</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.summary?.byProduct && Object.keys(data.summary.byProduct).length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {Object.entries(data.summary.byProduct)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .map(([product, stats]) => (
                    <div key={product} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{product}</p>
                        <p className="text-sm text-muted-foreground">{stats.count}개 광고주</p>
                      </div>
                      <p className="font-bold text-red-600">{formatCurrency(stats.amount)}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center py-6 text-muted-foreground">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 클라임 광고주 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>클라임 광고주 상세 목록</CardTitle>
          <CardDescription>전체 클라임 상태 광고주 정보</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.claimClients && data.claimClients.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data.claimClients.map((client, index) => (
                <div
                  key={index}
                  className="border border-red-200 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <h4 className="font-bold text-lg">{client.clientName}</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">담당 AE</p>
                          <p className="font-medium">{client.ae || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">부서</p>
                          <p className="font-medium">{client.department || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">매체</p>
                          <p className="font-medium">{client.product || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">계약 금액</p>
                          <p className="font-bold text-red-600">{formatCurrency(client.contractAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">계약 기간</p>
                          <p className="font-medium">{client.contractMonths}개월</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">종료일</p>
                          <p className="font-medium">{client.endDate || '-'}</p>
                        </div>
                      </div>
                      {client.claimReason && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-sm text-muted-foreground">클라임 사유</p>
                          <p className="text-sm mt-1">{client.claimReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              클라임 상태 광고주가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
