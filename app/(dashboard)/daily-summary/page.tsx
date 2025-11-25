"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react'

interface DailySummary {
  date: string
  totalGrossSales: number  // 총 매출
  totalNetSales: number    // 순매출
  totalPurchase: number
  profit: number
  salesDetails: {
    advertiser: string
    grossAmount: number
    netAmount: number
    team: string
    description: string
  }[]
  purchaseDetails: {
    advertiser: string
    amount: number
    team: string
    description: string
  }[]
}

export default function DailySummaryPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 오늘 날짜를 기본값으로 설정
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }, [])

  // 데이터 로드
  useEffect(() => {
    if (startDate && endDate) {
      fetchDailySummary()
    }
  }, [startDate, endDate])

  const fetchDailySummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/daily-summary?startDate=${startDate}&endDate=${endDate}`
      )
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setSummaries(data.summaries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDate = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const totalGrossSales = summaries.reduce((sum, s) => sum + s.totalGrossSales, 0)
  const totalNetSales = summaries.reduce((sum, s) => sum + s.totalNetSales, 0)
  const totalPurchase = summaries.reduce((sum, s) => sum + s.totalPurchase, 0)
  const totalProfit = totalNetSales - totalPurchase

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">일자별 매출/매입</h1>
        <p className="text-muted-foreground mt-2">
          일자별 매출과 매입 내역을 조회하고 수익을 확인하세요
        </p>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            기간 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">시작일:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">종료일:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickDate(0)}>
                오늘
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate(1)}>
                어제
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate(7)}>
                최근 7일
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate(30)}>
                최근 30일
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 전체 요약 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalGrossSales)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalNetSales)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매입</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPurchase)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순이익</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 로딩 및 에러 상태 */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          선택한 기간에 데이터가 없습니다.
        </div>
      ) : (
        /* 일자별 상세 내역 */
        summaries.map((summary) => (
          <div key={summary.date} className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {new Date(summary.date + 'T00:00:00').toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </h2>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">총 매출</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalGrossSales)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">순매출</div>
                  <div className="text-xl font-bold text-emerald-600">
                    {formatCurrency(summary.totalNetSales)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">매입</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(summary.totalPurchase)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">순이익</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(summary.profit)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 매출 상세 */}
            {summary.salesDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">매출 상세</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>업체명</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>내용</TableHead>
                        <TableHead className="text-right">총 매출</TableHead>
                        <TableHead className="text-right">순매출</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.salesDetails.map((detail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{detail.advertiser}</TableCell>
                          <TableCell>{detail.team}</TableCell>
                          <TableCell>{detail.description}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {formatCurrency(detail.grossAmount)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {formatCurrency(detail.netAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* 매입 상세 */}
            {summary.purchaseDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">매입 상세</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>내역</TableHead>
                        <TableHead>사용처/담당자</TableHead>
                        <TableHead>계정과목</TableHead>
                        <TableHead className="text-right">금액</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.purchaseDetails.map((detail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{detail.advertiser}</TableCell>
                          <TableCell>{detail.team}</TableCell>
                          <TableCell>{detail.description}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">
                            {formatCurrency(detail.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ))
      )}
    </div>
  )
}
