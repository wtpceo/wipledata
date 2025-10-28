"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle, XCircle, Plus, AlertCircle } from "lucide-react"

interface SearchedClient {
  rowIndex: number
  clientName: string
  status: string
  amount: string
  startDate: string
  endDate: string
  aeNames: string[]
  similarity: number
}

interface StaffMember {
  name: string
  department: string
  position: string
}

export default function ManualAEPerformancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedClient[]>([])
  const [selectedClient, setSelectedClient] = useState<SearchedClient | null>(null)
  const [staffList, setStaffList] = useState<StaffMember[]>([])

  // 입력 필드
  const [performanceMonth, setPerformanceMonth] = useState(new Date().toISOString().substring(0, 7))
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [isReferral, setIsReferral] = useState(false)
  const [result, setResult] = useState<'renewed' | 'failed' | ''>('')
  const [renewalMonths, setRenewalMonths] = useState(0)
  const [renewalAmount, setRenewalAmount] = useState(0)
  const [failureReason, setFailureReason] = useState('')
  const [notes, setNotes] = useState('')

  // Staff 목록 가져오기
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff')
        const data = await response.json()
        if (data.success) {
          setStaffList(data.staff)
        }
      } catch (error) {
        console.error('Error fetching staff:', error)
      }
    }

    fetchStaff()
  }, [])

  // 광고주 검색
  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      alert('최소 2글자 이상 입력해주세요')
      return
    }

    try {
      const response = await fetch(`/api/clients/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.clients || [])
        if (data.clients.length === 0) {
          alert('검색 결과가 없습니다. 유사한 광고주명이 없습니다.')
        }
      }
    } catch (error) {
      console.error('Error searching clients:', error)
      alert('검색 중 오류가 발생했습니다.')
    }
  }

  // 광고주 선택
  const handleSelectClient = (client: SearchedClient) => {
    setSelectedClient(client)
    setSearchResults([])
    setSearchQuery(client.clientName)

    // 기존 종료일로 실적 월 자동 설정
    if (client.endDate) {
      const endDateMatch = client.endDate.match(/^(\d{4})\.(\d{1,2})/)
      if (endDateMatch) {
        const [, year, month] = endDateMatch
        setPerformanceMonth(`${year}-${month.padStart(2, '0')}`)
      }
    }
  }

  // 담당자 토글
  const toggleStaff = (staffName: string) => {
    setSelectedStaff(prev =>
      prev.includes(staffName)
        ? prev.filter(s => s !== staffName)
        : [...prev, staffName]
    )
  }

  // 제출
  const handleSubmit = async () => {
    if (!selectedClient) {
      alert('광고주를 선택해주세요')
      return
    }

    if (selectedStaff.length === 0) {
      alert('담당자를 선택해주세요')
      return
    }

    if (!result) {
      alert('연장 결과를 선택해주세요')
      return
    }

    if (result === 'renewed' && (renewalMonths < 1 || renewalAmount < 1)) {
      alert('연장 개월수와 매출을 입력해주세요')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/ae-performance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: selectedClient.clientName,
          performanceMonth,
          aeNames: selectedStaff,
          isReferral,
          result,
          renewalMonths: result === 'renewed' ? renewalMonths : 0,
          renewalAmount: result === 'renewed' ? renewalAmount : 0,
          failureReason: result === 'failed' ? failureReason : '',
          notes,
          timestamp: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('실적이 등록되었습니다')
        router.push('/ae-performance-v2')
      } else {
        throw new Error(data.error || '등록 실패')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '등록 중 오류가 발생했습니다.'
      alert(errorMessage)
      console.error('Manual Performance Save Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">수동 실적 입력</h2>
          <p className="text-muted-foreground">
            과거 실적이나 소개 건 등을 수동으로 등록합니다
          </p>
        </div>
      </div>

      {/* 광고주 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>광고주 검색</CardTitle>
          <CardDescription>광고주명을 입력하면 유사한 광고주를 찾아줍니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="광고주명 입력 (최소 2글자)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold mb-2">검색 결과 ({searchResults.length}개)</p>
              {searchResults.map((client) => (
                <div
                  key={client.rowIndex}
                  onClick={() => handleSelectClient(client)}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.clientName}</span>
                        <Badge variant={client.status === '진행' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                        <Badge variant="outline">유사도 {client.similarity}%</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        종료일: {client.endDate} | 담당: {client.aeNames.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 선택된 광고주 */}
          {selectedClient && searchResults.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-blue-900">선택된 광고주</p>
                  <p className="text-lg font-bold mt-1">{selectedClient.clientName}</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {selectedClient.status} | 종료일: {selectedClient.endDate}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null)
                    setSearchQuery('')
                  }}
                >
                  변경
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 실적 정보 입력 */}
      {selectedClient && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>실적 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 실적 월 */}
              <div>
                <Label>실적 집계 월 *</Label>
                <Input
                  type="month"
                  value={performanceMonth}
                  onChange={(e) => setPerformanceMonth(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  이 실적이 집계될 월을 선택하세요
                </p>
              </div>

              {/* 담당자 선택 */}
              <div>
                <Label>담당자 선택 * (복수 선택 가능)</Label>
                <div className="border rounded-lg p-4 mt-2 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {staffList.map((staff) => (
                      <div
                        key={staff.name}
                        onClick={() => toggleStaff(staff.name)}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedStaff.includes(staff.name)
                            ? 'bg-blue-100 border-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-medium text-sm">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {staff.department} | {staff.position}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedStaff.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">
                    선택: {selectedStaff.join(', ')}
                  </p>
                )}
              </div>

              {/* 소개 건 체크 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isReferral"
                  checked={isReferral}
                  onChange={(e) => setIsReferral(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="isReferral" className="cursor-pointer">
                  소개 건 (협업/소개로 받은 광고주)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* 연장 결과 */}
          <Card>
            <CardHeader>
              <CardTitle>연장 결과 *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 결과 선택 */}
              <div className="flex gap-4">
                <Button
                  variant={result === 'renewed' ? 'default' : 'outline'}
                  onClick={() => setResult('renewed')}
                  className={result === 'renewed' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  연장 성공
                </Button>
                <Button
                  variant={result === 'failed' ? 'destructive' : 'outline'}
                  onClick={() => setResult('failed')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  연장 실패
                </Button>
              </div>

              {/* 연장 성공 필드 */}
              {result === 'renewed' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>연장 개월수 *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={renewalMonths || ''}
                        onChange={(e) => setRenewalMonths(parseInt(e.target.value) || 0)}
                        placeholder="개월"
                      />
                    </div>
                    <div>
                      <Label>연장 매출 *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={renewalAmount || ''}
                        onChange={(e) => setRenewalAmount(parseInt(e.target.value) || 0)}
                        placeholder="원"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 연장 실패 필드 */}
              {result === 'failed' && (
                <div className="border-t pt-4">
                  <Label>연장 실패 사유</Label>
                  <Textarea
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="실패 사유를 입력하세요"
                    rows={3}
                  />
                </div>
              )}

              {/* 비고 */}
              <div>
                <Label>비고</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="추가 메모사항"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 버튼 */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '등록 중...' : '실적 등록'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
