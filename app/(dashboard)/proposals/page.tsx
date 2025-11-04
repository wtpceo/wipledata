'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Proposal {
  rowIndex: number
  timestamp: string
  requester: string
  department: string
  clientName: string
  contactName: string
  phone: string
  email: string
  industry: string
  proposalType: string
  adPlatform: string
  desiredProduct: string
  budgetRange: string
  contractPeriod: string
  adGoal: string
  desiredDate: string
  urgency: string
  notes: string
  attachments: string
  status: string
  assignedTo: string
  completedDate: string
  proposalLink: string
}

interface Stats {
  total: number
  requested: number
  reviewing: number
  inProgress: number
  completed: number
  onHold: number
}

export default function ProposalsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateData, setUpdateData] = useState({
    status: '',
    assignedTo: '',
    proposalLink: ''
  })

  useEffect(() => {
    fetchProposals()
  }, [filterStatus])

  const fetchProposals = async () => {
    try {
      setIsLoading(true)
      const url = filterStatus === 'all'
        ? '/api/proposals'
        : `/api/proposals?status=${filterStatus}`

      const response = await fetch(url)
      const data = await response.json()

      setProposals(data.proposals || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching proposals:', error)
      toast({
        title: '오류 발생',
        description: '제안서 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedProposal) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/proposals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowIndex: selectedProposal.rowIndex,
          status: updateData.status || selectedProposal.status,
          assignedTo: updateData.assignedTo || selectedProposal.assignedTo,
          proposalLink: updateData.proposalLink || selectedProposal.proposalLink,
          completedDate: updateData.status === '완료' ? new Date().toISOString().split('T')[0] : selectedProposal.completedDate
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update proposal')
      }

      toast({
        title: '업데이트 완료',
        description: '제안서 상태가 업데이트되었습니다.',
      })

      setIsDialogOpen(false)
      setSelectedProposal(null)
      setUpdateData({ status: '', assignedTo: '', proposalLink: '' })
      fetchProposals()
    } catch (error) {
      console.error('Error updating proposal:', error)
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '상태 업데이트에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const openUpdateDialog = (proposal: Proposal) => {
    setSelectedProposal(proposal)
    setUpdateData({
      status: proposal.status,
      assignedTo: proposal.assignedTo,
      proposalLink: proposal.proposalLink
    })
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      '요청됨': { variant: 'outline', icon: AlertCircle, label: '요청됨' },
      '검토중': { variant: 'secondary', icon: Clock, label: '검토중' },
      '작성중': { variant: 'default', icon: FileText, label: '작성중' },
      '완료': { variant: 'default', icon: CheckCircle, label: '완료' },
      '보류': { variant: 'destructive', icon: XCircle, label: '보류' }
    }

    const config = variants[status] || variants['요청됨']
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      '긴급': 'destructive',
      '보통': 'secondary',
      '여유': 'default'
    }

    return (
      <Badge variant={variants[urgency] || 'secondary'}>
        {urgency}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      return format(date, 'yyyy-MM-dd HH:mm', { locale: ko })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">제안서 관리</h1>
          <p className="text-muted-foreground mt-2">
            제안서 요청을 확인하고 관리하세요
          </p>
        </div>
        <Button onClick={() => router.push('/proposal-request')}>
          <Plus className="mr-2 h-4 w-4" />
          새 제안서 요청
        </Button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">요청됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requested}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">검토중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reviewing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">작성중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">보류</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onHold}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[200px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="요청됨">요청됨</SelectItem>
                  <SelectItem value="검토중">검토중</SelectItem>
                  <SelectItem value="작성중">작성중</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                  <SelectItem value="보류">보류</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제안서 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>제안서 요청 목록</CardTitle>
          <CardDescription>총 {proposals.length}건</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              제안서 요청이 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <Card key={proposal.rowIndex} className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => openUpdateDialog(proposal)}>
                  <CardContent className="pt-6">
                    <div className="grid gap-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{proposal.clientName}</h3>
                            {getStatusBadge(proposal.status)}
                            {getUrgencyBadge(proposal.urgency)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {proposal.contactName} | {proposal.email}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground text-right">
                          <div>{formatDate(proposal.timestamp)}</div>
                          <div className="mt-1">요청자: {proposal.requester}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">업종:</span>
                          <span className="ml-2 font-medium">{proposal.industry || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">제안 유형:</span>
                          <span className="ml-2 font-medium">{proposal.proposalType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">예산:</span>
                          <span className="ml-2 font-medium">{proposal.budgetRange || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">희망일:</span>
                          <span className="ml-2 font-medium">{proposal.desiredDate || '-'}</span>
                        </div>
                      </div>

                      {proposal.adPlatform && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">광고 매체:</span>
                          <span className="ml-2">{proposal.adPlatform}</span>
                        </div>
                      )}

                      {proposal.assignedTo && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">배정 담당자:</span>
                          <span className="ml-2 font-medium">{proposal.assignedTo}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상태 업데이트 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>제안서 관리</DialogTitle>
            <DialogDescription>
              제안서 상태를 업데이트하고 담당자를 배정하세요
            </DialogDescription>
          </DialogHeader>
          {selectedProposal && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>광고주명</Label>
                  <p className="font-medium mt-1">{selectedProposal.clientName}</p>
                </div>
                <div>
                  <Label>담당자</Label>
                  <p className="font-medium mt-1">{selectedProposal.contactName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>이메일</Label>
                  <p className="text-sm mt-1">{selectedProposal.email}</p>
                </div>
                <div>
                  <Label>연락처</Label>
                  <p className="text-sm mt-1">{selectedProposal.phone || '-'}</p>
                </div>
              </div>

              {selectedProposal.adGoal && (
                <div>
                  <Label>광고 목표</Label>
                  <p className="text-sm mt-1">{selectedProposal.adGoal}</p>
                </div>
              )}

              {selectedProposal.notes && (
                <div>
                  <Label>특이사항</Label>
                  <p className="text-sm mt-1">{selectedProposal.notes}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select value={updateData.status} onValueChange={(value) => setUpdateData({...updateData, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="요청됨">요청됨</SelectItem>
                      <SelectItem value="검토중">검토중</SelectItem>
                      <SelectItem value="작성중">작성중</SelectItem>
                      <SelectItem value="완료">완료</SelectItem>
                      <SelectItem value="보류">보류</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo">배정 담당자</Label>
                  <Input
                    id="assignedTo"
                    value={updateData.assignedTo}
                    onChange={(e) => setUpdateData({...updateData, assignedTo: e.target.value})}
                    placeholder="담당자 이름"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposalLink">제안서 링크</Label>
                  <Input
                    id="proposalLink"
                    value={updateData.proposalLink}
                    onChange={(e) => setUpdateData({...updateData, proposalLink: e.target.value})}
                    placeholder="구글 드라이브 링크 등"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>
              취소
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  업데이트 중...
                </>
              ) : (
                '업데이트'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
