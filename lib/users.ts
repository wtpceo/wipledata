import { readFromSheet, writeToSheet, updateSheet } from './google-sheets'
import bcrypt from 'bcryptjs'

export interface User {
  timestamp: string
  email: string
  passwordHash: string
  name: string
  department: string
  role: 'admin' | 'manager' | 'staff'
  status: 'pending' | 'active' | 'rejected' | 'deleted'
  approver?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

// 사용자 생성 (회원가입)
export async function createUser(
  email: string,
  password: string,
  name: string,
  department: string
): Promise<User> {
  try {
    // 이메일 중복 확인
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      throw new Error('이미 등록된 이메일입니다.')
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10)

    const now = new Date().toISOString()
    const user: User = {
      timestamp: now,
      email,
      passwordHash,
      name,
      department,
      role: 'staff', // 기본 역할
      status: 'pending', // 승인 대기
      createdAt: now,
      updatedAt: now,
    }

    // Google Sheets에 저장
    await writeToSheet('Users!A:K', [
      [
        user.timestamp,
        user.email,
        user.passwordHash,
        user.name,
        user.department,
        user.role,
        user.status,
        user.approver || '',
        user.approvedAt || '',
        user.createdAt,
        user.updatedAt,
      ],
    ])

    return user
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// 이메일로 사용자 조회
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        return {
          timestamp: row[0],
          email: row[1],
          passwordHash: row[2],
          name: row[3],
          department: row[4],
          role: row[5] as 'admin' | 'manager' | 'staff',
          status: row[6] as 'pending' | 'active' | 'rejected' | 'deleted',
          approver: row[7] || undefined,
          approvedAt: row[8] || undefined,
          createdAt: row[9],
          updatedAt: row[10],
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error getting user by email:', error)
    throw error
  }
}

// 사용자 인증 (로그인)
export async function verifyUser(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const user = await getUserByEmail(email)

    if (!user) {
      return null
    }

    // 상태 확인
    if (user.status !== 'active') {
      throw new Error(
        user.status === 'pending'
          ? '승인 대기 중입니다. 관리자의 승인을 기다려주세요.'
          : user.status === 'rejected'
          ? '가입이 거부되었습니다. 관리자에게 문의하세요.'
          : '삭제된 계정입니다.'
      )
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error verifying user:', error)
    throw error
  }
}

// 모든 사용자 조회 (관리자용)
export async function getAllUsers(): Promise<User[]> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 헤더 제외
    const users: User[] = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1]) {
        // 이메일이 있는 행만
        users.push({
          timestamp: row[0],
          email: row[1],
          passwordHash: row[2],
          name: row[3],
          department: row[4],
          role: row[5] as 'admin' | 'manager' | 'staff',
          status: row[6] as 'pending' | 'active' | 'rejected' | 'deleted',
          approver: row[7] || undefined,
          approvedAt: row[8] || undefined,
          createdAt: row[9],
          updatedAt: row[10],
        })
      }
    }

    return users
  } catch (error) {
    console.error('Error getting all users:', error)
    throw error
  }
}

// 사용자 승인
export async function approveUser(
  email: string,
  approverEmail: string
): Promise<void> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 사용자 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        const now = new Date().toISOString()

        // 상태를 active로 변경
        row[6] = 'active'
        row[7] = approverEmail // 승인자
        row[8] = now // 승인일시
        row[10] = now // 수정일시

        // 업데이트
        await updateSheet(`Users!A${i + 1}:K${i + 1}`, [row])
        return
      }
    }

    throw new Error('사용자를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Error approving user:', error)
    throw error
  }
}

// 사용자 거부
export async function rejectUser(
  email: string,
  approverEmail: string
): Promise<void> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 사용자 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        const now = new Date().toISOString()

        // 상태를 rejected로 변경
        row[6] = 'rejected'
        row[7] = approverEmail // 승인자
        row[8] = now // 승인일시
        row[10] = now // 수정일시

        // 업데이트
        await updateSheet(`Users!A${i + 1}:K${i + 1}`, [row])
        return
      }
    }

    throw new Error('사용자를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Error rejecting user:', error)
    throw error
  }
}

// 사용자 삭제 (soft delete)
export async function deleteUser(email: string): Promise<void> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 사용자 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        const now = new Date().toISOString()

        // 상태를 deleted로 변경
        row[6] = 'deleted'
        row[10] = now // 수정일시

        // 업데이트
        await updateSheet(`Users!A${i + 1}:K${i + 1}`, [row])
        return
      }
    }

    throw new Error('사용자를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// 사용자 역할 변경
export async function updateUserRole(
  email: string,
  role: 'admin' | 'manager' | 'staff'
): Promise<void> {
  try {
    const data = await readFromSheet('Users!A:K')

    // 사용자 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        const now = new Date().toISOString()

        // 역할 변경
        row[5] = role
        row[10] = now // 수정일시

        // 업데이트
        await updateSheet(`Users!A${i + 1}:K${i + 1}`, [row])
        return
      }
    }

    throw new Error('사용자를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

// 비밀번호 변경
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    // 현재 비밀번호 확인
    const user = await verifyUser(email, currentPassword)
    if (!user) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.')
    }

    // 새 비밀번호 해시
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    const data = await readFromSheet('Users!A:K')

    // 사용자 찾기
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row[1] === email) {
        const now = new Date().toISOString()

        // 비밀번호 변경
        row[2] = newPasswordHash
        row[10] = now // 수정일시

        // 업데이트
        await updateSheet(`Users!A${i + 1}:K${i + 1}`, [row])
        return
      }
    }

    throw new Error('사용자를 찾을 수 없습니다.')
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}
