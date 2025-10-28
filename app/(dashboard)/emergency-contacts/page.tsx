"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Phone, Mail, User, Building2, Loader2, Users } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface StaffMember {
  name: string
  position: string
  department: string
  phone: string
  extension: string
  email: string
}

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStaff() {
      try {
        const response = await fetch('/api/staff')
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.')
        }
        const data = await response.json()
        setContacts(data.staff || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [])

  // 부서별 통계 계산
  const departmentStats = useMemo(() => {
    const stats: { [key: string]: number } = {}
    contacts.forEach(contact => {
      const dept = contact.department || '미지정'
      stats[dept] = (stats[dept] || 0) + 1
    })
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [contacts])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">비상연락망</h1>
        <p className="text-muted-foreground mt-2">
          사원 비상연락처 및 인적사항
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사원 연락처</CardTitle>
          <CardDescription>
            긴급 상황 시 참고할 수 있는 직원 연락처 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 직원 정보가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>직급</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>휴대전화</TableHead>
                    <TableHead>내선번호</TableHead>
                    <TableHead>이메일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {contact.name}
                      </div>
                    </TableCell>
                    <TableCell>{contact.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {contact.department}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </a>
                    </TableCell>
                    <TableCell>{contact.extension}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </a>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 부서별 인원 통계 */}
      {!loading && !error && contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              부서별 인원 현황
            </CardTitle>
            <CardDescription>
              부서별 재직 인원 통계
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {departmentStats.map((dept) => (
                <div
                  key={dept.name}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {dept.name}
                      </div>
                      <div className="text-2xl font-bold mt-1">
                        {dept.count}명
                      </div>
                    </div>
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </div>
              ))}
              <div className="p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      전체 인원
                    </div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                      {contacts.length}명
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-primary/50" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 조직도 */}
      {!loading && !error && contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>조직도</CardTitle>
            <CardDescription>
              부서별 구성원 목록
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {departmentStats.map((dept) => {
                const deptMembers = contacts.filter(
                  (c) => (c.department || '미지정') === dept.name
                )
                return (
                  <div key={dept.name}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {dept.name} ({dept.count}명)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deptMembers.map((member, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.position}
                              </div>
                              {member.extension && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  내선: {member.extension}
                                </div>
                              )}
                            </div>
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>비상 연락처</CardTitle>
          <CardDescription>
            회사 대표 전화 및 비상 연락처
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">대표 전화</div>
                <a href="tel:1670-0704" className="text-blue-600 hover:underline">
                  1670-0704
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">대표 이메일</div>
                <a href="mailto:wiz@wiztheplanning.com" className="text-blue-600 hover:underline">
                  wiz@wiztheplanning.com
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
