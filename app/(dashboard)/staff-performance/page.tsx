'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, Users, FileText, Award, ChevronDown, ChevronRight } from 'lucide-react'

interface ClientInfo {
  name: string
  amount: number
  staff: string
}

interface SalesTypeBreakdown {
  type: string
  count: number
  totalAmount: number
  netProfit: number
  clients: string[]
}

interface StaffPerformance {
  staff: string
  department: string
  totalSales: number
  totalNetProfit: number
  totalContracts: number
  salesByType: { [key: string]: SalesTypeBreakdown }
}

interface SalesTypeStats {
  type: string
  count: number
  totalAmount: number
  netProfit: number
  percentage: number
  clients: ClientInfo[]
}

interface PerformanceData {
  staffRankings: StaffPerformance[]
  totalStats: {
    totalStaff: number
    totalSales: number
    totalNetProfit: number
    totalContracts: number
    averageSalesPerStaff: number
  }
  salesTypeStats: SalesTypeStats[]
}

export default function StaffPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [expandedTypes, setExpandedTypes] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedMonth) params.append('month', selectedMonth)

      const response = await fetch(`/api/staff-sales-performance?${params}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const toggleSalesType = (type: string) => {
    setExpandedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // 매출 유형별 색상 매핑
  const salesTypeColors: { [key: string]: string } = {
    '신규': 'bg-blue-500',
    '연장': 'bg-green-500',
    '재계약': 'bg-purple-500',
    '기타': 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">데이터를 불러올 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">영업 실적</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            영업부 소속 담당자별 실적 현황
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-2">월 선택</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded-md px-3 py-2 w-full sm:w-auto text-sm md:text-base"
          />
        </div>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">총 담당자 수</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{data.totalStats.totalStaff}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">총 매출액</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm md:text-2xl font-bold break-all">{formatCurrency(data.totalStats.totalSales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">총 순수익</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm md:text-2xl font-bold break-all">{formatCurrency(data.totalStats.totalNetProfit)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">총 계약 건수</CardTitle>
            <FileText className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{data.totalStats.totalContracts}건</div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 유형별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">매출 유형별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4">
            {data.salesTypeStats.map((stat) => {
              const isExpanded = expandedTypes.includes(stat.type)
              return (
                <div key={stat.type} className="space-y-2">
                  <div
                    className="flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                    onClick={() => toggleSalesType(stat.type)}
                  >
                    <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0 ${salesTypeColors[stat.type] || 'bg-gray-500'}`} />
                      <span className="font-medium text-sm md:text-base truncate">{stat.type}</span>
                      <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">({stat.count}건)</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-xs md:text-base">{formatCurrency(stat.totalAmount)}</div>
                      <div className="text-xs md:text-sm text-muted-foreground">{stat.percentage}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${salesTypeColors[stat.type] || 'bg-gray-500'}`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>

                  {/* 광고주 상세 정보 */}
                  {isExpanded && stat.clients && stat.clients.length > 0 && (
                    <div className="mt-3 pl-6 md:pl-8 space-y-2">
                      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-2">
                        광고주 상세
                      </div>
                      <div className="space-y-1.5">
                        {stat.clients.map((client, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs md:text-sm py-1.5 px-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-medium truncate">{client.name}</span>
                              <span className="text-muted-foreground flex-shrink-0">({client.staff})</span>
                            </div>
                            <span className="font-semibold flex-shrink-0 ml-2">{formatCurrency(client.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 담당자별 실적 순위 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">담당자별 실적 순위</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 md:space-y-6">
            {data.staffRankings.map((staff, index) => (
              <div key={staff.staff} className="border rounded-lg p-3 md:p-4 space-y-3 md:space-y-4">
                <div className="flex items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex-shrink-0">
                      {index === 0 && <Award className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />}
                      {index === 1 && <Award className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />}
                      {index === 2 && <Award className="h-4 w-4 md:h-5 md:w-5 text-orange-700" />}
                      {index > 2 && <span className="font-bold text-base md:text-lg">{index + 1}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-base md:text-lg truncate">{staff.staff}</div>
                      <div className="text-xs md:text-sm text-muted-foreground truncate">{staff.department}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm md:text-xl whitespace-nowrap">{formatCurrency(staff.totalSales)}</div>
                    <div className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                      순수익: {formatCurrency(staff.totalNetProfit)}
                    </div>
                  </div>
                </div>

                {/* 매출 유형별 상세 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 pt-2 md:pt-3 border-t">
                  {Object.entries(staff.salesByType).map(([type, breakdown]) => (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${salesTypeColors[type] || 'bg-gray-500'}`} />
                        <span className="text-xs md:text-sm font-medium truncate">{type}</span>
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {breakdown.count}건
                      </div>
                      <div className="text-xs md:text-sm font-semibold break-all">
                        {formatCurrency(breakdown.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 총 계약 건수 */}
                <div className="text-xs md:text-sm text-muted-foreground pt-2 border-t">
                  총 {staff.totalContracts}건의 계약
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
