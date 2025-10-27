"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserCheck, Users, TrendingUp, AlertCircle, Plus, Trash2 } from "lucide-react"

interface AEPerformance {
  aeName: string
  department: string
  totalClients: number
  expiringClients: number
  renewedClients: number
  failedRenewals: number
  failureReasons: string
  renewalRevenue: number
  notes: string
}

interface AEInfo {
  name: string
  department: string
}

export default function AEPerformanceInputPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aeListLoading, setAeListLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7))
  const [performances, setPerformances] = useState<AEPerformance[]>([])
  const [aeList, setAeList] = useState<AEInfo[]>([])

  // Google Sheets에서 AE 목록 가져오기
  useEffect(() => {
    const fetchAEList = async () => {
      try {
        setAeListLoading(true)
        const response = await fetch('/api/ae-performance/ae-list')
        const data = await response.json()

        if (data.success && data.aeList) {
          setAeList(data.aeList)

          // AE 목록으로 초기 실적 데이터 생성
          const initialPerformances = data.aeList.map((ae: AEInfo) => ({
            aeName: ae.name,
            department: ae.department,
            totalClients: 0,
            expiringClients: 0,
            renewedClients: 0,
            failedRenewals: 0,
            failureReasons: '',
            renewalRevenue: 0,
            notes: ''
          }))
          setPerformances(initialPerformances)
        }
      } catch (error) {
        console.error('Error fetching AE list:', error)
        alert('AE 목록을 불러오는데 실패했습니다.')
      } finally {
        setAeListLoading(false)
      }
    }

    fetchAEList()
  }, [])

  const updatePerformance = (index: number, field: keyof AEPerformance, value: any) => {
    const updated = [...performances]
    updated[index] = {
      ...updated[index],
      [field]: field === 'failureReasons' || field === 'notes' ? value : Number(value) || 0
    }
    setPerformances(updated)
  }

  const calculateRenewalRate = (perf: AEPerformance) => {
    if (perf.expiringClients === 0) return 0
    return Math.round((perf.renewedClients / perf.expiringClients) * 100)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // 모든 AE 실적 저장 (입력하지 않은 항목도 0으로 저장)
      const response = await fetch('/api/ae-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          performances,
          timestamp: new Date().toISOString()
        })
      })

      if (response.ok) {
        alert('AE 실적 데이터가 저장되었습니다.')
        router.push('/ae-performance')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (aeListLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">AE 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AE 실적 입력</h2>
          <p className="text-muted-foreground">
            AE별 월간 실적을 수기로 입력합니다 (총 {aeList.length}명)
          </p>
        </div>
      </div>

      {/* 월 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>실적 월 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-64">
            <Label>실적 월</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AE별 실적 입력 */}
      <Card>
        <CardHeader>
          <CardTitle>AE별 실적 입력</CardTitle>
          <CardDescription>
            각 AE의 담당 광고주 현황과 연장 실적을 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {performances.map((perf, index) => (
            <div key={index} className="border rounded-lg p-6 space-y-4 relative">
              {/* AE 정보 - 고정된 이름과 부서 */}
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <h3 className="font-bold text-lg text-blue-900">
                  {perf.aeName} ({perf.department})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label>담당 광고주 총 개수</Label>
                  <Input
                    type="number"
                    value={perf.totalClients || ''}
                    onChange={(e) => updatePerformance(index, 'totalClients', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 연장 실적 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>이번달 종료 예정</Label>
                  <Input
                    type="number"
                    value={perf.expiringClients || ''}
                    onChange={(e) => updatePerformance(index, 'expiringClients', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>연장 성공</Label>
                  <Input
                    type="number"
                    value={perf.renewedClients || ''}
                    onChange={(e) => updatePerformance(index, 'renewedClients', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>연장 실패</Label>
                  <Input
                    type="number"
                    value={perf.failedRenewals || ''}
                    onChange={(e) => updatePerformance(index, 'failedRenewals', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 연장 실패 사유 */}
              <div>
                <Label>연장 실패 사유</Label>
                <Textarea
                  value={perf.failureReasons}
                  onChange={(e) => updatePerformance(index, 'failureReasons', e.target.value)}
                  placeholder="실패 사유를 입력하세요"
                  className="h-20"
                />
              </div>

              {/* 연장 매출 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>연장으로 발생한 총 매출</Label>
                  <Input
                    type="number"
                    value={perf.renewalRevenue || ''}
                    onChange={(e) => updatePerformance(index, 'renewalRevenue', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>비고</Label>
                  <Input
                    value={perf.notes}
                    onChange={(e) => updatePerformance(index, 'notes', e.target.value)}
                    placeholder="추가 메모"
                  />
                </div>
              </div>

              {/* 실시간 계산 표시 */}
              {perf.aeName && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">연장률</span>
                      <p className={`font-bold text-lg ${
                        calculateRenewalRate(perf) >= 80 ? 'text-green-600' :
                        calculateRenewalRate(perf) >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {calculateRenewalRate(perf)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">광고주당 평균 매출</span>
                      <p className="font-bold text-lg">
                        {perf.renewedClients > 0
                          ? formatCurrency(perf.renewalRevenue / perf.renewedClients)
                          : '₩0'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">연장 성공</span>
                      <p className="font-bold text-lg text-green-600">
                        {perf.renewedClients}개
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">연장 실패</span>
                      <p className="font-bold text-lg text-red-600">
                        {perf.failedRenewals}개
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 전체 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">총 AE 수</p>
              <p className="text-2xl font-bold">
                {aeList.length}명
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 광고주 수</p>
              <p className="text-2xl font-bold">
                {performances.reduce((sum, p) => sum + p.totalClients, 0)}개
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 연장 성공</p>
              <p className="text-2xl font-bold text-green-600">
                {performances.reduce((sum, p) => sum + p.renewedClients, 0)}개
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 연장 실패</p>
              <p className="text-2xl font-bold text-red-600">
                {performances.reduce((sum, p) => sum + p.failedRenewals, 0)}개
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">총 연장 매출</p>
              <p className="text-2xl font-bold">
                {formatCurrency(performances.reduce((sum, p) => sum + p.renewalRevenue, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
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