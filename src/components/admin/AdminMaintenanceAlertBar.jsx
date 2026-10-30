import React from 'react'
import { Wrench, Power, ArrowRight } from 'lucide-react'

export default function AdminMaintenanceAlertBar({ config, onTurnOff, onConfigure }) {
  if (!config?.enabled) return null

  return (
    <aside
      aria-label="Platform Maintenance Mode Announcement"
      className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs font-semibold"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="p-1 rounded-md bg-amber-600/30 text-slate-950 shrink-0">
          <Wrench size={14} className="animate-pulse" />
        </span>
        <span className="truncate">
          <strong className="uppercase tracking-wider font-extrabold mr-1.5">Maintenance Mode Active:</strong>
          Regular students and faculty are seeing the maintenance page. Administrator bypass is active.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onConfigure && (
          <button
            type="button"
            onClick={onConfigure}
            className="px-2.5 py-1 bg-amber-600/40 hover:bg-amber-600/60 text-slate-950 rounded-lg transition-colors cursor-pointer text-xs font-bold"
          >
            Configure Note
          </button>
        )}
        {onTurnOff && (
          <button
            type="button"
            onClick={onTurnOff}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 rounded-lg transition-colors cursor-pointer text-xs font-bold shadow-xs"
          >
            <Power size={12} />
            <span>Turn Off</span>
          </button>
        )}
      </div>
    </aside>
  )
}

