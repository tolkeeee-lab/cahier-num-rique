'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastNotificationProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 4500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const getStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-900/95 text-white border-emerald-700',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
        }
      case 'error':
        return {
          bg: 'bg-rose-900/95 text-white border-rose-700',
          icon: <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
        }
      case 'warning':
        return {
          bg: 'bg-amber-900/95 text-white border-amber-700',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
        }
      case 'info':
      default:
        return {
          bg: 'bg-gray-900/95 text-white border-gray-700',
          icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
        }
    }
  }

  const style = getStyle(toast.type)

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl flex items-start gap-3 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 ${style.bg}`}
    >
      {style.icon}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm leading-tight">{toast.title}</div>
        {toast.message && <div className="text-[11px] opacity-80 mt-0.5 leading-snug">{toast.message}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 opacity-60 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
