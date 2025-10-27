import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export async function GET() {
  try {
    // AEPerformance 시트에서 C열(부서)과 D열(AE이름) 읽기
    const data = await readFromSheet('AEPerformance!C2:D')

    // 중복 제거하여 고유한 AE 목록 생성
    const aeMap = new Map<string, { name: string; department: string }>()

    data.forEach((row) => {
      const department = row[0]?.trim()
      const aeName = row[1]?.trim()

      if (department && aeName) {
        // AE 이름을 키로 사용하여 중복 제거
        aeMap.set(aeName, {
          name: aeName,
          department: department
        })
      }
    })

    // Map을 배열로 변환하고 이름순으로 정렬
    const aeList = Array.from(aeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    )

    return NextResponse.json({
      success: true,
      aeList
    })
  } catch (error) {
    console.error('Error fetching AE list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AE list' },
      { status: 500 }
    )
  }
}
