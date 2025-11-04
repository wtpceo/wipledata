'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function ProposalRequestPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    requester: '',
    department: '',
    clientName: '',
    contactName: '',
    phone: '',
    email: '',
    industry: '',
    proposalType: '신규',
    adPlatform: [] as string[],
    desiredProduct: [] as string[],
    budgetRange: '',
    contractPeriod: '',
    adGoal: '',
    desiredDate: '',
    urgency: '보통',
    notes: '',
    attachments: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit proposal request')
      }

      toast({
        title: '제안서 요청 완료',
        description: '제안서 요청이 성공적으로 등록되었습니다.',
      })

      // 폼 초기화
      setFormData({
        requester: '',
        department: '',
        clientName: '',
        contactName: '',
        phone: '',
        email: '',
        industry: '',
        proposalType: '신규',
        adPlatform: [],
        desiredProduct: [],
        budgetRange: '',
        contractPeriod: '',
        adGoal: '',
        desiredDate: '',
        urgency: '보통',
        notes: '',
        attachments: ''
      })

      // 제안서 관리 페이지로 이동
      router.push('/proposals')
    } catch (error) {
      console.error('Error submitting proposal request:', error)
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '제안서 요청 등록에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const togglePlatform = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      adPlatform: prev.adPlatform.includes(platform)
        ? prev.adPlatform.filter(p => p !== platform)
        : [...prev.adPlatform, platform]
    }))
  }

  const toggleProduct = (product: string) => {
    setFormData(prev => ({
      ...prev,
      desiredProduct: prev.desiredProduct.includes(product)
        ? prev.desiredProduct.filter(p => p !== product)
        : [...prev.desiredProduct, product]
    }))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">제안서 요청</h1>
          <p className="text-muted-foreground mt-2">
            광고주에게 제공할 맞춤형 제안서를 요청하세요
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* 요청자 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>요청자 정보</CardTitle>
              <CardDescription>제안서를 요청하는 담당자 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester">요청자명 *</Label>
                  <Input
                    id="requester"
                    required
                    placeholder="홍길동"
                    value={formData.requester}
                    onChange={(e) => handleChange('requester', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">요청 부서</Label>
                  <Select value={formData.department} onValueChange={(value) => handleChange('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="부서 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="영업부">영업부</SelectItem>
                      <SelectItem value="디자인부">디자인부</SelectItem>
                      <SelectItem value="마케팅부">마케팅부</SelectItem>
                      <SelectItem value="기획부">기획부</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 광고주 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>광고주 정보</CardTitle>
              <CardDescription>제안서를 받을 광고주 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">광고주명 *</Label>
                  <Input
                    id="clientName"
                    required
                    placeholder="(주)회사명"
                    value={formData.clientName}
                    onChange={(e) => handleChange('clientName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">담당자명 *</Label>
                  <Input
                    id="contactName"
                    required
                    placeholder="김담당"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="example@company.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">업종</Label>
                <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="업종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="제조업">제조업</SelectItem>
                    <SelectItem value="서비스업">서비스업</SelectItem>
                    <SelectItem value="IT/소프트웨어">IT/소프트웨어</SelectItem>
                    <SelectItem value="유통/도소매">유통/도소매</SelectItem>
                    <SelectItem value="금융/보험">금융/보험</SelectItem>
                    <SelectItem value="의료/헬스케어">의료/헬스케어</SelectItem>
                    <SelectItem value="교육">교육</SelectItem>
                    <SelectItem value="건설/부동산">건설/부동산</SelectItem>
                    <SelectItem value="식품/외식">식품/외식</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 제안 내용 */}
          <Card>
            <CardHeader>
              <CardTitle>제안 내용</CardTitle>
              <CardDescription>제안서에 포함될 내용을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proposalType">제안 유형</Label>
                  <Select value={formData.proposalType} onValueChange={(value) => handleChange('proposalType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="제안 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="신규">신규</SelectItem>
                      <SelectItem value="연장">연장</SelectItem>
                      <SelectItem value="상품변경">상품변경</SelectItem>
                      <SelectItem value="추가제안">추가제안</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">예산 범위</Label>
                  <Select value={formData.budgetRange} onValueChange={(value) => handleChange('budgetRange', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="예산 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100만원 미만">100만원 미만</SelectItem>
                      <SelectItem value="100-300만원">100-300만원</SelectItem>
                      <SelectItem value="300-500만원">300-500만원</SelectItem>
                      <SelectItem value="500-1000만원">500-1000만원</SelectItem>
                      <SelectItem value="1000만원 이상">1000만원 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>광고 매체 (복수 선택 가능)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['네이버', '구글', '메타', '카카오', '유튜브', '인스타그램'].map((platform) => (
                    <Button
                      key={platform}
                      type="button"
                      variant={formData.adPlatform.includes(platform) ? "default" : "outline"}
                      onClick={() => togglePlatform(platform)}
                      className="w-full"
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>희망 상품 (복수 선택 가능)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['검색광고', '디스플레이광고', 'SNS광고', '동영상광고', '쇼핑광고', '브랜드검색'].map((product) => (
                    <Button
                      key={product}
                      type="button"
                      variant={formData.desiredProduct.includes(product) ? "default" : "outline"}
                      onClick={() => toggleProduct(product)}
                      className="w-full"
                    >
                      {product}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractPeriod">계약 기간</Label>
                <Select value={formData.contractPeriod} onValueChange={(value) => handleChange('contractPeriod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="계약 기간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1개월">1개월</SelectItem>
                    <SelectItem value="3개월">3개월</SelectItem>
                    <SelectItem value="6개월">6개월</SelectItem>
                    <SelectItem value="12개월">12개월</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adGoal">광고 목표</Label>
                <Textarea
                  id="adGoal"
                  placeholder="예: 브랜드 인지도 향상, 매출 증대, 신규 고객 확보 등"
                  value={formData.adGoal}
                  onChange={(e) => handleChange('adGoal', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 일정 및 추가 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>일정 및 추가 정보</CardTitle>
              <CardDescription>제안서 제출 일정과 추가 요청사항을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="desiredDate">제안 희망일</Label>
                  <Input
                    id="desiredDate"
                    type="date"
                    value={formData.desiredDate}
                    onChange={(e) => handleChange('desiredDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">시급도</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="시급도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="긴급">긴급</SelectItem>
                      <SelectItem value="보통">보통</SelectItem>
                      <SelectItem value="여유">여유</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">특이사항</Label>
                <Textarea
                  id="notes"
                  placeholder="제안서 작성 시 참고할 특이사항이나 요청사항을 입력하세요"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">첨부파일 링크</Label>
                <Input
                  id="attachments"
                  placeholder="구글 드라이브 링크 등"
                  value={formData.attachments}
                  onChange={(e) => handleChange('attachments', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 제출 버튼 */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                '제안서 요청'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
