"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar, UserCheck, UserX, AlertCircle } from "lucide-react"

interface ClientStatus {
  clientName: string
  aeName: string
  status: 'active' | 'expiring' | 'renewed' | 'terminated'
  contractEndDate: string
  monthlyAmount: number
  notes: string
}

export default function ClientManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 이번달 광고주 관리
  const [currentMonth, setCurrentMonth] = useState<ClientStatus[]>([
    { clientName: '', aeName: '', status: 'active', contractEndDate: '', monthlyAmount: 0, notes: '' }
  ])

  // 다음달 광고주 관리
  const [nextMonth, setNextMonth] = useState<ClientStatus[]>([
    { clientName: '', aeName: '', status: 'active', contractEndDate: '', monthlyAmount: 0, notes: '' }
  ])

  // 다다음달 광고주 관리
  const [monthAfterNext, setMonthAfterNext] = useState<ClientStatus[]>([
    { clientName: '', aeName: '', status: 'active', contractEndDate: '', monthlyAmount: 0, notes: '' }
  ])

  const addClientRow = (month: 'current' | 'next' | 'after') => {
    const newClient: ClientStatus = {
      clientName: '',
      aeName: '',
      status: 'active',
      contractEndDate: '',
      monthlyAmount: 0,
      notes: ''
    }

    if (month === 'current') {
      setCurrentMonth([...currentMonth, newClient])
    } else if (month === 'next') {
      setNextMonth([...nextMonth, newClient])
    } else {
      setMonthAfterNext([...monthAfterNext, newClient])
    }
  }

  const updateClient = (
    month: 'current' | 'next' | 'after',
    index: number,
    field: keyof ClientStatus,
    value: any
  ) => {
    const updateList = (list: ClientStatus[]) => {
      const updated = [...list]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    }

    if (month === 'current') {
      setCurrentMonth(updateList(currentMonth))
    } else if (month === 'next') {
      setNextMonth(updateList(nextMonth))
    } else {
      setMonthAfterNext(updateList(monthAfterNext))
    }
  }

  const removeClient = (month: 'current' | 'next' | 'after', index: number) => {
    if (month === 'current' && currentMonth.length > 1) {
      setCurrentMonth(currentMonth.filter((_, i) => i !== index))
    } else if (month === 'next' && nextMonth.length > 1) {
      setNextMonth(nextMonth.filter((_, i) => i !== index))
    } else if (month === 'after' && monthAfterNext.length > 1) {
      setMonthAfterNext(monthAfterNext.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const data = {
        currentMonth: currentMonth.filter(c => c.clientName),
        nextMonth: nextMonth.filter(c => c.clientName),
        monthAfterNext: monthAfterNext.filter(c => c.clientName),
        timestamp: new Date().toISOString()
      }

      const response = await fetch('/api/client-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        alert('고객 관리 데이터가 저장되었습니다.')
        router.push('/client-management')
      } else {
        throw new Error('저장 실패')
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'expiring': return 'text-yellow-600'
      case 'renewed': return 'text-blue-600'
      case 'terminated': return 'text-red-600'
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

  const renderClientSection = (
    title: string,
    clients: ClientStatus[],
    month: 'current' | 'next' | 'after'
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>AE별 담당 광고주 계약 현황을 입력하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clients.map((client, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>광고주명*</Label>
                <Input
                  value={client.clientName}
                  onChange={(e) => updateClient(month, index, 'clientName', e.target.value)}
                  placeholder="광고주 이름"
                />
              </div>
              <div>
                <Label>담당 AE*</Label>
                <Input
                  value={client.aeName}
                  onChange={(e) => updateClient(month, index, 'aeName', e.target.value)}
                  placeholder="담당자 이름"
                />
              </div>
              <div>
                <Label>계약 상태*</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={client.status}
                  onChange={(e) => updateClient(month, index, 'status', e.target.value)}
                >
                  <option value="active">진행중</option>
                  <option value="expiring">종료 예정</option>
                  <option value="renewed">연장 성공</option>
                  <option value="terminated">종료 확정</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>계약 종료일</Label>
                <Input
                  type="date"
                  value={client.contractEndDate}
                  onChange={(e) => updateClient(month, index, 'contractEndDate', e.target.value)}
                />
              </div>
              <div>
                <Label>월 계약금액</Label>
                <Input
                  type="number"
                  value={client.monthlyAmount || ''}
                  onChange={(e) => updateClient(month, index, 'monthlyAmount', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>비고</Label>
                <Input
                  value={client.notes}
                  onChange={(e) => updateClient(month, index, 'notes', e.target.value)}
                  placeholder="메모 사항"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={`flex items-center gap-2 ${getStatusColor(client.status)}`}>
                {getStatusIcon(client.status)}
                <span className="font-medium">
                  {client.status === 'active' && '진행중'}
                  {client.status === 'expiring' && '종료 예정'}
                  {client.status === 'renewed' && '연장 성공'}
                  {client.status === 'terminated' && '종료 확정'}
                </span>
              </div>
              {clients.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeClient(month, index)}
                >
                  삭제
                </Button>
              )}
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={() => addClientRow(month)}
          className="w-full"
        >
          + 광고주 추가
        </Button>
      </CardContent>
    </Card>
  )

  const currentMonthName = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  const nextMonthName = new Date(new Date().setMonth(new Date().getMonth() + 1))
    .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  const monthAfterNextName = new Date(new Date().setMonth(new Date().getMonth() + 2))
    .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">고객 관계 관리</h2>
          <p className="text-muted-foreground">
            AE별 담당 광고주와 계약 상태를 관리합니다
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {renderClientSection(`${currentMonthName} 현황`, currentMonth, 'current')}
        {renderClientSection(`${nextMonthName} 예정`, nextMonth, 'next')}
        {renderClientSection(`${monthAfterNextName} 예정`, monthAfterNext, 'after')}
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}