"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Landmark, Loader2, Percent, Calendar, TrendingDown, Banknote, CheckCircle } from 'lucide-react'

interface LoanRecord {
  id: string
  loanName: string       // 구분 (대출명)
  principal: number      // 약정 금액 (대출원금)
  repaid: number         // 상환 금액
  balance: number        // 대출 잔액
  interestRate: number   // 이율 (%)
  endDate: string        // 만기 일자
}

export default function LoansPage() {
  const [data, setData] = useState<LoanRecord[]>([])
  const [totalPrincipal, setTotalPrincipal] = useState(0)
  const [totalRepaid, setTotalRepaid] = useState(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [avgInterestRate, setAvgInterestRate] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/loans')
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const result = await response.json()
      setData(result.data || [])
      setTotalPrincipal(result.totalPrincipal || 0)
      setTotalRepaid(result.totalRepaid || 0)
      setTotalBalance(result.totalBalance || 0)
      setAvgInterestRate(result.avgInterestRate || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return '-'
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatCurrencyPlain = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  // 상환률 계산 (원금 대비 상환된 금액)
  const repaymentRate = totalPrincipal > 0
    ? ((totalRepaid) / totalPrincipal * 100).toFixed(1)
    : '0.0'

  // 만기 임박 대출 (90일 이내)
  const getUpcomingMaturities = () => {
    const now = new Date()
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    return data.filter(loan => {
      if (!loan.endDate) return false
      const endDate = new Date(loan.endDate)
      return endDate >= now && endDate <= ninetyDaysLater
    })
  }

  const upcomingMaturities = getUpcomingMaturities()

  // 만기까지 남은 일수 계산
  const getDaysUntilMaturity = (endDate: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대출 현황</h1>
        <p className="text-muted-foreground mt-2">
          회사 대출 현황을 조회합니다
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 총 대출잔액 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 대출잔액</CardTitle>
                <Landmark className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrencyPlain(totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.length}건의 대출
                </p>
              </CardContent>
            </Card>

            {/* 약정 금액 (대출원금) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">약정 금액</CardTitle>
                <Banknote className="h-5 w-5 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrencyPlain(totalPrincipal)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  총 대출 약정 금액
                </p>
              </CardContent>
            </Card>

            {/* 상환 금액 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">상환 금액</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrencyPlain(totalRepaid)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  상환률 {repaymentRate}%
                </p>
              </CardContent>
            </Card>

            {/* 평균 이자율 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 이율</CardTitle>
                <Percent className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {avgInterestRate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  잔액 가중 평균
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 만기 임박 대출 알림 */}
          {upcomingMaturities.length > 0 && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-lg text-yellow-800">만기 임박 대출</CardTitle>
                </div>
                <CardDescription className="text-yellow-700">
                  90일 이내 만기 예정인 대출이 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingMaturities.map(loan => {
                    const daysLeft = getDaysUntilMaturity(loan.endDate)
                    return (
                      <div
                        key={loan.id}
                        className="flex justify-between items-center p-3 bg-white rounded-lg border border-yellow-200"
                      >
                        <div>
                          <span className="font-medium">{loan.loanName}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(loan.balance)}</div>
                          <div className="text-sm text-yellow-600">
                            만기: {loan.endDate} ({daysLeft}일 남음)
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 상세 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>대출 상세 내역</CardTitle>
              <CardDescription>
                대출별 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">구분</TableHead>
                        <TableHead className="text-right whitespace-nowrap">약정 금액</TableHead>
                        <TableHead className="text-right whitespace-nowrap">상환 금액</TableHead>
                        <TableHead className="text-right whitespace-nowrap">대출 잔액</TableHead>
                        <TableHead className="text-right whitespace-nowrap">이율</TableHead>
                        <TableHead className="whitespace-nowrap">만기 일자</TableHead>
                        <TableHead className="text-right whitespace-nowrap">D-Day</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => {
                        const daysLeft = getDaysUntilMaturity(row.endDate)
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.loanName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(row.repaid)}</TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {formatCurrency(row.balance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.interestRate > 0 ? `${row.interestRate.toFixed(1)}%` : '-'}
                            </TableCell>
                            <TableCell>{row.endDate || '-'}</TableCell>
                            <TableCell className="text-right">
                              {daysLeft !== null ? (
                                <span className={`${
                                  daysLeft <= 30 ? 'text-red-600 font-bold' :
                                  daysLeft <= 90 ? 'text-yellow-600 font-semibold' :
                                  'text-gray-600'
                                }`}>
                                  D-{daysLeft}
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* 합계 행 */}
                      <TableRow className="bg-blue-50 font-bold">
                        <TableCell>합계</TableCell>
                        <TableCell className="text-right">{formatCurrencyPlain(totalPrincipal)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrencyPlain(totalRepaid)}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCurrencyPlain(totalBalance)}</TableCell>
                        <TableCell className="text-right text-orange-600">{avgInterestRate.toFixed(2)}%</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
