"use client"

import { Bell, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession, signOut } from 'next-auth/react'

export function Header() {
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center px-6">
        <div className="ml-auto flex items-center space-x-4">
          {session?.user && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">{session.user.name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{session.user.department}</span>
            </div>
          )}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">알림</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="로그아웃">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">로그아웃</span>
          </Button>
        </div>
      </div>
    </header>
  )
}