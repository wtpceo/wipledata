"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Phone, Calendar, Building2, Tv, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

interface OnlineCheckData {
  id: string
  contractDate: string
  clientName: string
  productName: string
  contractPeriod: string
  totalAmount: number
  inputPerson: string
  onlineCheckDateTime: string
  checkStatus: 'pending' | 'completed' | 'cancelled'
}

export default function OnlineCheckPage() {
  const [data, setData] = useState<OnlineCheckData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date')

  useEffect(() => {
    fetchOnlineCheckData()
  }, [])

  const fetchOnlineCheckData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/online-check')
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching online check data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCheckStatus = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      const response = await fetch('/api/online-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (response.ok) {
        fetchOnlineCheckData()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // 필터링 및 정렬
  const filteredData = data
    .filter(item => statusFilter === 'all' || item.checkStatus === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime()
      }
      if (sortBy === 'amount') {
        return b.totalAmount - a.totalAmount
      }
      return a.clientName.localeCompare(b.clientName)
    })

  // 통계
  const stats = {
    total: data.length,
    pending: data.filter(d => d.checkStatus === 'pending').length,
    completed: data.filter(d => d.checkStatus === 'completed').length,
    totalAmount: data.reduce((sum, d) => sum + d.totalAmount, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">점검 완료</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">취소</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800">점검 예정</Badge>
    }
  }

  const getMediaIcon = (productName: string) => {
    if (productName.includes('포커스미디어')) {
      return <Tv className="h-4 w-4 text-purple-500" />
    }
    if (productName.includes('타운보드')) {
      return <Building2 className="h-4 w-4 text-blue-500" />
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">온라인 점검 현황</h2>
        <p className="text-muted-foreground">
          옥외매체(포커스미디어/타운보드) 광고주 중 온라인 점검을 희망하는 업체 목록입니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 건수</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검 예정</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검 완료</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 계약금액</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">예산 규모 파악용</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 새로고침 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>점검 대상 목록</CardTitle>
              <CardDescription>
                예산이 큰 광고주를 우선적으로 연락하세요
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">점검 예정</SelectItem>
                  <SelectItem value="completed">점검 완료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">계약일순</SelectItem>
                  <SelectItem value="amount">금액순</SelectItem>
                  <SelectItem value="name">업체명순</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchOnlineCheckData}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              온라인 점검 희망 업체가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계약일</TableHead>
                  <TableHead>광고주</TableHead>
                  <TableHead>매체</TableHead>
                  <TableHead>계약기간</TableHead>
                  <TableHead className="text-right">계약금액</TableHead>
                  <TableHead>점검 희망일시</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.contractDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getMediaIcon(item.productName)}
                        <span className="text-sm">{item.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.contractPeriod}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {item.onlineCheckDateTime}
                      </div>
                    </TableCell>
                    <TableCell>{item.inputPerson}</TableCell>
                    <TableCell>{getStatusBadge(item.checkStatus)}</TableCell>
                    <TableCell>
                      {item.checkStatus === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => updateCheckStatus(item.id, 'completed')}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            완료
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-gray-500"
                            onClick={() => updateCheckStatus(item.id, 'cancelled')}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">전화 우선순위 가이드</h4>
              <p className="text-sm text-blue-700 mt-1">
                계약금액이 높은 광고주를 우선적으로 연락하시면 효율적입니다.
                점검 완료 후 반드시 상태를 업데이트해주세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
