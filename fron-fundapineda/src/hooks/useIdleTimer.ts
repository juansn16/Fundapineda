import { useEffect, useRef, useCallback } from 'react'
import { authService } from '../lib/auth'
import { isTokenExpiringSoon } from '../lib/tokenUtils'

interface UseIdleTimerOptions {
  idleTimeout?: number      // Default: 1 hour (3600000 ms)
  checkInterval?: number    // Check every 5 min (300000 ms)
  onIdle: () => void
  isAuthenticated: boolean
}

export function useIdleTimer({
  idleTimeout = 60 * 60 * 1000,   // 1 hour
  checkInterval = 5 * 60 * 1000, // 5 minutes
  onIdle,
  isAuthenticated
}: UseIdleTimerOptions) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isRefreshingRef = useRef(false)
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset idle timer on activity
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    if (isAuthenticated) {
      idleTimerRef.current = setTimeout(() => {
        console.log('User idle for 1 hour, logging out...')
        onIdle()
      }, idleTimeout)
    }
  }, [idleTimeout, isAuthenticated, onIdle])

  // Check if token needs refresh (call when user is active)
  const checkAndRefreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return
    
    try {
      isRefreshingRef.current = true
      const accessToken = localStorage.getItem('access_token')
      
      if (accessToken && isTokenExpiringSoon(accessToken, 300)) {
        console.log('Token expiring soon, refreshing...')
        await authService.refreshToken()
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      onIdle()  // Force logout on refresh failure
    } finally {
      isRefreshingRef.current = false
    }
  }, [onIdle])

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    resetIdleTimer()
    
    // Check token refresh when user is active
    checkAndRefreshToken()
  }, [resetIdleTimer, checkAndRefreshToken])

  useEffect(() => {
    if (!isAuthenticated) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      return
    }

    // Events to track
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart']
    
    // Initialize timer
    resetIdleTimer()
    
    // Set up periodic token check (every 5 minutes)
    checkIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      // If user was active in the last check interval, check token
      if (timeSinceActivity < checkInterval) {
        checkAndRefreshToken()
      }
    }, checkInterval)
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })
    
    // Cleanup
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, resetIdleTimer, handleActivity, checkAndRefreshToken, checkInterval])

  return null
}
