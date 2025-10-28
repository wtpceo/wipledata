import { NextRequest, NextResponse } from 'next/server'
import { writeToSheet, readFromSheet } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientName,
      performanceMonth,
      aeNames,
      isReferral,
      result,
      renewalMonths,
      renewalAmount,
      failureReason,
      notes,
      timestamp
    } = body

    console.log('=== Manual AE Performance Save Request ===')
    console.log('Client:', clientName)
    console.log('Month:', performanceMonth)
    console.log('AE Names:', aeNames)
    console.log('Result:', result)

    // 검증
    if (!clientName || !performanceMonth || !aeNames || aeNames.length === 0 || !result) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Staff 탭에서 부서 정보 가져오기
    const staffData = await readFromSheet('Staff!A:D')
    const staffMap = new Map()

    if (staffData.length > 1) {
      const [headers, ...staffRows] = staffData
      staffRows.forEach(row => {
        const name = row[0] || ''
        const department = row[2] || ''
        if (name) {
          staffMap.set(name, department)
        }
      })
    }

    // 각 담당자별로 실적 데이터 생성
    const performanceData = aeNames.map((aeName: string) => {
      const department = staffMap.get(aeName) || '미지정'

      // 비고 필드 구성
      let fullNotes = notes || ''
      if (isReferral) {
        fullNotes = `[소개] ${fullNotes}`.trim()
      }

      return [
        timestamp, // A: 타임스탬프
        performanceMonth, // B: 실적 월
        department, // C: 부서
        aeName, // D: 담당자명
        1, // E: 총 광고주 (수동 입력은 1개)
        1, // F: 종료 예정 (수동 입력은 1개)
        result === 'renewed' ? 1 : 0, // G: 연장 성공
        result === 'failed' ? 1 : 0, // H: 연장 실패
        result === 'failed' ? failureReason : '', // I: 실패 사유
        result === 'renewed' ? renewalAmount : 0, // J: 연장 매출
        `${clientName} | ${fullNotes}` // K: 비고 (광고주명 + 메모)
      ]
    })

    console.log('Data to save:', performanceData.length, 'rows')

    // AEPerformance 탭에 저장
    await writeToSheet('AEPerformance!A:K', performanceData)

    console.log('✅ Manual AE Performance data saved successfully')

    return NextResponse.json({
      success: true,
      message: '수동 실적이 등록되었습니다.',
      count: performanceData.length
    })
  } catch (error) {
    console.error('❌ Error saving manual AE performance:', error)
    return NextResponse.json(
      {
        error: 'Failed to save manual AE performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
