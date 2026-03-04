'use client'

import { useEffect, useCallback, useRef } from 'react'

const CHECK_INTERVAL = 30000 // 30초: last-modified 비교
const FORCE_REFRESH_INTERVAL = 60000 // 60초: 강제 새로고침 (안전망)
const CHANNEL_NAME = 'wipledata-refresh'

// 같은 브라우저의 다른 탭에 새로고침 신호 발송
export function notifyDataChanged() {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    bc.postMessage({ type: 'data-changed', time: Date.now() })
    bc.close()
  } catch {}
}

export function useSmartRefresh(fetchData: () => Promise<void> | void) {
  const lastKnownModified = useRef<string | null>(null)
  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const checkForUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/last-modified', { cache: 'no-store' })
      const { modifiedTime } = await res.json()

      if (lastKnownModified.current === null) {
        lastKnownModified.current = modifiedTime
        return
      }

      if (modifiedTime !== lastKnownModified.current) {
        lastKnownModified.current = modifiedTime
        await fetchDataRef.current()
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }, [])

  useEffect(() => {
    fetchDataRef.current()
    checkForUpdates()

    const checkInterval = setInterval(checkForUpdates, CHECK_INTERVAL)

    // 안전망: 60초마다 무조건 전체 데이터 새로고침
    const forceInterval = setInterval(() => {
      fetchDataRef.current()
    }, FORCE_REFRESH_INTERVAL)

    // BroadcastChannel: 같은 브라우저 내 다른 탭에서 데이터 변경 시 즉시 새로고침
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(CHANNEL_NAME)
      bc.onmessage = () => {
        fetchDataRef.current()
      }
    } catch {}

    return () => {
      clearInterval(checkInterval)
      clearInterval(forceInterval)
      bc?.close()
    }
  }, [checkForUpdates])
}
