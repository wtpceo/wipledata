'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000 // 8시간 (밀리초)

export function AutoLogout() {
  const { data: session } = useSession()
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // 로그인되어 있지 않으면 아무것도 하지 않음
    if (!session) {
      return
    }

    // 타이머 초기화 함수
    const resetTimer = () => {
      // 기존 타이머 제거
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 새 타이머 설정
      timeoutRef.current = setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, INACTIVITY_TIMEOUT)
    }

    // 사용자 활동 감지 이벤트들
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // 모든 이벤트에 리스너 등록
    events.forEach((event) => {
      document.addEventListener(event, resetTimer)
    })

    // 초기 타이머 시작
    resetTimer()

    // 클린업: 컴포넌트 언마운트 시 타이머와 이벤트 리스너 제거
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [session])

  return null // UI 없음
}
