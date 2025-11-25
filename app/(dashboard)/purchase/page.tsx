"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { TrendingDown, Loader2, Filter, CreditCard, Building2, FileText } from 'lucide-react'

interface PurchaseRecord {
  id: string
  date: string
  accountType: string
  description: string
  amount: number
  paymentMethod: string
  department: string
  note: string
}

interface AccountTypeStats {
  [key: string]: { count: number; amount: number }
}

interface DepartmentStats {
  [key: string]: { count: number; amount: number }
}

interface PaymentMethodStats {
  [key: string]: { count: number; amount: number }
}

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [accountTypeStats, setAccountTypeStats] = useState<AccountTypeStats>({})
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats>({})
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats>({})
  const [totalAmount, setTotalAmount] = useState(0)

  // 이번 달 기본값 설정
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchPurchases()
    }
  }, [startDate, endDate])

  const fetchPurchases = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/management-purchase?startDate=${startDate}&endDate=${endDate}`
      )
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const data = await response.json()
      setPurchases(data.data || [])
      setTotalAmount(data.summary?.totalAmount || 0)
      setAccountTypeStats(data.accountTypeStats || {})
      setDepartmentStats(data.departmentStats || {})
      setPaymentMethodStats(data.paymentMethodStats || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDate = (type: string) => {
    const now = new Date()
    let start: Date
    let end: Date

    switch (type) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31)
        break
      case 'last30':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        end = now
        break
      default:
        return
    }

    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">매입 조회</h1>
        <p className="text-muted-foreground mt-2">
          경영관리 매입(지출) 데이터를 조회하고 분석하세요
        </p>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleQuickDate('thisMonth')}>
                이번 달
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate('lastMonth')}>
                지난 달
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate('last30')}>
                최근 30일
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDate('thisYear')}>
                올해
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매입</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{purchases.length}건</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">계정과목 수</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(accountTypeStats).length}개
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">부서/담당자 수</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(departmentStats).length}개
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">결제방법 수</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Object.keys(paymentMethodStats).length}개
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 통계 카드들 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 계정과목별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">계정과목별 매입</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(accountTypeStats).length === 0 ? (
              <p className="text-muted-foreground text-sm">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(accountTypeStats)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([type, stats]) => (
                    <div key={type} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{type || '미분류'}</span>
                        <span className="text-muted-foreground text-sm ml-2">({stats.count}건)</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(stats.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 부서별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">부서/담당자별 매입</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(departmentStats).length === 0 ? (
              <p className="text-muted-foreground text-sm">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(departmentStats)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([dept, stats]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{dept}</span>
                        <span className="text-muted-foreground text-sm ml-2">({stats.count}건)</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(stats.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 결제방법별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">결제방법별 매입</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(paymentMethodStats).length === 0 ? (
              <p className="text-muted-foreground text-sm">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(paymentMethodStats)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, stats]) => (
                    <div key={method} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{method}</span>
                        <span className="text-muted-foreground text-sm ml-2">({stats.count}건)</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(stats.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 매입 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>매입 상세 목록</CardTitle>
          <CardDescription>
            선택한 기간의 매입(지출) 내역입니다. (최신순)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              선택한 기간에 매입 데이터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>계정과목</TableHead>
                    <TableHead>내역</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>결제방법</TableHead>
                    <TableHead>사용처/담당자</TableHead>
                    <TableHead>비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{formatDate(purchase.date)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {purchase.accountType}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{purchase.description}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(purchase.amount)}
                      </TableCell>
                      <TableCell>{purchase.paymentMethod}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          purchase.department === '내무부' ? 'bg-blue-100 text-blue-800' :
                          purchase.department === '기타' ? 'bg-gray-100 text-gray-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {purchase.department}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {purchase.note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
