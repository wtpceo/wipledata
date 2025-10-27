"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Sale {
  id: string
  date: string
  department: string
  inputUser: string
  contractType: string
  clientName: string
  productName: string
  contractMonths: number
  monthlyAmount: number
  totalAmount: number
  salesPerson: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/sales')
      if (!response.ok) {
        throw new Error('Failed to fetch sales')
      }
      const data = await response.json()
      setSales(data.data)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportToExcel = () => {
    // 추후 구현
    alert('엑셀 내보내기 기능은 추후 구현 예정입니다.')
  }

  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">매출 조회</h2>
          <p className="text-muted-foreground">
            등록된 매출 내역을 조회하고 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            엑셀 내보내기
          </Button>
          <Link href="/sales/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              매출 입력
            </Button>
          </Link>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출 건수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매출액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 계약 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sales.length > 0 ? formatCurrency(Math.round(totalAmount / sales.length)) : '₩0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 매출 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>매출 목록</CardTitle>
          <CardDescription>
            최근 등록된 매출부터 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6">데이터를 불러오는 중...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              등록된 매출 데이터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-sm">날짜</th>
                    <th className="text-left p-2 font-medium text-sm">부서</th>
                    <th className="text-left p-2 font-medium text-sm">구분</th>
                    <th className="text-left p-2 font-medium text-sm">광고주</th>
                    <th className="text-left p-2 font-medium text-sm">상품</th>
                    <th className="text-right p-2 font-medium text-sm">계약개월</th>
                    <th className="text-right p-2 font-medium text-sm">월금액</th>
                    <th className="text-right p-2 font-medium text-sm">총금액</th>
                    <th className="text-left p-2 font-medium text-sm">영업담당</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">{formatDate(sale.date)}</td>
                      <td className="p-2 text-sm">{sale.department}</td>
                      <td className="p-2 text-sm">{sale.contractType}</td>
                      <td className="p-2 text-sm font-medium">{sale.clientName}</td>
                      <td className="p-2 text-sm">{sale.productName}</td>
                      <td className="p-2 text-sm text-right">{sale.contractMonths}개월</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(sale.monthlyAmount)}</td>
                      <td className="p-2 text-sm text-right font-medium">{formatCurrency(sale.totalAmount)}</td>
                      <td className="p-2 text-sm">{sale.salesPerson}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}