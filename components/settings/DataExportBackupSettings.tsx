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
    <div className="bg-[#1e1a18] p-5 rounded-2xl border border-gray-800 space-y-4 shadow-md">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <Download className="w-5 h-5 text-amber-400" />
        <h4 className="text-sm font-extrabold text-white">Sauvegarde & Exportation des Données</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Exportation de sauvegarde */}
        {onExportBackup && (
          <button
            onClick={onExportBackup}
            className="flex items-center justify-between p-4 bg-[#141210] rounded-xl border border-gray-800 hover:border-amber-500/40 transition-colors text-left"
          >
            <div>
              <p className="text-xs font-bold text-white">Sauvegarde Complète (JSON)</p>
              <p className="text-[11px] text-gray-400 font-mono">Exporter l'ensemble de votre cahier</p>
            </div>
            <Download className="w-5 h-5 text-amber-400" />
          </button>
        )}

        {/* Réinitialisation */}
        {onResetData && (
          <button
            onClick={onResetData}
            className="flex items-center justify-between p-4 bg-red-950/20 rounded-xl border border-red-800/40 hover:bg-red-950/40 transition-colors text-left"
          >
            <div>
              <p className="text-xs font-bold text-red-400">Réinitialiser les données locales</p>
              <p className="text-[11px] text-red-300/60 font-mono">Vider le cache IndexedDB / localStorage</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>
    </div>
  )
}
