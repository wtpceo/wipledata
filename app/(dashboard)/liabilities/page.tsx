"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditCard, Loader2, TrendingDown, AlertTriangle } from 'lucide-react'

interface LiabilityRecord {
  id: string
  name: string
  beforeJune: number
  july: number
  august: number
  september: number
  october: number
  november: number
  december: number
  subtotal: number
}

interface MonthlyTotals {
  beforeJune: number
  july: number
  august: number
  september: number
  october: number
  november: number
  december: number
}

export default function LiabilitiesPage() {
  const [data, setData] = useState<LiabilityRecord[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/liabilities')
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const result = await response.json()
      setData(result.data || [])
      setGrandTotal(result.grandTotal || 0)
      setMonthlyTotals(result.monthlyTotals || null)
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

  // 상위 3개 항목 찾기
  const topItems = [...data].sort((a, b) => b.subtotal - a.subtotal).slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">부채 (미지급금)</h1>
        <p className="text-muted-foreground mt-2">
          미지급금 현황을 조회합니다
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
          {/* 총계 카드 */}
          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">미지급금 총계</CardTitle>
              <CreditCard className="h-6 w-6 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrencyPlain(grandTotal)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {data.length}개 항목
              </p>
            </CardContent>
          </Card>

          {/* 상위 미지급금 항목 */}
          <div className="grid gap-4 md:grid-cols-3">
            {topItems.map((item, index) => (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <span className="text-muted-foreground mr-2">#{index + 1}</span>
                    {item.name}
                  </CardTitle>
                  <AlertTriangle className={`h-4 w-4 ${
                    index === 0 ? 'text-red-500' :
                    index === 1 ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${
                    index === 0 ? 'text-red-600' :
                    index === 1 ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {formatCurrencyPlain(item.subtotal)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    전체의 {((item.subtotal / grandTotal) * 100).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 월별 추이 */}
          {monthlyTotals && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">월별 미지급금 현황</CardTitle>
                <CardDescription>월별 미지급금 발생 금액</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 grid-cols-4 md:grid-cols-7">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">~6월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.beforeJune)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">7월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.july)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">8월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.august)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">9월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.september)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">10월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.october)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">11월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.november)}</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground mb-1">12월</div>
                    <div className="text-sm font-semibold">{formatCurrency(monthlyTotals.december)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 상세 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>미지급금 상세 내역</CardTitle>
              <CardDescription>
                항목별 월별 미지급금 현황
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
                        <TableHead className="whitespace-nowrap">내용</TableHead>
                        <TableHead className="text-right whitespace-nowrap">~6월 이전</TableHead>
                        <TableHead className="text-right whitespace-nowrap">7월</TableHead>
                        <TableHead className="text-right whitespace-nowrap">8월</TableHead>
                        <TableHead className="text-right whitespace-nowrap">9월</TableHead>
                        <TableHead className="text-right whitespace-nowrap">10월</TableHead>
                        <TableHead className="text-right whitespace-nowrap">11월</TableHead>
                        <TableHead className="text-right whitespace-nowrap">12월</TableHead>
                        <TableHead className="text-right whitespace-nowrap bg-red-50">미지급금 소계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.beforeJune)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.july)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.august)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.september)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.october)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.november)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.december)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600 bg-red-50">
                            {formatCurrencyPlain(row.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* 합계 행 */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell>합계</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.beforeJune) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.july) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.august) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.september) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.october) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.november) : '-'}</TableCell>
                        <TableCell className="text-right">{monthlyTotals ? formatCurrency(monthlyTotals.december) : '-'}</TableCell>
                        <TableCell className="text-right text-red-600 bg-red-100">
                          {formatCurrencyPlain(grandTotal)}
                        </TableCell>
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
