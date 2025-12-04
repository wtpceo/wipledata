"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tv, TrendingUp, Users, Calendar, CheckCircle, Clock, DollarSign, BarChart3 } from 'lucide-react'

interface FocusMediaItem {
  id: string
  timestamp: string
  department: string
  inputPerson: string
  salesType: string
  clientName: string
  productName: string
  contractPeriod: string
  totalAmount: number
  paymentMethod: string
  outsourcingCost: number
  netProfit: number
  contractDate: string
  contractEndDate: string
  inputMonth: string
  marketingManager: string
  onlineCheckRequested: string
  onlineCheckDateTime: string
  clientAddress: string
  clientContact: string
}

interface Summary {
  totalSales: number
  totalOutsourcing: number
  totalNetProfit: number
  totalContracts: number
  newContracts: number
  renewalContracts: number
  onlineCheckRequested: number
  avgContractAmount: number
}

interface ManagerStat {
  name: string
  count: number
  amount: number
}

interface MonthlyTrend {
  month: string
  amount: number
  count: number
}

interface WeekDistribution {
  period: string
  count: number
}

export default function FocusMediaPage() {
  const [data, setData] = useState<FocusMediaItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [managerStats, setManagerStats] = useState<ManagerStat[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [weekDistribution, setWeekDistribution] = useState<WeekDistribution[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async (month: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/focus-media?month=${month}`)
      const result = await response.json()

      setData(result.data || [])
      setSummary(result.summary || null)
      setManagerStats(result.managerStats || [])
      setMonthlyTrend(result.monthlyTrend || [])
      setWeekDistribution(result.weekDistribution || [])
    } catch (error) {
      console.error('Error fetching focus media data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedMonth)
  }, [selectedMonth])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('ko-KR')
    }
    return dateString
  }

  // 월 선택 옵션 생성 (최근 12개월)
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    monthOptions.push(date.toISOString().substring(0, 7))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tv className="h-8 w-8 text-blue-600" />
            포커스미디어 매출 분석
          </h2>
          <p className="text-muted-foreground">
            포커스미디어 옥외광고 매출 현황 및 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="all">전체</option>
            {monthOptions.map(month => (
              <option key={month} value={month}>
                {month.replace('-', '년 ')}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalSales || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  순수익: {formatCurrency(summary?.totalNetProfit || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 계약 건수</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalContracts || 0}건</div>
                <p className="text-xs text-muted-foreground">
                  평균 {formatCurrency(summary?.avgContractAmount || 0)}/건
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">신규 / 연장</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.newContracts || 0} / {summary?.renewalContracts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  신규 {summary?.newContracts || 0}건, 연장 {summary?.renewalContracts || 0}건
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">온라인 점검 희망</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.onlineCheckRequested || 0}건</div>
                <p className="text-xs text-muted-foreground">
                  점검 요청 업체
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 담당자별 실적 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  담당자별 실적
                </CardTitle>
                <CardDescription>입력자 기준 매출 현황</CardDescription>
              </CardHeader>
              <CardContent>
                {managerStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {managerStats.slice(0, 5).map((stat, index) => (
                      <div key={stat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                          <span className="font-medium">{stat.name}</span>
                          <Badge variant="secondary">{stat.count}건</Badge>
                        </div>
                        <span className="font-semibold">{formatCurrency(stat.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 계약 기간 분포 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  계약 기간 분포
                </CardTitle>
                <CardDescription>주 단위 계약 현황</CardDescription>
              </CardHeader>
              <CardContent>
                {weekDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {weekDistribution.map((item) => (
                      <div key={item.period} className="flex items-center justify-between">
                        <span className="font-medium">{item.period}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (item.count / (summary?.totalContracts || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{item.count}건</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 월별 추이 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                월별 매출 추이
              </CardTitle>
              <CardDescription>최근 6개월 포커스미디어 매출 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-40">
                {monthlyTrend.map((item) => {
                  const maxAmount = Math.max(...monthlyTrend.map(t => t.amount))
                  const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0

                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium">{formatCurrency(item.amount)}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t min-h-[4px]"
                        style={{ height: `${Math.max(4, height)}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.month.split('-')[1]}월
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.count}건
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 상세 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>계약 상세 목록</CardTitle>
              <CardDescription>
                총 {data.length}건의 포커스미디어 계약
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>계약일</TableHead>
                      <TableHead>광고주</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>계약기간</TableHead>
                      <TableHead className="text-right">계약금액</TableHead>
                      <TableHead className="text-right">외주비</TableHead>
                      <TableHead className="text-right">순수익</TableHead>
                      <TableHead>담당자</TableHead>
                      <TableHead>온라인점검</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.contractDate)}</TableCell>
                          <TableCell className="font-medium">{item.clientName}</TableCell>
                          <TableCell>
                            <Badge variant={item.salesType === '신규' ? 'default' : 'secondary'}>
                              {item.salesType}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.contractPeriod}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.outsourcingCost)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(item.netProfit)}
                          </TableCell>
                          <TableCell>{item.inputPerson}</TableCell>
                          <TableCell>
                            {item.onlineCheckRequested === 'Y' ? (
                              <Badge variant="outline" className="text-blue-600">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.onlineCheckDateTime || '희망'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
