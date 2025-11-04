import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet, updateSheet } from '@/lib/google-sheets'

// 제안서 요청 목록 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 상태 필터
    const requester = searchParams.get('requester') // 요청자 필터

    // 제안서요청 시트에서 데이터 읽기 (헤더 제외)
    const data = await readFromSheet('제안서요청!A2:V')

    // 데이터 파싱
    const proposals = data.map((row, index) => ({
      rowIndex: index + 2, // 실제 시트 행 번호 (헤더 포함)
      timestamp: row[0] || '',
      requester: row[1] || '',
      department: row[2] || '',
      clientName: row[3] || '',
      contactName: row[4] || '',
      phone: row[5] || '',
      email: row[6] || '',
      industry: row[7] || '',
      proposalType: row[8] || '',
      adPlatform: row[9] || '',
      desiredProduct: row[10] || '',
      budgetRange: row[11] || '',
      contractPeriod: row[12] || '',
      adGoal: row[13] || '',
      desiredDate: row[14] || '',
      urgency: row[15] || '',
      notes: row[16] || '',
      attachments: row[17] || '',
      status: row[18] || '요청됨',
      assignedTo: row[19] || '',
      completedDate: row[20] || '',
      proposalLink: row[21] || ''
    }))

    // 필터링
    let filteredProposals = proposals

    if (status) {
      filteredProposals = filteredProposals.filter(p => p.status === status)
    }

    if (requester) {
      filteredProposals = filteredProposals.filter(p => p.requester === requester)
    }

    // 최신순 정렬 (타임스탬프 기준)
    filteredProposals.sort((a, b) => {
      const dateA = new Date(a.timestamp)
      const dateB = new Date(b.timestamp)
      return dateB.getTime() - dateA.getTime()
    })

    // 상태별 통계
    const stats = {
      total: proposals.length,
      requested: proposals.filter(p => p.status === '요청됨').length,
      reviewing: proposals.filter(p => p.status === '검토중').length,
      inProgress: proposals.filter(p => p.status === '작성중').length,
      completed: proposals.filter(p => p.status === '완료').length,
      onHold: proposals.filter(p => p.status === '보류').length
    }

    return NextResponse.json({
      proposals: filteredProposals,
      stats
    })
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    )
  }
}

// 제안서 요청 등록 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('=== 제안서 요청 등록 ===')
    console.log('Request body:', body)

    const {
      requester,
      department,
      clientName,
      contactName,
      phone,
      email,
      industry,
      proposalType,
      adPlatform, // 배열 또는 쉼표로 구분된 문자열
      desiredProduct, // 배열 또는 쉼표로 구분된 문자열
      budgetRange,
      contractPeriod,
      adGoal,
      desiredDate,
      urgency,
      notes,
      attachments
    } = body

    // 필수 필드 검증
    if (!requester || !clientName || !contactName || !email) {
      return NextResponse.json(
        { error: '필수 필드를 모두 입력해주세요 (요청자, 광고주명, 담당자명, 이메일)' },
        { status: 400 }
      )
    }

    // 배열을 쉼표로 구분된 문자열로 변환
    const adPlatformStr = Array.isArray(adPlatform) ? adPlatform.join(', ') : adPlatform
    const desiredProductStr = Array.isArray(desiredProduct) ? desiredProduct.join(', ') : desiredProduct

    // 타임스탬프 생성
    const timestamp = new Date().toISOString()

    // Google Sheets에 저장할 데이터 준비
    const rowData = [
      timestamp,
      requester,
      department || '',
      clientName,
      contactName,
      phone || '',
      email,
      industry || '',
      proposalType || '',
      adPlatformStr || '',
      desiredProductStr || '',
      budgetRange || '',
      contractPeriod || '',
      adGoal || '',
      desiredDate || '',
      urgency || '보통',
      notes || '',
      attachments || '',
      '요청됨', // 초기 상태
      '', // 배정 담당자 (빈 값)
      '', // 완료일 (빈 값)
      '' // 제안서 링크 (빈 값)
    ]

    console.log('저장할 데이터:', rowData)

    // Google Sheets에 데이터 저장
    await writeToSheet('제안서요청!A:V', [rowData])

    console.log('✅ 제안서 요청이 등록되었습니다')

    return NextResponse.json({
      success: true,
      message: '제안서 요청이 등록되었습니다.',
      timestamp
    })
  } catch (error) {
    console.error('❌ Error creating proposal request:', error)
    return NextResponse.json(
      {
        error: 'Failed to create proposal request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 제안서 상태 업데이트 (PATCH)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { rowIndex, status, assignedTo, completedDate, proposalLink } = body

    console.log('=== 제안서 상태 업데이트 ===')
    console.log('Row:', rowIndex, 'Status:', status)

    if (!rowIndex) {
      return NextResponse.json(
        { error: 'rowIndex는 필수입니다' },
        { status: 400 }
      )
    }

    // 현재 데이터 읽기
    const data = await readFromSheet(`제안서요청!A${rowIndex}:V${rowIndex}`)

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '해당 제안서 요청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const currentRow = data[0]

    // 업데이트할 데이터 (기존 데이터 유지하면서 특정 필드만 업데이트)
    const updatedRow = [
      currentRow[0], // 타임스탬프
      currentRow[1], // 요청자
      currentRow[2], // 요청 부서
      currentRow[3], // 광고주명
      currentRow[4], // 담당자명
      currentRow[5], // 연락처
      currentRow[6], // 이메일
      currentRow[7], // 업종
      currentRow[8], // 제안 유형
      currentRow[9], // 광고 매체
      currentRow[10], // 희망 상품
      currentRow[11], // 예산 범위
      currentRow[12], // 계약 기간
      currentRow[13], // 광고 목표
      currentRow[14], // 제안 희망일
      currentRow[15], // 시급도
      currentRow[16], // 특이사항
      currentRow[17], // 첨부파일
      status !== undefined ? status : currentRow[18], // 상태
      assignedTo !== undefined ? assignedTo : currentRow[19], // 배정 담당자
      completedDate !== undefined ? completedDate : currentRow[20], // 완료일
      proposalLink !== undefined ? proposalLink : currentRow[21] // 제안서 링크
    ]

    // Google Sheets 업데이트
    await updateSheet(`제안서요청!A${rowIndex}:V${rowIndex}`, [updatedRow])

    console.log('✅ 제안서 상태가 업데이트되었습니다')

    return NextResponse.json({
      success: true,
      message: '제안서 상태가 업데이트되었습니다.'
    })
  } catch (error) {
    console.error('❌ Error updating proposal:', error)
    return NextResponse.json(
      {
        error: 'Failed to update proposal',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
