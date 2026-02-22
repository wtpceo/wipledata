"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// 옥외매체 목록 (주 단위 계약)
const OUTDOOR_MEDIA = ['포커스미디어', '타운보드']

// 마케팅 매체 상품 목록
const PRODUCT_OPTIONS = [
  { value: '배달앱 관리', label: '배달앱 관리' },
  { value: '토탈 관리', label: '토탈 관리' },
  { value: '퍼포먼스 마케팅', label: '퍼포먼스 마케팅' },
  { value: '유튜브 마케팅', label: '유튜브 마케팅' },
  { value: '브랜드 블로그 마케팅', label: '브랜드 블로그 마케팅' },
  { value: '댓글만', label: '댓글만' },
  { value: '포커스미디어', label: '포커스미디어 (옥외매체)' },
  { value: '타운보드', label: '타운보드 (옥외매체)' },
  { value: '기타', label: '기타' },
]

export default function NewSalePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    // 섹션 1: 입력자 정보
    department: '',
    inputPerson: '',

    // 섹션 2: 계약정보
    contractDate: new Date().toISOString().split('T')[0],
    salesType: '',
    clientName: '',
    clientAddress: '', // 광고주 주소
    clientContact: '', // 광고주 연락처
    productNames: [] as string[], // 중복 선택 가능하도록 배열로 변경
    productOther: '',
    contractMonths: '',
    contractWeeks: '', // 옥외매체용 주 단위

    // 섹션 3: 결제 정보
    totalAmount: '',
    paymentMethod: '',
    paymentMethodOther: '',
    approvalNumber: '',
    outsourcingCost: '',

    // 섹션 4: 상세 내용
    consultationContent: '',
    specialNotes: '',
    attachments: null as File | null,

    // 섹션 5: 온라인 점검 (옥외매체 전용)
    onlineCheckRequested: false,
    onlineCheckMonth: '',
    onlineCheckDay: '',
    onlineCheckHour: '',
  })

  // 옥외매체가 선택되었는지 확인
  const hasOutdoorMedia = formData.productNames.some(p => OUTDOOR_MEDIA.includes(p))
  // 일반 매체가 선택되었는지 확인 (개월 수 필요)
  const hasRegularMedia = formData.productNames.some(p => !OUTDOOR_MEDIA.includes(p) && p !== '기타')

  const formatCurrency = (value: string) => {
    const number = value.replace(/[^0-9]/g, '')
    return new Intl.NumberFormat('ko-KR').format(Number(number))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'totalAmount' || name === 'outsourcingCost') {
      setFormData({
        ...formData,
        [name]: formatCurrency(value),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // 상품 체크박스 변경 핸들러
  const handleProductChange = (productValue: string, checked: boolean) => {
    setFormData(prev => {
      const newProductNames = checked
        ? [...prev.productNames, productValue]
        : prev.productNames.filter(p => p !== productValue)
      return { ...prev, productNames: newProductNames }
    })
  }

  // 온라인 점검 체크박스 변경 핸들러
  const handleOnlineCheckChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      onlineCheckRequested: checked,
      // 체크 해제 시 일시 정보도 초기화
      ...(checked ? {} : { onlineCheckMonth: '', onlineCheckDay: '', onlineCheckHour: '' })
    }))
  }


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        attachments: e.target.files[0],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 온라인 점검 일시 조합
      const onlineCheckDateTime = formData.onlineCheckRequested && formData.onlineCheckMonth && formData.onlineCheckDay
        ? `${formData.onlineCheckMonth}월 ${formData.onlineCheckDay}일 ${formData.onlineCheckHour || ''}시`.trim()
        : ''

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          productName: formData.productNames.join(', '), // 배열을 문자열로 변환
          totalAmount: parseInt(formData.totalAmount.replace(/,/g, '')),
          outsourcingCost: parseInt(formData.outsourcingCost.replace(/,/g, '') || '0'),
          contractMonths: hasRegularMedia ? parseInt(formData.contractMonths) : 0,
          contractWeeks: hasOutdoorMedia ? parseInt(formData.contractWeeks) : 0,
          onlineCheckDateTime,
        }),
      })

      if (!response.ok) {
        throw new Error('매출 등록 실패')
      }

      alert('매출이 성공적으로 등록되었습니다.')
      router.push('/sales')
    } catch (error) {
      console.error('Error:', error)
      alert('매출 등록 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">매출 입력</h2>
        <p className="text-muted-foreground">
          새로운 매출 데이터를 입력하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 섹션 1: 입력자 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">1. 입력자 정보</CardTitle>
            <CardDescription>
              매출을 입력하는 담당자 정보를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <select
                id="department"
                name="department"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.department}
                onChange={handleInputChange}
                required
              >
                <option value="">부서를 선택하세요</option>
                <option value="영업부">영업부</option>
                <option value="내무부">내무부</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inputPerson">입력자</Label>
              <Input
                id="inputPerson"
                name="inputPerson"
                type="text"
                value={formData.inputPerson}
                onChange={handleInputChange}
                placeholder="본인 이름 (띄어쓰기 없이)"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 섹션 2: 계약정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">2. 계약정보</CardTitle>
            <CardDescription>
              계약 관련 정보를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractDate">계약날짜</Label>
                <Input
                  id="contractDate"
                  name="contractDate"
                  type="date"
                  value={formData.contractDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesType">매출 유형</Label>
                <select
                  id="salesType"
                  name="salesType"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.salesType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">매출 유형을 선택하세요</option>
                  <option value="신규">신규</option>
                  <option value="연장">연장</option>
                  <option value="신규 소개">신규 소개</option>
                  <option value="기존고객 소개">기존고객 소개</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">광고주 업체명</Label>
              <Input
                id="clientName"
                name="clientName"
                type="text"
                value={formData.clientName}
                onChange={handleInputChange}
                placeholder="업체명을 입력하세요"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientAddress">광고주 주소</Label>
                <Input
                  id="clientAddress"
                  name="clientAddress"
                  type="text"
                  value={formData.clientAddress}
                  onChange={handleInputChange}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientContact">광고주 연락처</Label>
                <Input
                  id="clientContact"
                  name="clientContact"
                  type="tel"
                  value={formData.clientContact}
                  onChange={handleInputChange}
                  placeholder="예: 010-1234-5678"
                />
              </div>
            </div>

            {/* 마케팅 매체 상품 선택 (중복 선택 가능) */}
            <div className="space-y-3">
              <Label>마케팅 매체 상품명 (중복 선택 가능)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRODUCT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${option.value}`}
                      checked={formData.productNames.includes(option.value)}
                      onCheckedChange={(checked) => handleProductChange(option.value, checked as boolean)}
                    />
                    <label
                      htmlFor={`product-${option.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              {formData.productNames.includes('기타') && (
                <Input
                  name="productOther"
                  type="text"
                  value={formData.productOther}
                  onChange={handleInputChange}
                  placeholder="기타 상품명 입력"
                  className="mt-2 max-w-md"
                />
              )}
              {formData.productNames.length === 0 && (
                <p className="text-sm text-destructive">최소 1개 이상 선택해주세요</p>
              )}
            </div>

            {/* 계약 기간 입력 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 일반 매체용 개월 수 */}
              {hasRegularMedia && (
                <div className="space-y-2">
                  <Label htmlFor="contractMonths">계약 개월 수</Label>
                  <Input
                    id="contractMonths"
                    name="contractMonths"
                    type="number"
                    min="1"
                    value={formData.contractMonths}
                    onChange={handleInputChange}
                    placeholder="숫자만 입력 (예: 6)"
                    required={hasRegularMedia}
                  />
                  <p className="text-xs text-muted-foreground">일반 매체 계약 기간</p>
                </div>
              )}

              {/* 옥외매체용 주 단위 */}
              {hasOutdoorMedia && (
                <div className="space-y-2">
                  <Label htmlFor="contractWeeks">계약 주 수 (옥외매체)</Label>
                  <Input
                    id="contractWeeks"
                    name="contractWeeks"
                    type="number"
                    min="1"
                    value={formData.contractWeeks}
                    onChange={handleInputChange}
                    placeholder="숫자만 입력 (예: 12, 24)"
                    required={hasOutdoorMedia}
                  />
                  <p className="text-xs text-muted-foreground">포커스미디어/타운보드 계약 기간</p>
                </div>
              )}
            </div>

            {/* 옥외매체 선택 시 온라인 점검 옵션 */}
            {hasOutdoorMedia && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="onlineCheckRequested"
                    checked={formData.onlineCheckRequested}
                    onCheckedChange={(checked) => handleOnlineCheckChange(checked as boolean)}
                  />
                  <label
                    htmlFor="onlineCheckRequested"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    온라인 점검 희망
                  </label>
                </div>

                {formData.onlineCheckRequested && (
                  <div className="space-y-2">
                    <Label>점검 희망 일시</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        name="onlineCheckMonth"
                        type="number"
                        min="1"
                        max="12"
                        value={formData.onlineCheckMonth}
                        onChange={handleInputChange}
                        placeholder="월"
                        className="w-20"
                      />
                      <span>월</span>
                      <Input
                        name="onlineCheckDay"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.onlineCheckDay}
                        onChange={handleInputChange}
                        placeholder="일"
                        className="w-20"
                      />
                      <span>일</span>
                      <Input
                        name="onlineCheckHour"
                        type="number"
                        min="0"
                        max="23"
                        value={formData.onlineCheckHour}
                        onChange={handleInputChange}
                        placeholder="시"
                        className="w-20"
                      />
                      <span>시</span>
                    </div>
                    <p className="text-xs text-muted-foreground">온라인 점검 희망 시간을 입력하세요</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 섹션 3: 결제 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. 결제 정보</CardTitle>
            <CardDescription>
              결제 관련 정보를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">총 계약금액</Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  type="text"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">결제 방식</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">결제 방식을 선택하세요</option>
                  <option value="카드 결제">카드 결제</option>
                  <option value="계좌 이체">계좌 이체</option>
                  <option value="현금 수령">현금 수령</option>
                  <option value="미결제">미결제</option>
                  <option value="기타">기타</option>
                </select>
                {formData.paymentMethod === '기타' && (
                  <Input
                    name="paymentMethodOther"
                    type="text"
                    value={formData.paymentMethodOther}
                    onChange={handleInputChange}
                    placeholder="기타 결제 방식 입력"
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approvalNumber">결제 승인 번호</Label>
                <Input
                  id="approvalNumber"
                  name="approvalNumber"
                  type="text"
                  value={formData.approvalNumber}
                  onChange={handleInputChange}
                  placeholder="승인 번호 입력"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outsourcingCost">확정 외주비</Label>
                <Input
                  id="outsourcingCost"
                  name="outsourcingCost"
                  type="text"
                  value={formData.outsourcingCost}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 섹션 4: 상세 내용 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">4. 상세 내용</CardTitle>
            <CardDescription>
              추가 정보를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consultationContent">광고주 상담 내용</Label>
              <Textarea
                id="consultationContent"
                name="consultationContent"
                value={formData.consultationContent}
                onChange={handleInputChange}
                placeholder="상담 내용을 자세히 입력하세요"
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNotes">특이사항</Label>
              <Textarea
                id="specialNotes"
                name="specialNotes"
                value={formData.specialNotes}
                onChange={handleInputChange}
                placeholder="특이사항이 있다면 입력하세요"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">계약서 파일 및 기타 자료</Label>
              <Input
                id="attachments"
                name="attachments"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
              />
              <p className="text-sm text-muted-foreground">
                PDF, Word, Excel, 이미지 파일을 업로드할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/sales')}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading} className="px-8">
            {isLoading ? '저장 중...' : '매출 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}