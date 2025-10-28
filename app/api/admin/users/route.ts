import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import {
  getAllUsers,
  approveUser,
  rejectUser,
  deleteUser,
  updateUserRole,
} from '@/lib/users'

// 관리자 권한 확인
async function checkAdmin() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return false
  }

  return true
}

// 모든 사용자 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin()

    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const users = await getAllUsers()

    // 비밀번호 해시는 제거하고 반환
    const sanitizedUsers = users.map(user => ({
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role,
      status: user.status,
      approver: user.approver,
      approvedAt: user.approvedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: '사용자 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자 승인/거부/삭제/역할 변경 (PATCH)
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin()

    if (!isAdmin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email

    if (!adminEmail) {
      return NextResponse.json(
        { error: '인증 정보가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, action, role } = body

    if (!email || !action) {
      return NextResponse.json(
        { error: '이메일과 액션을 제공해주세요.' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'approve':
        await approveUser(email, adminEmail)
        return NextResponse.json({
          success: true,
          message: '사용자가 승인되었습니다.',
        })

      case 'reject':
        await rejectUser(email, adminEmail)
        return NextResponse.json({
          success: true,
          message: '사용자 가입이 거부되었습니다.',
        })

      case 'delete':
        await deleteUser(email)
        return NextResponse.json({
          success: true,
          message: '사용자가 삭제되었습니다.',
        })

      case 'updateRole':
        if (!role || !['admin', 'manager', 'staff'].includes(role)) {
          return NextResponse.json(
            { error: '올바른 역할을 제공해주세요.' },
            { status: 400 }
          )
        }
        await updateUserRole(email, role)
        return NextResponse.json({
          success: true,
          message: '사용자 역할이 변경되었습니다.',
        })

      default:
        return NextResponse.json(
          { error: '올바르지 않은 액션입니다.' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Error managing user:', error)
    return NextResponse.json(
      { error: error.message || '사용자 관리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
