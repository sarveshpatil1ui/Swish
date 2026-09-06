import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UserPlus, MessageSquare } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileTopBar from './MobileTopBar'
import { useSocket } from '../../context/SocketContext'

// ── Global in-app toast for real-time events ──────────────────────────────────
function GlobalToast({ toasts }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              t.type === 'follow' ? 'bg-indigo-100 dark:bg-indigo-950/60' : 'bg-violet-100 dark:bg-violet-950/60'
            }`}>
              {t.type === 'follow'
                ? <UserPlus size={17} className="text-indigo-600 dark:text-indigo-400" />
                : <MessageSquare size={17} className="text-violet-600 dark:text-violet-400" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{t.title}</p>
              <p className="text-slate-500 dark:text-gray-400 text-xs truncate">{t.body}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function AppLayout() {
  const { on, off } = useSocket()
  const [toasts, setToasts] = useState([])

  const addToast = (toast) => {
    const id = Date.now()
    setToasts(prev => [...prev.slice(-2), { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  useEffect(() => {
    // Someone followed you
    const onFollowReceived = ({ fromUserName }) => {
      addToast({
        type:  'follow',
        title: `${fromUserName} followed you`,
        body:  'Check out their profile',
      })
    }

    on('follow:received', onFollowReceived)
    return () => off('follow:received', onFollowReceived)
  }, [on, off])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Global real-time toasts */}
      <GlobalToast toasts={toasts} />

      {/* Mobile top bar — hidden on md+ (Sidebar handles navigation there) */}
      <MobileTopBar />

      <div className="flex max-w-screen-xl mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content — pb accounts for fixed bottom nav on mobile */}
        <main className="flex-1 min-w-0 pb-[70px] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
