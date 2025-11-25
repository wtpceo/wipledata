"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, Loader2, TrendingUp, TrendingDown, Building2, User } from 'lucide-react'

interface AdvanceRecord {
  id: string
  date: string
  description: string
  paymentAmount: number
  repaymentAmount: number
  balance: number
  note: string
}

interface SectionData {
  title: string
  headers: string[]
  data: AdvanceRecord[]
  totalPayment: number
  totalRepayment: number
  currentBalance: number
}

export default function AdvancePaymentPage() {
  const [sections, setSections] = useState<SectionData[]>([])
  const [totalCurrentBalance, setTotalCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/advance-payment')
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const result = await response.json()
      setSections(result.sections || [])
      setTotalCurrentBalance(result.totalCurrentBalance || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const getSectionIcon = (title: string) => {
    if (title.includes('위플푸드')) return <Building2 className="h-5 w-5" />
    return <User className="h-5 w-5" />
  }

  const getSectionColor = (index: number) => {
    const colors = ['orange', 'blue', 'purple']
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">가지급금/가수금</h1>
        <p className="text-muted-foreground mt-2">
          가지급금 및 가수금 현황을 조회합니다
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
          {/* 전체 요약 카드 */}
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">전체 잔액 현황</CardTitle>
              <Wallet className="h-6 w-6 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {formatCurrency(totalCurrentBalance)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {sections.length}개 항목의 총 잔액
              </p>
            </CardContent>
          </Card>

          {/* 각 섹션별 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            {sections.map((section, index) => {
              const color = getSectionColor(index)
              return (
                <Card key={section.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                    {getSectionIcon(section.title)}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold text-${color}-600`}>
                      {formatCurrency(section.currentBalance)}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {formatCurrency(section.totalPayment)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        {formatCurrency(section.totalRepayment)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 각 섹션별 상세 테이블 */}
          {sections.map((section, index) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getSectionIcon(section.title)}
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <CardDescription>
                  현재 잔액: <span className="font-semibold text-foreground">{formatCurrency(section.currentBalance)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {section.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    데이터가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {section.headers.map((header, idx) => (
                            <TableHead key={idx} className="whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.data.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                row.description === '가지급금' ? 'bg-orange-100 text-orange-800' :
                                row.description === '가수금' ? 'bg-blue-100 text-blue-800' :
                                row.description === '상환액' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {row.description || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {row.paymentAmount > 0 ? formatCurrency(row.paymentAmount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-600">
                              {row.repaymentAmount > 0 ? formatCurrency(row.repaymentAmount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {row.balance > 0 ? formatCurrency(row.balance) : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {row.note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
