'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { WizWorksBanner } from '@/components/layout/wiz-works-banner'
import { ReviewManagementBanner } from '@/components/layout/review-management-banner'
import { useState } from 'react'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <WizWorksBanner />
        <ReviewManagementBanner />
        <Header />

        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90"
        >
          <Menu className="h-6 w-6" />
        </button>

        <main className="flex-1 overflow-x-auto overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}