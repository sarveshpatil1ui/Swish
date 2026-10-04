import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Zap, Sun, Moon, User, LogOut, ArrowRight, Compass } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useSwish } from '../context/SwishContext'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'About', href: '#community' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const { currentUser, isAuthenticated, logout } = useSwish()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (href) => {
    setMobileOpen(false)
    if (href.startsWith('#')) {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleLogout = async () => {
    setMobileOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800/80 shadow-sm'
            : 'bg-white/70 dark:bg-gray-950/70 backdrop-blur-sm sm:bg-transparent border-b border-slate-200/40 dark:border-gray-800/40 sm:border-transparent'
        }`}
        role="banner"
      >
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0" aria-label="Swish Home">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-700 transition-colors shadow-sm">
                <Zap size={14} className="text-white fill-white" />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                Swish
              </span>
            </Link>

            {/* Desktop Nav (lg+) */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href)}
                  className="px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Desktop right actions (lg+) */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Theme toggle */}
              <button
                id="theme-toggle"
                onClick={toggle}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-150"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {dark ? (
                    <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Sun size={18} className="text-amber-400" />
                    </motion.span>
                  ) : (
                    <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon size={18} className="text-slate-600" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Account / Login button */}
              {isAuthenticated && currentUser ? (
                <Link
                  to="/home"
                  id="navbar-app"
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
                  >
                    {currentUser.initials || 'U'}
                  </div>
                  <span>Go to App</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  id="navbar-login"
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-150"
                >
                  Login
                </Link>
              )}

              <Link
                to="/college-onboarding"
                id="navbar-join"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Register Your College
              </Link>
            </div>

            {/* Mobile / Tablet right actions (375px+): Theme toggle + Account button + Menu toggle */}
            <div className="lg:hidden flex items-center gap-1.5">
              {/* Dark / Night Mode Toggle */}
              <button
                id="mobile-theme-toggle"
                onClick={toggle}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 active:scale-90 transition-all"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {dark ? (
                    <motion.span
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Sun size={18} className="text-amber-400" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Moon size={18} className="text-slate-600" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Account Button: User Avatar if logged in, or Account / Login button */}
              {isAuthenticated && currentUser ? (
                <Link
                  to="/home"
                  id="mobile-account-badge"
                  aria-label="Account app"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold active:scale-95 transition-transform"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
                  >
                    {currentUser.initials || 'U'}
                  </span>
                  <span>App</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  id="mobile-account-link"
                  aria-label="Account login"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold active:scale-95 transition-all shadow-sm"
                >
                  <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Account</span>
                </Link>
              )}

              {/* Hamburger Menu Toggle */}
              <button
                id="mobile-menu-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-x-3 top-18 z-50 bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 lg:hidden max-h-[85vh] overflow-y-auto"
              aria-label="Mobile navigation"
            >
              {/* Account section inside menu */}
              {isAuthenticated && currentUser ? (
                <div className="pb-3.5 mb-2 border-b border-slate-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
                    >
                      {currentUser.initials || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/home"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Compass size={14} />
                      <span>Open App</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 dark:border-gray-800 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pb-3 mb-2 border-b border-slate-100 dark:border-gray-800 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 rounded-xl font-semibold text-sm hover:border-indigo-500 transition-all shadow-sm"
                  >
                    <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Login to Account</span>
                  </Link>
                  <Link
                    to="/college-onboarding"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 text-white bg-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <span>Register Your College</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              {/* Theme Toggle row in drawer */}
              <div className="pb-2 mb-2 border-b border-slate-100 dark:border-gray-800">
                <button
                  onClick={toggle}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    {dark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
                    <span>Theme: {dark ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    Switch
                  </span>
                </button>
              </div>

              {/* Nav Links */}
              <div className="space-y-0.5">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-800 rounded-xl transition-all duration-150 font-medium text-sm"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
