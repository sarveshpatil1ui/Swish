import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="flex max-w-screen-xl mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
