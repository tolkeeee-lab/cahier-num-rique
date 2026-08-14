'use client'

import React, { useState } from 'react'
import { Download, Trash2, ShieldAlert } from 'lucide-react'
import { SelectiveDataPurgeModal } from '@/components/settings/SelectiveDataPurgeModal'

interface DataExportBackupSettingsProps {
  shopId?: string
  onExportBackup?: () => void
  onResetData?: () => void
}

export const DataExportBackupSettings: React.FC<DataExportBackupSettingsProps> = ({
  shopId = 'default-shop',
  onExportBackup,
  onResetData,
}) => {
  const [showPurgeModal, setShowPurgeModal] = useState(false)

  return (
    <div className="bg-white/90 p-4 sm:p-5 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <Download className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Sauvegarde & Nettoyage des Données</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Exportation de sauvegarde */}
        {onExportBackup && (
          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-between p-3.5 sm:p-4 bg-amber-50/70 rounded-xl border border-amber-200 hover:border-amber-400 transition-colors text-left cursor-pointer shadow-2xs"
          >
            <div>
              <p className="text-xs font-extrabold text-gray-900">Sauvegarde Complète (JSON)</p>
              <p className="text-[11px] text-gray-600 font-mono">Exporter l'ensemble de votre cahier</p>
            </div>
            <Download className="w-5 h-5 text-amber-700" />
          </button>
        )}

        {/* Bouton de Suppression Sélective / Réinitialisation */}
        <button
          type="button"
          onClick={() => setShowPurgeModal(true)}
          className="flex items-center justify-between p-3.5 sm:p-4 bg-rose-50/90 rounded-xl border border-rose-200 hover:bg-rose-100/90 transition-colors text-left cursor-pointer shadow-2xs"
        >
          <div>
            <p className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-700" />
              <span>Supprimer / Réinitialiser des Données</span>
            </p>
            <p className="text-[11px] text-rose-700/80 font-mono">
              Effacer les ventes, dettes ou stock avec choix sélectif
            </p>
          </div>
          <Trash2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
        </button>
      </div>

      {/* Modale de suppression sélective */}
      <SelectiveDataPurgeModal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        shopId={shopId}
        onPurgeComplete={() => {
          setShowPurgeModal(false)
          if (onResetData) onResetData()
        }}
      />
    </div>
  )
}
