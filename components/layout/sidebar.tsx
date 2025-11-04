"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
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
  X,
  Wrench,
  Calendar,
  ExternalLink,
  Briefcase,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

const navigationConfig = [
  {
    title: '대시보드',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '전체 현황', href: '/', icon: LayoutDashboard },
      // { name: 'KPI 대시보드', href: '/kpi', icon: BarChart3 },
      { name: '영업 실적', href: '/sales-dashboard', icon: TrendingUp },
      { name: '담당자별 실적', href: '/staff-performance', icon: Users },
      { name: 'AE 실적 관리', href: '/ae-performance-v2', icon: Award },
      { name: 'AE별 종료 업체 관리', href: '/client-termination', icon: AlertTriangle },
      { name: '클라임 대시보드', href: '/claim-dashboard', icon: AlertCircle },
    ]
  },
  {
    title: '데이터 입력',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '매출 입력', href: '/sales/new', icon: DollarSign },
      { name: '제안서 요청', href: '/proposal-request', icon: FileText },
    ]
  },
  {
    title: '제안서 관리',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '제안서 목록', href: '/proposals', icon: FileText },
    ]
  },
  {
    title: '조직 정보',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '비상연락망', href: '/emergency-contacts', icon: Users },
    ]
  },
  {
    title: '외부 링크',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '회사 웹사이트', href: 'https://www.wiztheplanning.com', icon: ExternalLink, external: true },
      { name: 'Wiz Works', href: 'https://wizworks.vercel.app/', icon: Wrench, external: true },
      { name: '위플 포트폴리오', href: 'https://obsidian-quit-df6.notion.site/20938318fea6802e83b3c1d2add64777', icon: Briefcase, external: true },
    ]
  },
  {
    title: '경영관리',
    roles: ['ADMIN', 'MANAGER'], // 관리자, 매니저만
    items: [
      { name: '일자별 매출/매입', href: '/daily-summary', icon: Calendar },
      { name: '매출 조회', href: '/sales', icon: FileText },
      { name: '매입 조회', href: '/purchase', icon: FileText },
      { name: '운영비 조회', href: '/expenses', icon: FileText },
      { name: '광고주 관리', href: '/clients', icon: Database },
      { name: '고객 관계 조회', href: '/client-management', icon: Users },
    ]
  },
  {
    title: '성과 분석',
    roles: ['ADMIN', 'MANAGER'], // 관리자, 매니저만
    items: [
      { name: '목표 관리', href: '/goals', icon: Target },
      { name: '전체 수익성 분석', href: '/profitability', icon: TrendingUp },
      { name: '부서별 수익성', href: '/department-profitability', icon: BarChart3 },
    ]
  },
  {
    title: '자료실',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
    items: [
      { name: '문서 자료실', href: '/resources', icon: BookOpen },
      { name: '프로세스 가이드', href: '/guides', icon: FileText },
    ]
  },
  {
    title: '관리',
    roles: ['ADMIN'], // 관리자만
    items: [
      { name: '사용자 관리', href: '/admin/users', icon: Users },
    ]
  },
  {
    title: '설정',
    roles: ['ADMIN', 'MANAGER', 'STAFF'], // 모든 역할
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
  const { data: session } = useSession()
  const [expandedSections, setExpandedSections] = useState<string[]>(['대시보드'])

  // 사용자 역할에 따라 메뉴 필터링
  const userRole = session?.user?.role || 'STAFF'
  const navigation = navigationConfig.filter(section =>
    section.roles.includes(userRole)
  )

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

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
          {navigation.map((section) => {
            const isExpanded = expandedSections.includes(section.title)

            return (
              <div key={section.title} className="mb-2">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-2 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent/50 rounded-md transition-colors"
                >
                  <span>{section.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {section.items.map((item: any) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      const isExternal = item.external === true

                      if (isExternal) {
                        return (
                          <a
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ml-2"
                          >
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </a>
                        )
                      }

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ml-2 ${
                            isActive ? 'bg-accent' : ''
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </>
  )
}