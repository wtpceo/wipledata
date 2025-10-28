'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Trash2, Shield, AlertCircle } from 'lucide-react'

interface User {
  email: string
  name: string
  department: string
  role: 'admin' | 'manager' | 'staff'
  status: 'pending' | 'active' | 'rejected' | 'deleted'
  approver?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchUsers()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '사용자 목록을 불러오는데 실패했습니다.')
      }

      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (email: string, action: string, role?: string) => {
    try {
      setActionLoading(email)
      setError('')
      setSuccess('')

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, action, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '작업에 실패했습니다.')
      }

      setSuccess(data.message)
      await fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">승인 대기</Badge>
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">활성</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">거부됨</Badge>
      case 'deleted':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">삭제됨</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-purple-600">관리자</Badge>
      case 'manager':
        return <Badge variant="default" className="bg-blue-600">매니저</Badge>
      case 'staff':
        return <Badge variant="default" className="bg-gray-600">직원</Badge>
      default:
        return <Badge>{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pendingUsers = users.filter(u => u.status === 'pending')
  const activeUsers = users.filter(u => u.status === 'active')
  const otherUsers = users.filter(u => u.status !== 'pending' && u.status !== 'active')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">사용자 관리</h2>
        <p className="text-muted-foreground">
          사용자 승인, 역할 변경, 삭제 등을 관리합니다
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 승인 대기 중인 사용자 */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>승인 대기 중 ({pendingUsers.length})</CardTitle>
            <CardDescription>새로운 가입 신청을 검토하고 승인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>신청일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map(user => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => handleAction(user.email, 'approve')}
                        disabled={actionLoading === user.email}
                      >
                        {actionLoading === user.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            승인
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleAction(user.email, 'reject')}
                        disabled={actionLoading === user.email}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거부
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 활성 사용자 */}
      <Card>
        <CardHeader>
          <CardTitle>활성 사용자 ({activeUsers.length})</CardTitle>
          <CardDescription>현재 시스템을 사용 중인 사용자 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이메일</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>부서</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map(user => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(user.role)}
                      {user.email !== session?.user?.email && (
                        <Select
                          value={user.role}
                          onValueChange={(role) =>
                            handleAction(user.email, 'updateRole', role)
                          }
                          disabled={actionLoading === user.email}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">관리자</SelectItem>
                            <SelectItem value="manager">매니저</SelectItem>
                            <SelectItem value="staff">직원</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    {user.email !== session?.user?.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleAction(user.email, 'delete')}
                        disabled={actionLoading === user.email}
                      >
                        {actionLoading === user.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            삭제
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 기타 사용자 (거부됨, 삭제됨) */}
      {otherUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>기타 사용자 ({otherUsers.length})</CardTitle>
            <CardDescription>거부되거나 삭제된 사용자 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>처리일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherUsers.map(user => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {user.updatedAt
                        ? new Date(user.updatedAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
