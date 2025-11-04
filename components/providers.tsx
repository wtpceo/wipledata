'use client'

import { SessionProvider } from 'next-auth/react'
import { AutoLogout } from './auto-logout'
import { Toaster } from './ui/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AutoLogout />
      {children}
      <Toaster />
    </SessionProvider>
  )
}
