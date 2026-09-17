/**
 * SocketContext.jsx
 * 
 * Provides a single persistent Socket.io connection for the entire app.
 * Connects when the user is logged in, disconnects on logout.
 * 
 * Usage:
 *   const { socket, onlineUsers, connected } = useSocket()
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function SocketProvider({ userId, children }) {
  const socketRef               = useRef(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  useEffect(() => {
    if (!userId) {
      // Not logged in — disconnect if somehow connected
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      setOnlineUsers(new Set())
      return
    }

    // Create socket connection (cookie-based auth)
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection:        true,
      reconnectionDelay:   1000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      console.log('[Socket] Connected:', socket.id)
    })

    socket.on('disconnect', () => {
      setConnected(false)
      console.log('[Socket] Disconnected')
    })

    // Online presence
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
  }, [userId])

  const emit = useCallback((event, data, ack) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit(event, data, ack)
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  const value = {
    socket:     socketRef.current,
    connected,
    onlineUsers,
    isOnline:   (uid) => onlineUsers.has(String(uid)),
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
