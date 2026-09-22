import React, { useState } from 'react'
import { Shield, ShieldAlert } from 'lucide-react'
import { ShopProfileSettings } from '@/components/settings/ShopProfileSettings'
import { EmployeeRoleManager } from '@/components/settings/EmployeeRoleManager'
import { DataExportBackupSettings } from '@/components/settings/DataExportBackupSettings'
import { AuditLogsViewerModal } from '@/components/settings/AuditLogsViewerModal'
import { isSuperAdmin, isEmployeeRole } from '@/lib/roleUtils'

interface Employee {
  id: string
  name: string
  role: 'admin' | 'employee'
  email?: string
}

export interface SettingsManagerProps {
  shopId?: string
  shopName?: string
  activity?: string
  phone?: string
  address?: string
  country?: string
  city?: string
  userEmail?: string
  userRole?: string | null
  userShops?: any[]
  employees?: Employee[]
  onSaveProfile?: (data: { shopName: string; activity: string; phone: string; address: string; country: string; city: string }) => Promise<void>
  onUpdateShopActivity?: (shopId: string, activity: string) => void
  onInviteEmployee?: (name: string, email: string, role: string) => Promise<any>
  onRemoveEmployee?: (id: string) => Promise<void>
  onExportBackup?: () => void
  onResetData?: () => void
}

export function SettingsManager({
  shopId = 'default-shop',
  shopName = 'Ma Boutique',
  activity = 'Commerce général',
  phone = '',
  address = '',
  country = 'BJ',
  city = '',
  userEmail,
  userRole,
  employees = [],
  onSaveProfile,
  onInviteEmployee,
  onRemoveEmployee,
  onExportBackup,
  onResetData,
}: SettingsManagerProps) {
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const isAdminUser = isSuperAdmin(userRole, userEmail)
  const isEmployee = isEmployeeRole(userRole)

  return (
    <div className="space-y-6">
      {/* Mode Super Admin (Caché pour les autres) */}
      {isAdminUser && (
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-700" strokeWidth={1.75} />
                <span>Mode Super Admin</span>
              </h2>
              <p className="text-sm text-purple-700">
                Vous avez des privilèges globaux. Accédez au tableau de bord administrateur.
              </p>
            </div>
            <a 
              href="/admin" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap active:scale-[0.97] cursor-pointer"
            >
              Ouvrir le Panel
            </a>
          </div>
        </div>
      )}

      {/* Profil de la boutique */}
      <ShopProfileSettings
        shopId={shopId}
        shopName={shopName}
        activity={activity}
        phone={phone}
        address={address}
        country={country}
        city={city}
        onSaveProfile={onSaveProfile}
      />

      {/* Sécurité & Journal d'Audit Anti-Fraude (Réservé Propriétaire / Admin) */}
      {!isEmployee && (
        <div className="bg-amber-50/70 p-6 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
              <ShieldAlert className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950 tracking-tight">
                Journal d'Audit Anti-Fraude
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 max-w-md">
                Consultez l'historique immuable de toutes les actions sensibles : ventes biffées, retours marchandises, écarts de caisse Z et suppressions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuditLogs(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-amber-50 text-xs font-bold transition-all shadow-sm active:scale-[0.97] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>Consulter les Logs</span>
          </button>
        </div>
      )}

      {/* Gestion de l'équipe d'employés */}
      <EmployeeRoleManager
        employees={employees}
        shopId={shopId}
        shopName={shopName}
        onInviteEmployee={onInviteEmployee}
        onRemoveEmployee={onRemoveEmployee}
      />

      {/* Sauvegarde & Nettoyage Sélectif */}
      <DataExportBackupSettings
        shopId={shopId}
        onExportBackup={onExportBackup}
        onResetData={onResetData}
      />

      {/* Modale d'audit */}
      <AuditLogsViewerModal
        isOpen={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
        shopId={shopId}
        shopName={shopName}
      />
    </div>
  )
}

