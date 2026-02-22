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
import { Users, TrendingUp, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, LabelList } from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ExpiringClient {
  rowIndex: number
  clientName: string
  amount: number
  endDate: string
  aeName: string
  isDuplicate: boolean
  duplicateWith: string[]
  status: 'pending' | 'renewed' | 'failed' | 'waiting'
  renewalMonths: number
  renewalAmount: number
  failureReason: string
  daysOverdue?: number
}

interface RenewedClientDetail {
  clientName: string
  salesType: string
  totalAmount: number
  renewalMonths: number
  productName: string
  contractDate: string
  contractEndDate: string
  inputDate?: string
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
  renewedClientsDetails?: RenewedClientDetail[]
}

interface Summary {
  totalExpiringClients: number
  uniqueClients: number
  totalAEs: number
  targetMonth: string
}

const formatDateOnly = (dateStr: string) => {
  if (!dateStr) return '';
  // "YYYY. MM. DD." 형태이거나 "YYYY-MM-DD" 등에서 날짜만 추출
  const match = dateStr.match(/(\d{4})[./-]\s?(\d{1,2})[./-]\s?(\d{1,2})/);
  if (match) {
    return `${match[1]}년 ${match[2]}월 ${match[3]}일`;
  }
  return dateStr.split(' ')[0]; // fallback
}

export default function AEPerformanceV2Page() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7))
  const [expiringClients, setExpiringClients] = useState<ExpiringClient[]>([])
  const [aeStats, setAeStats] = useState<AEStat[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [yearlyTrend, setYearlyTrend] = useState<any[]>([])
  const [yearlyAeList, setYearlyAeList] = useState<string[]>([])

  // 미처리 연장 건
  const [allPendingClients, setAllPendingClients] = useState<ExpiringClient[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [showPending, setShowPending] = useState(false)

  // 대기 상태 추적 (rowIndex를 key로 사용)
  const [waitingClients, setWaitingClients] = useState<Set<number>>(new Set())

  // 아코디언 상태 (AE별 펼침/접힘)
  const [expandedAEs, setExpandedAEs] = useState<string[]>([])
  const [expandedPendingAEs, setExpandedPendingAEs] = useState<string[]>([])

  // 매출 상세 다이얼로그 상태
  const [aeDetailsDialogOpen, setAeDetailsDialogOpen] = useState(false)
  const [selectedAeStats, setSelectedAeStats] = useState<AEStat | null>(null)

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<'renewed' | 'failed' | 'pending'>('renewed')
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

  const togglePendingAE = (aeName: string) => {
    setExpandedPendingAEs(prev =>
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

      const yearlyResponse = await fetch('/api/ae-performance-v2/yearly-trend')
      const yearlyData = await yearlyResponse.json()
      if (yearlyResponse.ok) {
        setYearlyTrend(yearlyData.yearlyTrend || [])
        setYearlyAeList(yearlyData.aeList || [])
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

  // 미처리 연장 건 가져오기
  const fetchAllPending = async () => {
    try {
      setPendingLoading(true)
      const response = await fetch('/api/ae-performance-v2/all-pending')
      const data = await response.json()

      if (response.ok) {
        setAllPendingClients(data.pendingClients || [])
        setShowPending(true)
      } else {
        alert('미처리 연장 건을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error fetching all pending:', error)
      alert('미처리 연장 건을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setPendingLoading(false)
    }
  }

  // 연장 성공/실패/대기 다이얼로그 열기
  const openDialog = async (client: ExpiringClient, action: 'renewed' | 'failed' | 'pending') => {
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

    // 대기 처리인 경우 API 호출하여 Google Sheets 업데이트
    if (action === 'pending') {
      try {
        const response = await fetch('/api/ae-performance-v2/update-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndex: client.rowIndex,
            action: 'pending'
          })
        })

        if (response.ok) {
          setWaitingClients(prev => new Set([...prev, client.rowIndex]))
          alert(`${client.clientName}을(를) 대기 상태로 설정했습니다.\n다음 달에도 미처리 건으로 표시됩니다.`)

          fetchData()
          if (showPending) {
            fetchAllPending()
          }
        } else {
          alert('대기 상태 설정에 실패했습니다.')
        }
      } catch (error) {
        console.error('Error setting pending status:', error)
        alert('대기 상태 설정 중 오류가 발생했습니다.')
      }
      return
    }

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

        // 연장 실패 시 목록에서 제거, 그 외에는 상태 업데이트
        if (dialogAction === 'failed') {
          setExpiringClients(prev =>
            prev.filter(client => client.rowIndex !== selectedClient.rowIndex)
          )
        } else {
          setExpiringClients(prev =>
            prev.map(client =>
              client.rowIndex === selectedClient.rowIndex
                ? {
                  ...client,
                  status: dialogAction,
                  renewalMonths: dialogAction === 'renewed' ? renewalMonths : 0,
                  renewalAmount: dialogAction === 'renewed' ? renewalAmount : 0,
                  failureReason: '',
                  endDate: dialogAction === 'renewed' && data.newEndDate ? data.newEndDate : client.endDate
                }
                : client
            )
          )
        }

        // 통계 재계산
        fetchData()

        // 두 목록 간의 동기화를 위해 미처리 연장 건 창이 켜져있다면 다시 불러오기
        if (showPending) {
          fetchAllPending()
        }

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

  const aeColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#eab308',
    '#14b8a6', '#f97316', '#d946ef', '#0ea5e9'
  ]

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

      {/* 연간 매출 트렌드 그래프 */}
      {yearlyTrend && yearlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2026년 월별 내무부 실적 현황</CardTitle>
            <CardDescription>
              AE별 월 매출 추이 (현재 월 강조)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={yearlyTrend}
                margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) => new Intl.NumberFormat('ko-KR').format(v)}
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const entry = yearlyTrend.find(d => d.label === label)
                    const total = entry?.total ?? 0
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md text-sm min-w-[180px]">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.map((p: any) => {
                          const pct = total > 0 ? Math.round((p.value / total) * 100) : 0
                          if (p.value === 0) return null
                          return (
                            <div key={p.dataKey} className="flex justify-between gap-4">
                              <span style={{ color: p.fill }}>{p.name}</span>
                              <span className="font-medium">
                                {formatCurrency(p.value)}
                                <span className="text-muted-foreground ml-1">({pct}%)</span>
                              </span>
                            </div>
                          )
                        })}
                        <div className="flex justify-between gap-4 border-t mt-1 pt-1 font-semibold">
                          <span>합계</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Legend content={({ payload }) => (
                  <div className="flex justify-center gap-6 text-sm mb-4 mt-2 flex-wrap">
                    {yearlyAeList.map((aeName, index) => (
                      <div key={`item-${index}`} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: aeColors[index % aeColors.length] }} />
                        <span style={{ color: aeColors[index % aeColors.length], fontWeight: 'bold' }}>{aeName}</span>
                      </div>
                    ))}
                  </div>
                )} />
                {yearlyAeList.map((aeName, index) => {
                  const isLast = index === yearlyAeList.length - 1
                  return (
                    <Bar key={aeName} dataKey={aeName} name={aeName} stackId="a" radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={40}>
                      {yearlyTrend.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={aeColors[index % aeColors.length]}
                        />
                      ))}
                      {isLast && (
                        <LabelList
                          dataKey={aeName}
                          content={(props: any) => {
                            const { x, y, width, index: dIndex } = props
                            const entry = yearlyTrend[dIndex]
                            if (entry?.isCurrent) {
                              return (
                                <g>
                                  <text
                                    x={x + width / 2} y={y - 12}
                                    fill="#22c55e" textAnchor="middle" dominantBaseline="middle"
                                    fontSize={24}
                                  >
                                    &#x25BC;
                                  </text>
                                </g>
                              )
                            }
                            return null
                          }}
                        />
                      )}
                    </Bar>
                  )
                })}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 담당자별 월별 매출 및 연장율 */}
      {yearlyAeList.length > 0 && yearlyTrend.length > 0 && (() => {
        const tableData = yearlyAeList.map(aeName => {
          const monthlySales = yearlyTrend.map(monthData => monthData[aeName] || 0)
          const totalSales = monthlySales.reduce((sum, val) => sum + val, 0)
          const stat = aeStats.find(s => s.aeName === aeName)
          const renewalRate = stat ? stat.renewalRate : 0
          return { aeName, monthlySales, totalSales, renewalRate }
        }).sort((a, b) => b.totalSales - a.totalSales)

        return (
          <Card>
            <CardHeader>
              <CardTitle>담당자별 연간 매출 및 연장율 현황</CardTitle>
              <CardDescription>2026년 1월 ~ 12월 기준 누적 매출액순 정렬</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">담당자</TableHead>
                    {yearlyTrend.map((m) => (
                      <TableHead key={m.month} className="text-right whitespace-nowrap">
                        {m.label.replace('🔽 ', '')}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold whitespace-nowrap">총 매출</TableHead>
                    <TableHead className="text-right whitespace-nowrap">연장율(당월)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.aeName}>
                      <TableCell className="font-medium whitespace-nowrap">{row.aeName}</TableCell>
                      {row.monthlySales.map((sales, idx) => (
                        <TableCell key={idx} className="text-right whitespace-nowrap">
                          {sales > 0 ? formatCurrency(sales) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold whitespace-nowrap text-blue-600">
                        {formatCurrency(row.totalSales)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {row.renewalRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })()}

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

      {/* 미처리 연장 건 섹션 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-orange-900">누적 미처리 연장 건</CardTitle>
              <CardDescription className="text-orange-700">
                종료일이 지났지만 아직 연장 처리되지 않은 모든 광고주
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (showPending) {
                  setShowPending(false)
                } else {
                  fetchAllPending()
                }
              }}
              disabled={pendingLoading}
              className="border-orange-300 hover:bg-orange-100"
            >
              {pendingLoading ? '로딩 중...' : showPending ? '숨기기' : '미처리 건 조회'}
            </Button>
          </div>
        </CardHeader>
        {showPending && (
          <CardContent>
            {allPendingClients.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">미처리 연장 건이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  allPendingClients.reduce((acc, client) => {
                    if (!acc[client.aeName]) acc[client.aeName] = []
                    acc[client.aeName].push(client)
                    return acc
                  }, {} as { [key: string]: ExpiringClient[] })
                ).sort(([a], [b]) => a.localeCompare(b)).map(([aeName, clients]) => {
                  const isExpanded = expandedPendingAEs.includes(aeName)
                  return (
                    <div key={aeName} className="border border-orange-300 rounded-lg bg-white">
                      <button
                        onClick={() => togglePendingAE(aeName)}
                        className="w-full p-4 flex items-center justify-between hover:bg-orange-50 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-orange-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-orange-600" />
                          )}
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <span className="font-bold text-lg">{aeName}</span>
                          <span className="text-sm text-orange-700">
                            ({clients.length}개 미처리)
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-orange-200 p-4 space-y-3">
                          {clients.map((client) => (
                            <div
                              key={`pending-${client.rowIndex}-${client.aeName}`}
                              className="border border-orange-200 rounded-lg p-4 bg-white"
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
                                    <p className="text-orange-600 font-medium">
                                      ⚠️ {client.daysOverdue}일 경과
                                    </p>
                                  </div>
                                </div>
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
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
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
                    연장률: <span className={`font-bold ${stat.renewalRate >= 80 ? 'text-green-600' :
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
                    <p className="text-muted-foreground">계약 건수</p>
                    <p className="text-xl font-bold text-green-600">{stat.renewedClients}개</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">연장 실패</p>
                    <p className="text-xl font-bold text-red-600">{stat.failedClients}개</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">총 매출</p>
                      <button
                        onClick={() => {
                          setSelectedAeStats(stat)
                          setAeDetailsDialogOpen(true)
                        }}
                        className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors border border-blue-200"
                        title="연장 및 소개 업체 목록 보기"
                      >
                        상세보기
                      </button>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(stat.totalRenewalAmount)}
                    </p>
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
                      {clients.map((client) => {
                        const isWaiting = client.status === 'waiting' || waitingClients.has(client.rowIndex)
                        return (
                          <div
                            key={`${client.rowIndex}-${client.aeName}`}
                            className={`border rounded-lg p-4 ${client.status === 'renewed' ? 'bg-green-50 border-green-200' :
                              client.status === 'failed' ? 'bg-red-50 border-red-200' :
                                isWaiting ? 'bg-blue-50 border-blue-200' : ''
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
                                  {isWaiting && (
                                    <p className="text-blue-600 font-medium">
                                      ⏳ 대기 중 (다음 달에도 표시됨)
                                    </p>
                                  )}
                                </div>
                              </div>
                              {client.status === 'pending' && !isWaiting && (
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openDialog(client, 'pending')}
                                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    대기
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
              {dialogAction === 'renewed' ? '연장 성공 처리' :
                dialogAction === 'failed' ? '연장 실패 처리' : '대기 처리'}
            </DialogTitle>
            <DialogDescription>
              {selectedClient?.clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {dialogAction === 'pending' ? (
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  이 광고주를 대기 상태로 유지합니다.<br />
                  아무 처리도 하지 않으며, 다음 달에도 종료 예정 목록에 계속 표시됩니다.
                </p>
              </div>
            ) : dialogAction === 'renewed' ? (
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
                      type="text"
                      value={renewalAmount ? renewalAmount.toLocaleString() : ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9]/g, '')
                        setRenewalAmount(numericValue ? parseInt(numericValue, 10) : 0)
                      }}
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
                  <Label>실패 사유</Label>
                  <Textarea
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="연장이 안 된 사유를 입력하세요"
                    className="h-24"
                  />
                </div>
                <div className="text-sm text-yellow-800 bg-yellow-50 p-3 rounded">
                  <p>이 광고주는 연장 실패 목록에 저장되며 해당 월 목록에서 제외됩니다.</p>
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
              className={dialogAction === 'renewed' ? 'bg-green-600 hover:bg-green-700' :
                dialogAction === 'failed' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매출 상세 다이얼로그 */}
      <Dialog open={aeDetailsDialogOpen} onOpenChange={setAeDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAeStats?.aeName} 연장/소개 내역
            </DialogTitle>
            <DialogDescription>
              총 {selectedAeStats?.renewedClientsDetails?.length || 0}건 / {formatCurrency(selectedAeStats?.totalRenewalAmount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {(!selectedAeStats?.renewedClientsDetails || selectedAeStats.renewedClientsDetails.length === 0) ? (
              <p className="text-center text-muted-foreground py-8">조회된 연장/소개 내역이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {(selectedAeStats.renewedClientsDetails || []).map((detail, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{detail.clientName}</h4>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${detail.salesType.includes('소개')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {detail.salesType}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">계약금액:</span>{' '}
                        <span className="font-bold text-green-700">{formatCurrency(detail.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">계약기간:</span>{' '}
                        <span className="font-bold">{detail.renewalMonths}개월</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">마케팅 상품명:</span>{' '}
                        <span>{detail.productName}</span>
                      </div>
                      {(detail.contractDate || detail.contractEndDate) && (
                        <div className="col-span-2 text-xs text-muted-foreground mt-1 bg-white p-2 rounded border">
                          <span className="font-semibold">진행 날짜: </span>
                          {detail.contractDate || '?'} ~ {detail.contractEndDate || '?'}
                        </div>
                      )}
                      {detail.inputDate && (
                        <div className="col-span-2 text-xs text-muted-foreground mt-1 bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-semibold text-blue-800">입력(입금) 날짜: </span>
                          <span className="text-blue-900">{formatDateOnly(detail.inputDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAeDetailsDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
