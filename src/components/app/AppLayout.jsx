import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileTopBar from './MobileTopBar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F7F6F4] dark:bg-base-950 transition-colors duration-300">
      {/* Mobile top bar — hidden on md+ (Sidebar handles navigation there) */}
      <MobileTopBar />

      <div className="flex max-w-screen-xl mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content — pb accounts for fixed bottom nav on mobile */}
        <main className="flex-1 min-w-0 pb-[70px] md:pb-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24" role="status" aria-label="Loading content">
                <div className="w-7 h-7 border-2 border-accent-100 dark:border-accent-900/40 border-t-accent-500 dark:border-t-accent-400 rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
