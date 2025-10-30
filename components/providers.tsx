'use client'

import { SessionProvider } from 'next-auth/react'
import { AutoLogout } from './auto-logout'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AutoLogout />
      {children}
    </SessionProvider>
  )
}
