"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { notifyDataChanged } from '@/hooks/useSmartRefresh'
import { Checkbox } from '@/components/ui/checkbox'

// 옥외매체 목록 (주 단위 계약)
const OUTDOOR_MEDIA = ['포커스미디어', '타운보드S', 'GS', '타운보드L', 'GS 전자게시대', 'HTPOST', 'HTPOST 전단지']

// 매체별 색상 매핑
const MEDIA_COLORS: Record<string, { border: string; bg: string; text: string; btnBorder: string; btnHover: string }> = {
  '포커스미디어':   { border: 'border-blue-200',   bg: 'bg-blue-50/30',   text: 'text-blue-700',   btnBorder: 'border-blue-300',   btnHover: 'hover:bg-blue-100' },
  '타운보드S':      { border: 'border-orange-200', bg: 'bg-orange-50/30', text: 'text-orange-700', btnBorder: 'border-orange-300', btnHover: 'hover:bg-orange-100' },
  'GS':             { border: 'border-green-200',  bg: 'bg-green-50/30',  text: 'text-green-700',  btnBorder: 'border-green-300',  btnHover: 'hover:bg-green-100' },
  '타운보드L':      { border: 'border-purple-200', bg: 'bg-purple-50/30', text: 'text-purple-700', btnBorder: 'border-purple-300', btnHover: 'hover:bg-purple-100' },
  'GS 전자게시대':  { border: 'border-teal-200',   bg: 'bg-teal-50/30',   text: 'text-teal-700',   btnBorder: 'border-teal-300',   btnHover: 'hover:bg-teal-100' },
  'HTPOST':         { border: 'border-pink-200',   bg: 'bg-pink-50/30',   text: 'text-pink-700',   btnBorder: 'border-pink-300',   btnHover: 'hover:bg-pink-100' },
  'HTPOST 전단지':  { border: 'border-rose-200',   bg: 'bg-rose-50/30',   text: 'text-rose-700',   btnBorder: 'border-rose-300',   btnHover: 'hover:bg-rose-100' },
}
const DEFAULT_MEDIA_COLOR = { border: 'border-gray-200', bg: 'bg-gray-50/30', text: 'text-gray-700', btnBorder: 'border-gray-300', btnHover: 'hover:bg-gray-100' }

// 마케팅 매체 상품 목록
const PRODUCT_OPTIONS = [
  { value: '배민',          label: '배민' },
  { value: '댓글',          label: '댓글' },
  { value: '플레이스',      label: '플레이스' },
  { value: '블로그',        label: '블로그' },
  { value: '퍼포먼스',      label: '퍼포먼스' },
  { value: '유튜브',        label: '유튜브' },
  { value: '블로그기자단',  label: '블로그기자단' },
  { value: '블로그체험단',  label: '블로그체험단' },
  { value: '포커스미디어',  label: '포커스미디어' },
  { value: '타운보드S',     label: '타운보드S' },
  { value: 'GS',            label: 'GS' },
  { value: '타운보드L',     label: '타운보드L' },
  { value: 'GS 전자게시대', label: 'GS 전자게시대' },
  { value: 'HTPOST',        label: 'HTPOST' },
  { value: 'HTPOST 전단지', label: 'HTPOST 전단지' },
  { value: '타겟핏',        label: '타겟핏' },
  { value: '홈페이지 제작', label: '홈페이지 제작' },
  { value: '아파트너',      label: '아파트너' },
  { value: '기타',          label: '기타' },
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
    depositorName: '', // 입금자명 (입금예정 선택 시)
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

  // 매체별 금액
  const [mediaAmounts, setMediaAmounts] = useState<Record<string, string>>({})

  // 매체별 미디어 계약 정보 (매체명 → 단지 배열)
  const [mediaContractsByMedia, setMediaContractsByMedia] = useState<
    Record<string, { complexName: string; installCount: string; unitPrice: string; monthlyPrice: string }[]>
  >({})

  const addMediaContract = (mediaName: string) => {
    setMediaContractsByMedia(prev => ({
      ...prev,
      [mediaName]: [...(prev[mediaName] || []), { complexName: '', installCount: '', unitPrice: '', monthlyPrice: '' }]
    }))
  }

  const removeMediaContract = (mediaName: string, index: number) => {
    setMediaContractsByMedia(prev => ({
      ...prev,
      [mediaName]: (prev[mediaName] || []).filter((_, i) => i !== index)
    }))
  }

  const updateMediaContract = (mediaName: string, index: number, field: string, value: string) => {
    setMediaContractsByMedia(prev => ({
      ...prev,
      [mediaName]: (prev[mediaName] || []).map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  // 매체별 금액 합계 (총 계약금액 자동 계산)
  const mediaSubtotal = Object.values(mediaAmounts)
    .reduce((sum, v) => sum + (parseInt(v.replace(/,/g, '')) || 0), 0)

  // mediaSubtotal이 변경되면 totalAmount 자동 반영
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalAmount: mediaSubtotal > 0 ? new Intl.NumberFormat('ko-KR').format(mediaSubtotal) : ''
    }))
  }, [mediaSubtotal])

  // 포커스미디어만 주 단위 계약
  const hasWeeklyMedia = formData.productNames.includes('포커스미디어')
  // 포커스미디어 외 모든 매체는 개월 단위 (옥외매체 포함)
  const hasMonthlyMedia = formData.productNames.some(p => p !== '포커스미디어' && p !== '기타')
  // 옥외매체 선택 여부 (미디어 계약정보 및 온라인 점검 표시용)
  const hasOutdoorMedia = formData.productNames.some(p => OUTDOOR_MEDIA.includes(p))

  const formatCurrency = (value: string) => {
    const number = value.replace(/[^0-9]/g, '')
    return new Intl.NumberFormat('ko-KR').format(Number(number))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'outsourcingCost') {
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

  // 선택된 옥외매체 목록
  const selectedOutdoorMedia = formData.productNames.filter(p => OUTDOOR_MEDIA.includes(p))

  // 상품 체크박스 변경 핸들러
  const handleProductChange = (productValue: string, checked: boolean) => {
    setFormData(prev => {
      const newProductNames = checked
        ? [...prev.productNames, productValue]
        : prev.productNames.filter(p => p !== productValue)
      return { ...prev, productNames: newProductNames }
    })
    setMediaAmounts(prev => {
      if (checked) return { ...prev, [productValue]: '' }
      const next = { ...prev }
      delete next[productValue]
      return next
    })
    // 옥외매체인 경우 mediaContractsByMedia 동기화
    if (OUTDOOR_MEDIA.includes(productValue)) {
      setMediaContractsByMedia(prev => {
        if (checked) return { ...prev, [productValue]: [{ complexName: '', installCount: '', unitPrice: '', monthlyPrice: '' }] }
        const next = { ...prev }
        delete next[productValue]
        return next
      })
    }
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

    if (formData.productNames.length === 0) {
      alert('마케팅 매체 상품을 1개 이상 선택해주세요.')
      return
    }

    if (mediaSubtotal === 0) {
      alert('매체별 계약금액을 입력해주세요.')
      return
    }

    // 옥외매체 단지별 대당단가 또는 월단가 중 하나 필수
    for (const [mediaName, contracts] of Object.entries(mediaContractsByMedia)) {
      for (const [idx, c] of contracts.entries()) {
        if (c.complexName && !c.unitPrice && !c.monthlyPrice) {
          alert(`${mediaName}의 ${idx + 1}번째 단지에 대당단가 또는 월단가를 입력해주세요.`)
          return
        }
      }
    }

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
          totalAmount: mediaSubtotal,
          outsourcingCost: parseInt(formData.outsourcingCost.replace(/,/g, '') || '0'),
          contractMonths: hasMonthlyMedia ? parseInt(formData.contractMonths) : 0,
          contractWeeks: hasWeeklyMedia ? parseInt(formData.contractWeeks) : 0,
          onlineCheckDateTime,
          // 매체별 금액 (각 매체명: 금액)
          mediaAmounts: Object.fromEntries(
            Object.entries(mediaAmounts).map(([k, v]) => [k, parseInt(v.replace(/,/g, '')) || 0])
          ),
          // 매체별 계약정보 (옥외매체): 매체명 → { complexName, installCount, unitPrice, monthlyPrice }
          mediaContractsByMedia: Object.fromEntries(
            Object.entries(mediaContractsByMedia).map(([mediaName, contracts]) => [
              mediaName,
              {
                complexName: contracts.map(c => c.complexName).filter(Boolean).join('\n'),
                installCount: contracts.map(c => c.installCount).filter(Boolean).join('\n'),
                unitPrice: contracts.map(c => c.unitPrice ? parseInt(c.unitPrice.replace(/,/g, '')) : 0).filter((v): v is number => v > 0).join('\n'),
                monthlyPrice: contracts.map(c => c.monthlyPrice ? parseInt(c.monthlyPrice.replace(/,/g, '')) : 0).filter((v): v is number => v > 0).join('\n'),
              }
            ])
          ),
        }),
      })

      if (!response.ok) {
        throw new Error('매출 등록 실패')
      }

      notifyDataChanged()
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
              {/* 포커스미디어 외 모든 매체 - 개월 수 */}
              {hasMonthlyMedia && (
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
                    required={hasMonthlyMedia}
                  />
                  <p className="text-xs text-muted-foreground">계약 기간 (개월)</p>
                </div>
              )}

              {/* 포커스미디어 전용 - 주 단위 */}
              {hasWeeklyMedia && (
                <div className="space-y-2">
                  <Label htmlFor="contractWeeks">계약 주 수 (포커스미디어)</Label>
                  <Input
                    id="contractWeeks"
                    name="contractWeeks"
                    type="number"
                    min="1"
                    value={formData.contractWeeks}
                    onChange={handleInputChange}
                    placeholder="숫자만 입력 (예: 12, 24)"
                    required={hasWeeklyMedia}
                  />
                  <p className="text-xs text-muted-foreground">포커스미디어 계약 기간</p>
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

        {/* 매체별 미디어 계약 정보 (옥외매체 선택 시 매체별로 표시) */}
        {selectedOutdoorMedia.map(mediaName => {
          const color = MEDIA_COLORS[mediaName] || DEFAULT_MEDIA_COLOR
          const contracts = mediaContractsByMedia[mediaName] || []
          return (
            <Card key={mediaName} className={`${color.border} ${color.bg}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={`text-lg ${color.text} flex items-center gap-2`}>
                      {mediaName} 계약정보
                    </CardTitle>
                    <CardDescription>
                      단지 정보를 입력해주세요. (단지명, 설치대수, 대당단가 또는 월단가 필수)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`${color.btnBorder} ${color.text} ${color.btnHover}`}
                    onClick={() => addMediaContract(mediaName)}
                  >
                    + 단지 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {contracts.map((contract, index) => {
                  const missingPrice = contract.complexName && !contract.unitPrice && !contract.monthlyPrice
                  return (
                    <div key={index}>
                      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
                        <div className="space-y-1">
                          {index === 0 && <Label className="text-xs">단지명 *</Label>}
                          <Input
                            type="text"
                            value={contract.complexName}
                            onChange={(e) => updateMediaContract(mediaName, index, 'complexName', e.target.value)}
                            placeholder="예: OO아파트"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-1">
                          {index === 0 && <Label className="text-xs">설치대수 *</Label>}
                          <Input
                            type="number"
                            min="1"
                            value={contract.installCount}
                            onChange={(e) => updateMediaContract(mediaName, index, 'installCount', e.target.value)}
                            placeholder="예: 10"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-1">
                          {index === 0 && <Label className="text-xs">대당단가 *</Label>}
                          <Input
                            type="text"
                            value={contract.unitPrice}
                            onChange={(e) => updateMediaContract(mediaName, index, 'unitPrice', formatCurrency(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          {index === 0 && <Label className="text-xs">월단가 *</Label>}
                          <Input
                            type="text"
                            value={contract.monthlyPrice}
                            onChange={(e) => updateMediaContract(mediaName, index, 'monthlyPrice', formatCurrency(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div className={index === 0 ? 'mt-5' : ''}>
                          {index > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => removeMediaContract(mediaName, index)}
                            >
                              ✕
                            </Button>
                          ) : (
                            <div className="h-9 w-9" />
                          )}
                        </div>
                      </div>
                      {missingPrice && (
                        <p className="text-xs text-red-500 mt-1">대당단가 또는 월단가 중 하나를 입력하세요</p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}

        {/* 섹션 3: 결제 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">3. 결제 정보</CardTitle>
            <CardDescription>
              결제 관련 정보를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 결제 방식 */}
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
                <option value="입금예정">입금예정</option>
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
              {formData.paymentMethod === '입금예정' && (
                <div className="mt-2">
                  <Label htmlFor="depositorName">입금자명</Label>
                  <Input
                    id="depositorName"
                    name="depositorName"
                    type="text"
                    value={formData.depositorName}
                    onChange={handleInputChange}
                    placeholder="입금자명을 입력하세요"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* 매체별 계약금액 */}
            {formData.productNames.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <Label className="text-sm font-semibold">매체별 계약금액</Label>
                {formData.productNames.map(product => (
                  <div key={product} className="flex items-center gap-3">
                    <span className="w-36 text-sm font-medium shrink-0">
                      {product === '기타' && formData.productOther ? formData.productOther : product}
                    </span>
                    <Input
                      type="text"
                      value={mediaAmounts[product] || ''}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value)
                        setMediaAmounts(prev => ({ ...prev, [product]: formatted }))
                      }}
                      placeholder="0"
                      className="w-48"
                      required
                    />
                    <span className="text-sm text-muted-foreground">원</span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold">총 계약금액 (합계)</span>
                  <span className="text-lg font-bold">
                    {new Intl.NumberFormat('ko-KR').format(mediaSubtotal)}원
                  </span>
                </div>
              </div>
            )}

            {/* 결제 승인번호 + 외주비 */}
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
              <div className="flex items-center gap-2">
                <Label htmlFor="specialNotes">특이사항</Label>
              </div>
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