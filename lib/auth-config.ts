import { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

export const authOptions: NextAuthOptions = {
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
          // Google Sheets에서 사용자 인증
          const { verifyUser } = await import('@/lib/users')
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
          throw new Error(error.message || '로그인에 실패했습니다.')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.department = token.department as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt"
  },
}
