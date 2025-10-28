import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/users'
import { z } from 'zod'

// 회원가입 요청 스키마
const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  confirmPassword: z.string(),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  department: z.string().min(2, '부서는 최소 2자 이상이어야 합니다.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 유효성 검사
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }))

      return NextResponse.json(
        { error: '입력값을 확인해주세요.', errors },
        { status: 400 }
      )
    }

    const { email, password, name, department } = validationResult.data

    // 사용자 생성 (pending 상태로)
    await createUser(email, password, name, department)

    return NextResponse.json({
      success: true,
      message: '가입 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.',
    })
  } catch (error: any) {
    console.error('Registration error:', error)

    // 중복 이메일 에러 처리
    if (error.message?.includes('이미 등록된 이메일')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
