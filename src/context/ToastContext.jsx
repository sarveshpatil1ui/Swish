import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

const typeConfig = {
  success: { icon: CheckCircle, bgClass: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800', iconClass: 'text-emerald-600 dark:text-emerald-400', textClass: 'text-emerald-800 dark:text-emerald-200' },
  error:   { icon: AlertCircle, bgClass: 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800', iconClass: 'text-red-600 dark:text-red-400', textClass: 'text-red-800 dark:text-red-200' },
  info:    { icon: Info,         bgClass: 'bg-brand-50 dark:bg-brand-950/80 border-brand-200 dark:border-brand-800', iconClass: 'text-brand-600 dark:text-brand-400', textClass: 'text-brand-800 dark:text-brand-200' },
  warning: { icon: AlertTriangle,bgClass: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800', iconClass: 'text-amber-600 dark:text-amber-400', textClass: 'text-amber-800 dark:text-amber-200' },
};

function ToastItem({ toast, onRemove }) {
  const cfg = typeConfig[toast.type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm min-w-[280px] max-w-sm animate-slide-up ${cfg.bgClass}`}
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <Icon size={18} className={`flex-shrink-0 ${cfg.iconClass}`} />
      <p className={`text-sm font-medium flex-1 ${cfg.textClass}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 ${cfg.iconClass} hover:opacity-70 transition-opacity`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[200] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
