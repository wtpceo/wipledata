import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 인증이 필요없는 경로
  const publicPaths = ['/login', '/register', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // 세션 확인
  const sessionCookie = request.cookies.get('next-auth.session-token') ||
                       request.cookies.get('__Secure-next-auth.session-token')

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files and images
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
