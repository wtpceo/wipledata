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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Phone,
  Calendar,
  Building2,
  Tv,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  MessageSquare,
  Edit3,
  ExternalLink,
  AlertCircle
} from 'lucide-react'

interface OnlineCheckData {
  id: string
  rowNumber: number
  contractDate: string
  clientName: string
  productName: string
  contractPeriod: string
  totalAmount: number
  inputPerson: string
  onlineCheckDateTime: string
  checkStatus: 'pending' | 'completed' | 'cancelled' | 'in_progress'
  clientAddress: string
  clientContact: string
  processMemo: string
  marketingManager: string
}

export default function OnlineCheckPage() {
  const [data, setData] = useState<OnlineCheckData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date')

  // 관리 다이얼로그 상태
  const [selectedItem, setSelectedItem] = useState<OnlineCheckData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editMemo, setEditMemo] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

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

  const openManageDialog = (item: OnlineCheckData) => {
    setSelectedItem(item)
    setEditStatus(item.checkStatus)
    setEditMemo(item.processMemo || '')
    setIsDialogOpen(true)
  }

  const saveChanges = async () => {
    if (!selectedItem) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/online-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedItem.id,
          status: editStatus,
          memo: editMemo
        })
      })

      if (response.ok) {
        setIsDialogOpen(false)
        fetchOnlineCheckData()
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const quickStatusUpdate = async (id: string, status: string) => {
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
      if (sortBy === 'checkDate') {
        return new Date(b.onlineCheckDateTime).getTime() - new Date(a.onlineCheckDateTime).getTime()
      }
      return a.clientName.localeCompare(b.clientName)
    })

  // 통계
  const stats = {
    total: data.length,
    pending: data.filter(d => d.checkStatus === 'pending').length,
    inProgress: data.filter(d => d.checkStatus === 'in_progress').length,
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
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">진행 중</Badge>
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

  // 전화번호 포맷팅 및 링크
  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
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
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">진행 중</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}건</div>
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
                행을 클릭하면 상세 관리 화면이 열립니다
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
                  <SelectItem value="in_progress">진행 중</SelectItem>
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
                  <SelectItem value="checkDate">점검일순</SelectItem>
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
                  <TableHead>광고주</TableHead>
                  <TableHead>매체</TableHead>
                  <TableHead>점검 희망일시</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead className="text-right">계약금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead>액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openManageDialog(item)}
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.clientName}</span>
                        <p className="text-xs text-muted-foreground">{item.contractDate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getMediaIcon(item.productName)}
                        <span className="text-sm">{item.productName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {item.onlineCheckDateTime || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.clientContact ? (
                        <a
                          href={`tel:${item.clientContact.replace(/[^0-9]/g, '')}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3 w-3" />
                          {formatPhone(item.clientContact)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalAmount)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {getStatusBadge(item.checkStatus)}
                    </TableCell>
                    <TableCell>
                      {item.processMemo ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[150px]">
                          <MessageSquare className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{item.processMemo}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={() => openManageDialog(item)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          관리
                        </Button>
                        {item.checkStatus === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-600 hover:text-green-700"
                            onClick={() => quickStatusUpdate(item.id, 'completed')}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
              <h4 className="font-medium text-blue-900">점검 관리 가이드</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• 행을 클릭하면 상세 관리 화면이 열립니다</li>
                <li>• 연락처를 클릭하면 바로 전화 연결이 가능합니다</li>
                <li>• 메모에 통화 내용, 일정 조율 사항 등을 기록하세요</li>
                <li>• 상태를 "진행 중"으로 변경하면 연락 시도 중임을 표시합니다</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상세 관리 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getMediaIcon(selectedItem.productName)}
              {selectedItem?.clientName}
            </DialogTitle>
            <DialogDescription>
              점검 상태 및 처리 현황을 관리합니다
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">매체</p>
                  <p className="font-medium">{selectedItem.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">계약금액</p>
                  <p className="font-medium">{formatCurrency(selectedItem.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">계약기간</p>
                  <p className="font-medium">{selectedItem.contractPeriod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">점검 희망일시</p>
                  <p className="font-medium">{selectedItem.onlineCheckDateTime || '-'}</p>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-2">
                <Label>연락처 정보</Label>
                <div className="p-4 border rounded-lg space-y-2">
                  {selectedItem.clientContact ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{formatPhone(selectedItem.clientContact)}</span>
                      </div>
                      <a
                        href={`tel:${selectedItem.clientContact.replace(/[^0-9]/g, '')}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        전화 걸기
                      </a>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">등록된 연락처가 없습니다</p>
                  )}

                  {selectedItem.clientAddress && (
                    <div className="flex items-start gap-2 pt-2 border-t">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-sm">{selectedItem.clientAddress}</span>
                        <a
                          href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedItem.clientAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          지도
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 상태 변경 */}
              <div className="space-y-2">
                <Label htmlFor="status">점검 상태</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-blue-500" />
                        점검 예정
                      </div>
                    </SelectItem>
                    <SelectItem value="in_progress">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        진행 중
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        점검 완료
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-gray-500" />
                        취소
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 처리 메모 */}
              <div className="space-y-2">
                <Label htmlFor="memo">처리 현황 메모</Label>
                <Textarea
                  id="memo"
                  placeholder="통화 내용, 일정 조율 사항, 특이사항 등을 기록하세요..."
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  예: 12/15 오후 2시 점검 예정, 담당자 홍길동, 010-1234-5678
                </p>
              </div>

              {/* 담당자 정보 */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                입력자: {selectedItem.inputPerson} | 마케팅 담당: {selectedItem.marketingManager || '-'}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={saveChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
