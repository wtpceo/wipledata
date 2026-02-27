'use client'

import { useEffect, useCallback, useRef } from 'react'

const CHECK_INTERVAL = 30000 // 30초

export function useSmartRefresh(fetchData: () => Promise<void> | void) {
  const lastKnownModified = useRef<string | null>(null)
  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const checkForUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/last-modified')
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

    const interval = setInterval(checkForUpdates, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [checkForUpdates])
}
