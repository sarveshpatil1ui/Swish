/**
 * SocketContext.jsx
 *
 * Single persistent Socket.io connection for the app.
 * 
 * KEY DESIGN DECISIONS:
 * - The socket instance lives in a ref (not state) so it never causes re-renders.
 * - `on` / `off` / `emit` are stable functions (no deps) that always read from the ref.
 * - `connected` and `onlineUsers` are the only pieces of React state.
 * - Listeners registered via `on()` must be cleaned up by the caller with `off()`.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function SocketProvider({ userId, children }) {
  const socketRef                   = useRef(null)
  const [connected,   setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  useEffect(() => {
    if (!userId) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      setOnlineUsers(new Set())
      return
    }

    // Always disconnect any stale socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    const socket = io(SOCKET_URL, {
      withCredentials:     true,
      transports:          ['websocket', 'polling'],
      reconnection:        true,
      reconnectionDelay:   1000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('[Socket] Disconnected:', reason)
    })

    // ── Presence ──────────────────────────────────────────────────────────────
    socket.on('online:list', (ids) => {
      setOnlineUsers(new Set(ids))
    })

    socket.on('user:online', ({ userId: uid }) => {
      setOnlineUsers(prev => new Set([...prev, uid]))
    })

    socket.on('user:offline', ({ userId: uid }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(uid)
        return next
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [userId])  // Only re-run when the logged-in user changes

  // ── Stable helpers — these never change identity, always read from the ref ──

  /**
   * Emit a socket event. Silently no-ops if not connected.
   */
  const emit = useCallback((event, data, ack) => {
    socketRef.current?.emit(event, data, ack)
  }, [])

  /**
   * Register a listener on the current socket.
   * Returns a cleanup function — ALWAYS call it in your useEffect return.
   *
   * IMPORTANT: Do NOT put `on` or `off` in your useEffect dependency array.
   * They are stable (no-op stable refs), so they will never cause re-runs.
   * If you put them in deps, your effect will re-run when the socket reconnects
   * and you will get duplicate listeners.
   */
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  const value = {
    connected,
    onlineUsers,
    isOnline: (uid) => onlineUsers.has(String(uid)),
    emit,
    on,
    off,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider')
  return ctx
}
