"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Phone, Mail, User, Building2, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

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
                <a href="tel:02-1234-5678" className="text-blue-600 hover:underline">
                  02-1234-5678
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">대표 이메일</div>
                <a href="mailto:info@wiztheplanning.com" className="text-blue-600 hover:underline">
                  info@wiztheplanning.com
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
