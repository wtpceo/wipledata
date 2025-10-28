"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Phone, Mail, User, Building2 } from 'lucide-react'

export default function EmergencyContactsPage() {
  // 임시 데이터 - 나중에 Google Sheets나 API로 연동 가능
  const contacts = [
    {
      name: '홍길동',
      position: '대표이사',
      department: '경영지원팀',
      phone: '010-1234-5678',
      email: 'ceo@wiztheplanning.com',
      extension: '101'
    },
    {
      name: '김영희',
      position: '팀장',
      department: '마케팅팀',
      phone: '010-2345-6789',
      email: 'kim@wiztheplanning.com',
      extension: '201'
    },
    {
      name: '이철수',
      position: '과장',
      department: '영업팀',
      phone: '010-3456-7890',
      email: 'lee@wiztheplanning.com',
      extension: '301'
    },
  ]

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
