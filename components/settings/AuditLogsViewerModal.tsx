'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  ShieldAlert, 
  X, 
  RefreshCw, 
  RotateCcw, 
  Trash2, 
  Coins, 
  Package, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Search 
} from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface AuditLog {
  id: string
  shop_id: string
  user_id?: string
  user_email?: string
  action: string
  target_id?: string
  details?: Record<string, any>
  created_at: string
}

interface AuditLogsViewerModalProps {
  isOpen: boolean
  onClose: () => void
  shopId: string
  shopName?: string
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  sale_crossed_out: {
    label: 'Vente biffée',
    icon: RotateCcw,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  sale_returned: {
    label: 'Retour marchandise',
    icon: RotateCcw,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  sale_deleted: {
    label: 'Vente supprimée',
    icon: Trash2,
    color: 'text-red-600 bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-900 border-red-200',
  },
  cash_closing: {
    label: 'Clôture Z',
    icon: Coins,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  stock_adjusted: {
    label: 'Ajustement stock',
    icon: Package,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  price_updated: {
    label: 'Modification prix',
    icon: Tag,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
  },
}

function formatAuditDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function AuditLogsViewerModal({
  isOpen,
  onClose,
  shopId,
  shopName = 'Ma Boutique',
}: AuditLogsViewerModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!shopId) return
    setLoading(true)
    try {
      const url = `/api/audit-logs?shop_id=${encodeURIComponent(shopId)}${
        filterAction !== 'all' ? `&action=${encodeURIComponent(filterAction)}` : ''
      }`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && Array.isArray(data.logs)) {
        setLogs(data.logs)
      }
    } catch (err) {
      console.error('[AuditLogsViewer] Erreur fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [shopId, filterAction])

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, fetchLogs])

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const q = searchQuery.toLowerCase()
    return logs.filter((log) => {
      const email = log.user_email?.toLowerCase() || ''
      const actionLabel = ACTION_CONFIG[log.action]?.label?.toLowerCase() || log.action.toLowerCase()
      const detailsStr = JSON.stringify(log.details || {}).toLowerCase()
      return email.includes(q) || actionLabel.includes(q) || detailsStr.includes(q)
    })
  }, [logs, searchQuery])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Journal d'Audit Anti-Fraude
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Traçabilité des actions sensibles et conformité pour {shopName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              title="Rafraîchir les logs"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-[0.97] transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre de filtres & recherche */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par employé, article, action..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterAction('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                filterAction === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('sale_crossed_out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                filterAction === 'sale_crossed_out'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Biffages
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('sale_returned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                filterAction === 'sale_returned'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Retours
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('cash_closing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
                filterAction === 'cash_closing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Clôtures Z
            </button>
          </div>
        </div>

        {/* Liste des logs */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              <span>Chargement du journal d'audit...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Aucune action enregistrée pour ces critères.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] || {
                label: log.action,
                icon: ShieldAlert,
                color: 'text-slate-600 bg-slate-50 border-slate-200',
                badge: 'bg-slate-100 text-slate-900 border-slate-200',
              }
              const IconComp = cfg.icon
              const isExpanded = expandedLogId === log.id

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${cfg.color}`}>
                        <IconComp className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {formatAuditDate(log.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{log.user_email || 'Utilisateur local'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Résumé textuel concis */}
                  {log.details && (
                    <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-150">
                      {log.action === 'sale_returned' && (
                        <div className="space-y-1">
                          <div className="font-semibold text-rose-700">
                            Montant remboursé : {formatPrice(log.details.totalRefundAmount || 0)} ({log.details.refundMode === 'cash' ? 'Espèces' : 'Avoir'})
                          </div>
                          {log.details.reason && (
                            <div className="text-slate-500">Motif : {log.details.reason}</div>
                          )}
                        </div>
                      )}
                      {log.action === 'sale_crossed_out' && (
                        <div className="font-semibold text-amber-800">
                          Vente n° {log.target_id?.slice(0, 8)} annulée/biffée
                        </div>
                      )}
                      {log.action === 'cash_closing' && (
                        <div className="space-y-0.5">
                          <div>Caisse réelle : <span className="font-mono font-bold">{formatPrice(log.details.actual_cash || 0)}</span></div>
                          <div className={log.details.difference < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                            Écart constaté : {formatPrice(log.details.difference || 0)}
                          </div>
                        </div>
                      )}

                      {/* Vue détaillée JSON si dépliée */}
                      {isExpanded && (
                        <pre className="mt-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
