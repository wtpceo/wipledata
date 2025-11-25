"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Loader2, DollarSign, Briefcase } from 'lucide-react'

interface SalaryRecord {
  id: string
  no: string
  name: string
  joinDate: string
  position: string
  monthlySalary: number
  annualSalary: number
}

interface PositionStats {
  [key: string]: { count: number; totalMonthlySalary: number }
}

export default function SalaryPage() {
  const [data, setData] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ totalMonthlySalary: 0, totalAnnualSalary: 0 })
  const [positionStats, setPositionStats] = useState<PositionStats>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/salary')
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.')
      }
      const result = await response.json()
      setData(result.data || [])
      setSummary(result.summary || { totalMonthlySalary: 0, totalAnnualSalary: 0 })
      setPositionStats(result.positionStats || {})
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">직원 급여 테이블</h1>
        <p className="text-muted-foreground mt-2">
          직원별 급여 정보를 조회합니다
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 직원 수</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.length}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">월 급여 총액</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalMonthlySalary)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연봉 총액</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.totalAnnualSalary)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 직위별 통계 */}
      {Object.keys(positionStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">직위별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Object.entries(positionStats)
                .sort((a, b) => b[1].totalMonthlySalary - a[1].totalMonthlySalary)
                .map(([position, stats]) => (
                  <div key={position} className="p-4 border rounded-lg">
                    <div className="font-medium text-lg">{position}</div>
                    <div className="text-sm text-muted-foreground">{stats.count}명</div>
                    <div className="text-sm font-semibold text-green-600 mt-1">
                      {formatCurrency(stats.totalMonthlySalary)}/월
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>급여 상세 정보</CardTitle>
          <CardDescription>
            직원별 급여 현황입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              데이터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No.</TableHead>
                    <TableHead>성함</TableHead>
                    <TableHead>입사일</TableHead>
                    <TableHead>직위</TableHead>
                    <TableHead className="text-right">월급</TableHead>
                    <TableHead className="text-right">연봉</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.joinDate}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          row.position === '대표' ? 'bg-red-100 text-red-800' :
                          row.position === '본부장' ? 'bg-purple-100 text-purple-800' :
                          row.position === '팀장' ? 'bg-blue-100 text-blue-800' :
                          row.position === '매니저' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.position}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(row.monthlySalary)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-purple-600">
                        {formatCurrency(row.annualSalary)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
