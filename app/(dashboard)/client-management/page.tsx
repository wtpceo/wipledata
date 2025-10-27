"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, UserCheck, UserX, AlertCircle, Calendar, TrendingUp } from "lucide-react"

interface ClientData {
  date: string
  clientName: string
  aeName: string
  status: 'active' | 'expiring' | 'renewed' | 'terminated'
  contractEndDate: string
  monthlyAmount: number
  notes: string
  monthCategory: string
}

interface ClientManagementData {
  currentMonth: ClientData[]
  nextMonth: ClientData[]
  monthAfterNext: ClientData[]
  statistics: {
    totalActiveClients: number
    expiringClients: number
    renewedClients: number
    terminatedClients: number
  }
}

export default function ClientManagementListPage() {
  const router = useRouter()
  const [data, setData] = useState<ClientManagementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientData()
  }, [])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client-management')
      if (response.ok) {
        const clientData = await response.json()
        setData(clientData)
      }
    } catch (error) {
      console.error('Failed to fetch client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: amount >= 100000000 ? 'compact' : 'standard',
      maximumFractionDigits: amount >= 100000000 ? 1 : 0,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'expiring': return 'text-yellow-600 bg-yellow-50'
      case 'renewed': return 'text-blue-600 bg-blue-50'
      case 'terminated': return 'text-red-600 bg-red-50'
      default: return ''
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck className="h-4 w-4" />
      case 'expiring': return <AlertCircle className="h-4 w-4" />
      case 'renewed': return <Calendar className="h-4 w-4" />
      case 'terminated': return <UserX className="h-4 w-4" />
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중'
      case 'expiring': return '종료 예정'
      case 'renewed': return '연장 성공'
      case 'terminated': return '종료 확정'
      default: return ''
    }
  }

  const currentMonthName = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  const nextMonthName = new Date(new Date().setMonth(new Date().getMonth() + 1))
    .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  const monthAfterNextName = new Date(new Date().setMonth(new Date().getMonth() + 2))
    .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  if (loading) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  const renderClientTable = (clients: ClientData[], title: string) => {
    if (!clients || clients.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              등록된 고객 데이터가 없습니다.
            </div>
          </CardContent>
        </Card>
      )
    }

    // AE별로 그룹화
    const groupedByAE = clients.reduce((acc, client) => {
      if (!acc[client.aeName]) {
        acc[client.aeName] = []
      }
      acc[client.aeName].push(client)
      return acc
    }, {} as { [key: string]: ClientData[] })

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            총 {clients.length}개 광고주 | {Object.keys(groupedByAE).length}명 AE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedByAE).map(([aeName, aeClients]) => (
              <div key={aeName} className="space-y-3">
                <div className="font-semibold text-sm text-muted-foreground">
                  {aeName} ({aeClients.length}개)
                </div>
                <div className="space-y-2">
                  {aeClients.map((client, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${getStatusColor(client.status)}`}>
                          {getStatusIcon(client.status)}
                          <span className="text-xs font-medium">
                            {getStatusText(client.status)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            계약 종료: {client.contractEndDate || '미정'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(client.monthlyAmount)}</p>
                        {client.notes && (
                          <p className="text-xs text-muted-foreground">{client.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">고객 관계 현황</h2>
          <p className="text-muted-foreground">
            AE별 담당 광고주 계약 상태를 확인합니다
          </p>
        </div>
        <Button onClick={() => router.push('/client-management/new')}>
          <Plus className="mr-2 h-4 w-4" />
          데이터 입력
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진행중 광고주</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.totalActiveClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              현재 계약 진행중
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">종료 예정</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.expiringClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              계약 종료 예정
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연장 성공</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.renewedClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              계약 연장 완료
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">종료 확정</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.statistics.terminatedClients || 0}개
            </div>
            <p className="text-xs text-muted-foreground">
              계약 종료됨
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 고객 현황 */}
      <div className="space-y-6">
        {renderClientTable(data?.currentMonth || [], currentMonthName + ' 현황')}
        {renderClientTable(data?.nextMonth || [], nextMonthName + ' 예정')}
        {renderClientTable(data?.monthAfterNext || [], monthAfterNextName + ' 예정')}
      </div>
    </div>
  )
}