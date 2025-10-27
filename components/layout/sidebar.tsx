"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Database,
  TrendingUp,
  Settings,
  Users,
  DollarSign,
  ShoppingCart,
  Receipt,
  Target,
  BarChart3,
  BookOpen,
  Award,
  AlertTriangle,
  X
} from 'lucide-react'

const navigation = [
  {
    title: '대시보드',
    items: [
      { name: '전체 현황', href: '/', icon: LayoutDashboard },
      { name: 'KPI 대시보드', href: '/kpi', icon: BarChart3 },
      { name: '영업 실적', href: '/sales-dashboard', icon: TrendingUp },
      { name: '담당자별 실적', href: '/staff-performance', icon: Users },
      { name: 'AE 실적', href: '/ae-performance', icon: Award },
      { name: 'AE별 종료 업체 관리', href: '/client-termination', icon: AlertTriangle },
    ]
  },
  {
    title: '데이터 입력',
    items: [
      { name: '매출 입력', href: '/sales/new', icon: DollarSign },
      { name: 'AE 실적 입력', href: '/ae-performance/new', icon: Award },
    ]
  },
  {
    title: '경영관리',
    items: [
      { name: '매출 조회', href: '/sales', icon: FileText },
      { name: '매입 조회', href: '/purchase', icon: FileText },
      { name: '운영비 조회', href: '/expenses', icon: FileText },
      { name: '광고주 관리', href: '/clients', icon: Database },
      { name: '고객 관계 조회', href: '/client-management', icon: Users },
    ]
  },
  {
    title: '성과 분석',
    items: [
      { name: '목표 관리', href: '/goals', icon: Target },
      { name: '전체 수익성 분석', href: '/profitability', icon: TrendingUp },
      { name: '부서별 수익성', href: '/department-profitability', icon: BarChart3 },
    ]
  },
  {
    title: '자료실',
    items: [
      { name: '문서 자료실', href: '/resources', icon: BookOpen },
      { name: '프로세스 가이드', href: '/guides', icon: FileText },
    ]
  },
  {
    title: '설정',
    items: [
      { name: '내 정보', href: '/settings', icon: Settings },
    ]
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-card border-r h-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <div className="flex items-center justify-between p-6 lg:block">
          <h2 className="text-2xl font-bold">WTP Dashboard</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-accent rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 88px)' }}>
          {navigation.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                        isActive ? 'bg-accent' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}