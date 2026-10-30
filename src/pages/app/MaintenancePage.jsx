import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Wrench, Clock, RefreshCw, Shield, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MaintenancePage({ config, onCheckAgain }) {
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')

  const handleCheck = async () => {
    setChecking(true)
    setCheckMessage('')
    try {
      if (onCheckAgain) {
        await onCheckAgain()
      }
      setTimeout(() => {
        setCheckMessage('Systems are still under maintenance. Thank you for your patience!')
      }, 600)
    } catch {
      setCheckMessage('Unable to reach server. Please try again in a few moments.')
    } finally {
      setTimeout(() => {
        setChecking(false)
      }, 600)
    }
  }

  const note = config?.note || 'Swish is currently undergoing scheduled platform maintenance. We will be back online shortly!'
  const expectedBack = config?.expectedBack

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col justify-between p-4 sm:p-6 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            Swish
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Maintenance In Progress</span>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="max-w-xl w-full mx-auto my-auto py-12 text-center space-y-6">
        {/* Animated Icon Glow */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative inline-block mx-auto"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/10 mx-auto">
            <Wrench size={38} className="animate-spin-slow" />
          </div>
        </motion.div>

        {/* Heading */}
        <div className="space-y-2">
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            We're Tuning Up Swish
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Our engineering team is performing scheduled maintenance to upgrade system infrastructure and performance.
          </p>
        </div>

        {/* Admin Note Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900/90 border border-slate-200/90 dark:border-gray-800 rounded-2xl p-5 shadow-lg shadow-slate-200/40 dark:shadow-black/40 text-left space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
            <Shield size={14} className="text-indigo-500" />
            <span>Platform Announcement</span>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            "{note}"
          </p>

          {expectedBack && (
            <div className="pt-2 border-t border-slate-100 dark:border-gray-800/80 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Clock size={14} className="shrink-0" />
              <span>Estimated Return: {expectedBack}</span>
            </div>
          )}
        </motion.div>

        {/* Check Status Action */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/25 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Checking Status...' : 'Check If We Are Back'}</span>
          </button>

          {checkMessage && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-fade-in">
              {checkMessage}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pb-4 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-gray-500 border-t border-slate-200/60 dark:border-gray-800/60">
        <p>© {new Date().getFullYear()} Swish Campus Network · All rights reserved</p>

        <div className="flex items-center gap-4">
          <span className="hover:text-slate-600 dark:hover:text-gray-400 transition-colors">
            support@swish.network
          </span>
          <span className="text-slate-300 dark:text-gray-700">·</span>
          <Link
            to="/login?admin=true"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
          >
            <span>Administrator Access</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </footer>
    </div>
  )
}

