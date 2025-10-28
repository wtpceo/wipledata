import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import type { NextAuthConfig } from "next-auth"
import { z } from "zod"

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6)
          })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          return null
        }

        const { email, password } = parsedCredentials.data

        try {
          // Google Sheets에서 사용자 인증 - 동적 import 사용
          const { verifyUser } = await import('./users')
          const user = await verifyUser(email, password)

          if (!user) {
            return null
          }

          return {
            id: user.email,
            email: user.email,
            name: user.name,
            role: user.role.toUpperCase(),
            department: user.department
          }
        } catch (error: any) {
          console.error('Auth error:', error)
          // 에러 메시지를 NextAuth에 전달
          throw new Error(error.message || '로그인에 실패했습니다.')
        }
      }
    })
  ],
  callbacks: {
    authorized({ request: { nextUrl }, auth }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = !nextUrl.pathname.startsWith('/login')

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.department = token.department as string
      }
      return session
    }
  },
  session: {
    strategy: "jwt"
  },
  trustHost: true,
} satisfies NextAuthConfig

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)