'use client'

import React from 'react'
import { Download, AlertTriangle } from 'lucide-react'

interface DataExportBackupSettingsProps {
  onExportBackup?: () => void
  onResetData?: () => void
}

export const DataExportBackupSettings: React.FC<DataExportBackupSettingsProps> = ({
  onExportBackup,
  onResetData,
}) => {
  return (
    <div className="bg-white/90 p-5 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <Download className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Sauvegarde & Exportation des Données</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Exportation de sauvegarde */}
        {onExportBackup && (
          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-between p-4 bg-amber-50/70 rounded-xl border border-amber-200 hover:border-amber-400 transition-colors text-left cursor-pointer"
          >
            <div>
              <p className="text-xs font-extrabold text-gray-900">Sauvegarde Complète (JSON)</p>
              <p className="text-[11px] text-gray-600 font-mono">Exporter l'ensemble de votre cahier</p>
            </div>
            <Download className="w-5 h-5 text-amber-700" />
          </button>
        )}

        {/* Réinitialisation */}
        {onResetData && (
          <button
            type="button"
            onClick={onResetData}
            className="flex items-center justify-between p-4 bg-rose-50/80 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors text-left cursor-pointer"
          >
            <div>
              <p className="text-xs font-extrabold text-rose-800">Réinitialiser les données locales</p>
              <p className="text-[11px] text-rose-700 font-mono">Vider le cache IndexedDB / localStorage</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </button>
        )}
      </div>
    </div>
  )
}
