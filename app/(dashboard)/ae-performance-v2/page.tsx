"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Users, TrendingUp, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ExpiringClient {
  rowIndex: number
  clientName: string
  amount: number
  endDate: string
  aeName: string
  isDuplicate: boolean
  duplicateWith: string[]
  status: 'pending' | 'renewed' | 'failed'
  renewalMonths: number
  renewalAmount: number
  failureReason: string
}

interface AEStat {
  aeName: string
  totalClients: number
  expiringClients: number
  renewedClients: number
  failedClients: number
  pendingClients: number
  totalRenewalAmount: number
  renewalRate: number
}

interface Summary {
  totalExpiringClients: number
  uniqueClients: number
  totalAEs: number
  targetMonth: string
}

export default function AEPerformanceV2Page() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7))
  const [expiringClients, setExpiringClients] = useState<ExpiringClient[]>([])
  const [aeStats, setAeStats] = useState<AEStat[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  // 아코디언 상태 (AE별 펼침/접힘)
  const [expandedAEs, setExpandedAEs] = useState<string[]>([])

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<'renewed' | 'failed'>('renewed')
  const [selectedClient, setSelectedClient] = useState<ExpiringClient | null>(null)
  const [renewalMonths, setRenewalMonths] = useState(0)
  const [renewalAmount, setRenewalAmount] = useState(0)
  const [failureReason, setFailureReason] = useState('')

  // 연장 성공 시 추가 정보
  const [productName, setProductName] = useState('상품을 선택하세요')
  const [productOther, setProductOther] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('결제 방식을 선택하세요')
  const [paymentMethodOther, setPaymentMethodOther] = useState('')
  const [approvalNumber, setApprovalNumber] = useState('')
  const [outsourcingCost, setOutsourcingCost] = useState(0)

  // AE 아코디언 토글
  const toggleAE = (aeName: string) => {
    setExpandedAEs(prev =>
      prev.includes(aeName)
        ? prev.filter(name => name !== aeName)
        : [...prev, aeName]
    )
  }

  // 데이터 가져오기
  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ae-performance-v2/expiring-clients?month=${month}`)
      const data = await response.json()

      if (response.ok) {
        setExpiringClients(data.expiringClients || [])
        setAeStats(data.aeStats || [])
        setSummary(data.summary || null)
      } else {
        alert('데이터를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [month])

  // 연장 성공/실패 다이얼로그 열기
  const openDialog = (client: ExpiringClient, action: 'renewed' | 'failed') => {
    setSelectedClient(client)
    setDialogAction(action)
    setRenewalMonths(0)
    setRenewalAmount(0)
    setFailureReason('')
    // 연장 성공 시 추가 필드 초기화
    setProductName('상품을 선택하세요')
    setProductOther('')
    setPaymentMethod('결제 방식을 선택하세요')
    setPaymentMethodOther('')
    setApprovalNumber('')
    setOutsourcingCost(0)
    setDialogOpen(true)
  }

  // 연장 처리
  const handleUpdate = async () => {
    if (!selectedClient) return

    try {
      const response = await fetch('/api/ae-performance-v2/update-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex: selectedClient.rowIndex,
          action: dialogAction,
          renewalMonths: dialogAction === 'renewed' ? renewalMonths : undefined,
          renewalAmount: dialogAction === 'renewed' ? renewalAmount : undefined,
          failureReason: dialogAction === 'failed' ? failureReason : undefined,
          currentEndDate: selectedClient.endDate,
          clientName: selectedClient.clientName,
          aeString: selectedClient.aeName, // 담당자 이름 (이미 파싱된 형태)
          // 연장 성공 시 추가 정보
          productName: dialogAction === 'renewed' ? productName : undefined,
          productOther: dialogAction === 'renewed' ? productOther : undefined,
          paymentMethod: dialogAction === 'renewed' ? paymentMethod : undefined,
          paymentMethodOther: dialogAction === 'renewed' ? paymentMethodOther : undefined,
          approvalNumber: dialogAction === 'renewed' ? approvalNumber : undefined,
          outsourcingCost: dialogAction === 'renewed' ? outsourcingCost : undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)

        // 클라이언트 상태 업데이트
        setExpiringClients(prev =>
          prev.map(client =>
            client.rowIndex === selectedClient.rowIndex
              ? {
                  ...client,
                  status: dialogAction,
                  renewalMonths: dialogAction === 'renewed' ? renewalMonths : 0,
                  renewalAmount: dialogAction === 'renewed' ? renewalAmount : 0,
                  failureReason: dialogAction === 'failed' ? failureReason : '',
                  endDate: dialogAction === 'renewed' && data.newEndDate ? data.newEndDate : client.endDate
                }
              : client
          )
        )

        // 통계 재계산
        fetchData()

        setDialogOpen(false)
      } else {
        throw new Error(data.error || '처리 실패')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.'
      alert(errorMessage)
      console.error('Update Error:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // AE별로 그룹화
  const groupedByAE = expiringClients.reduce((acc, client) => {
    if (!acc[client.aeName]) {
      acc[client.aeName] = []
    }
    acc[client.aeName].push(client)
    return acc
  }, {} as { [key: string]: ExpiringClient[] })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AE 실적 관리 (V2)</h2>
          <p className="text-muted-foreground">
            이번 달 종료 예정 광고주 관리 및 연장 현황 추적
          </p>
        </div>
      </div>

      {/* 월 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>대상 월 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-64">
            <Label>대상 월</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 전체 요약 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 종료 예정</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalExpiringClients}건</div>
              <p className="text-xs text-muted-foreground">
                (고유 광고주: {summary.uniqueClients}개)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">담당 AE</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAEs}명</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연장 성공</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {expiringClients.filter(c => c.status === 'renewed').length}건
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연장 실패</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {expiringClients.filter(c => c.status === 'failed').length}건
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AE별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>AE별 통계</CardTitle>
          <CardDescription>담당자별 연장 현황 및 실적</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aeStats.map((stat) => (
              <div key={stat.aeName} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg">{stat.aeName}</h3>
                  <div className="text-sm text-muted-foreground">
                    연장률: <span className={`font-bold ${
                      stat.renewalRate >= 80 ? 'text-green-600' :
                      stat.renewalRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>{stat.renewalRate}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">총 광고주</p>
                    <p className="text-xl font-bold">{stat.totalClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">종료 예정</p>
                    <p className="text-xl font-bold text-orange-600">{stat.expiringClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">대기 중</p>
                    <p className="text-xl font-bold">{stat.pendingClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">연장 성공</p>
                    <p className="text-xl font-bold text-green-600">{stat.renewedClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">연장 실패</p>
                    <p className="text-xl font-bold text-red-600">{stat.failedClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">연장 매출</p>
                    <p className="text-lg font-bold">{formatCurrency(stat.totalRenewalAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AE별 광고주 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>AE별 종료 예정 광고주 상세</CardTitle>
          <CardDescription>광고주별 연장 관리 (클릭하여 펼치기/접기)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(groupedByAE).sort(([a], [b]) => a.localeCompare(b)).map(([aeName, clients]) => {
              const isExpanded = expandedAEs.includes(aeName)
              const pendingCount = clients.filter(c => c.status === 'pending').length
              const renewedCount = clients.filter(c => c.status === 'renewed').length
              const failedCount = clients.filter(c => c.status === 'failed').length

              return (
                <div key={aeName} className="border rounded-lg">
                  {/* 헤더 - 클릭하여 펼치기/접기 */}
                  <button
                    onClick={() => toggleAE(aeName)}
                    className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Users className="h-5 w-5" />
                      <span className="font-bold text-lg">{aeName}</span>
                      <span className="text-sm text-muted-foreground">
                        ({clients.length}개)
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {pendingCount > 0 && (
                        <span className="text-blue-600">대기 {pendingCount}</span>
                      )}
                      {renewedCount > 0 && (
                        <span className="text-green-600">성공 {renewedCount}</span>
                      )}
                      {failedCount > 0 && (
                        <span className="text-red-600">실패 {failedCount}</span>
                      )}
                    </div>
                  </button>

                  {/* 광고주 목록 - 펼쳤을 때만 표시 */}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-3">
                  {clients.map((client) => (
                    <div
                      key={`${client.rowIndex}-${client.aeName}`}
                      className={`border rounded-lg p-4 ${
                        client.status === 'renewed' ? 'bg-green-50 border-green-200' :
                        client.status === 'failed' ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold">{client.clientName}</h4>
                            {client.isDuplicate && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                중복 (공동담당: {client.duplicateWith.join(', ')})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>계약금액: {formatCurrency(client.amount)}</p>
                            <p>종료일: {client.endDate}</p>
                            {client.status === 'renewed' && (
                              <>
                                <p className="text-green-600 font-medium">
                                  ✓ 연장 성공 ({client.renewalMonths}개월, {formatCurrency(client.renewalAmount)})
                                </p>
                              </>
                            )}
                            {client.status === 'failed' && (
                              <p className="text-red-600 font-medium">
                                ✗ 연장 실패
                                {client.failureReason && `: ${client.failureReason}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {client.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openDialog(client, 'renewed')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              연장 성공
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDialog(client, 'failed')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              연장 실패
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 연장 처리 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'renewed' ? '연장 성공 처리' : '연장 실패 처리'}
            </DialogTitle>
            <DialogDescription>
              {selectedClient?.clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {dialogAction === 'renewed' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>연장 개월 수 *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={renewalMonths || ''}
                      onChange={(e) => setRenewalMonths(parseInt(e.target.value) || 0)}
                      placeholder="개월"
                    />
                  </div>
                  <div>
                    <Label>총 계약금액 *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={renewalAmount || ''}
                      onChange={(e) => setRenewalAmount(parseInt(e.target.value) || 0)}
                      placeholder="원"
                    />
                  </div>
                </div>

                <div>
                  <Label>마케팅 매체 상품명 *</Label>
                  <Select value={productName} onValueChange={setProductName}>
                    <SelectTrigger>
                      <SelectValue placeholder="상품을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="배달앱 관리">배달앱 관리</SelectItem>
                      <SelectItem value="토탈 관리">토탈 관리</SelectItem>
                      <SelectItem value="퍼포먼스 마케팅">퍼포먼스 마케팅</SelectItem>
                      <SelectItem value="유튜브 마케팅">유튜브 마케팅</SelectItem>
                      <SelectItem value="브랜드 블로그 마케팅">브랜드 블로그 마케팅</SelectItem>
                      <SelectItem value="댓글만">댓글만</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  {productName === '기타' && (
                    <Input
                      className="mt-2"
                      value={productOther}
                      onChange={(e) => setProductOther(e.target.value)}
                      placeholder="직접 입력"
                    />
                  )}
                </div>

                <div>
                  <Label>결제 방식 *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="결제 방식을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="카드 결제">카드 결제</SelectItem>
                      <SelectItem value="계좌 이체">계좌 이체</SelectItem>
                      <SelectItem value="현금 수령">현금 수령</SelectItem>
                      <SelectItem value="미결제">미결제</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMethod === '기타' && (
                    <Input
                      className="mt-2"
                      value={paymentMethodOther}
                      onChange={(e) => setPaymentMethodOther(e.target.value)}
                      placeholder="직접 입력"
                    />
                  )}
                </div>

                <div>
                  <Label>결제 승인 번호</Label>
                  <Input
                    value={approvalNumber}
                    onChange={(e) => setApprovalNumber(e.target.value)}
                    placeholder="승인번호 (선택사항)"
                  />
                </div>

                <div>
                  <Label>확정 외주비</Label>
                  <Input
                    type="number"
                    min="0"
                    value={outsourcingCost || ''}
                    onChange={(e) => setOutsourcingCost(parseInt(e.target.value) || 0)}
                    placeholder="원 (선택사항)"
                  />
                </div>

                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
                  <p>• 종료일이 자동으로 {renewalMonths}개월 연장됩니다.</p>
                  <p>• 현재 종료일: {selectedClient?.endDate}</p>
                  <p>• 원본데이터에 새로운 매출 데이터가 추가됩니다.</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>연장 실패 사유</Label>
                  <Textarea
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="실패 사유를 입력하세요 (선택사항)"
                    rows={3}
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-red-50 p-3 rounded">
                  <p>• 광고주 상태가 "종료"로 변경됩니다.</p>
                  <p>• 전체 카운트에서 제외됩니다.</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                dialogAction === 'renewed' && (
                  renewalMonths < 1 ||
                  renewalAmount < 1 ||
                  productName === '상품을 선택하세요' ||
                  (productName === '기타' && !productOther) ||
                  paymentMethod === '결제 방식을 선택하세요' ||
                  (paymentMethod === '기타' && !paymentMethodOther)
                )
              }
              className={dialogAction === 'renewed' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {dialogAction === 'renewed' ? '연장 성공 처리' : '연장 실패 처리'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
