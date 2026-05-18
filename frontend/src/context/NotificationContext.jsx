import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../lib/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const socketRef = useRef(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data)
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    load()

    const socket = io(import.meta.env.VITE_API_URL, { path: '/socket.io' })
    socketRef.current = socket
    socket.emit('join-user', user.id)
    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev])
    })

    return () => {
      socket.emit('leave-user', user.id)
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
    } catch {}
  }

  const dismiss = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, dismiss, reload: load }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
