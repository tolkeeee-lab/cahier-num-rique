'use client'

import React from 'react'
import { ShopProfileSettings } from '@/components/settings/ShopProfileSettings'
import { EmployeeRoleManager } from '@/components/settings/EmployeeRoleManager'
import { DataExportBackupSettings } from '@/components/settings/DataExportBackupSettings'

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
  employees = [],
  onSaveProfile,
  onInviteEmployee,
  onRemoveEmployee,
  onExportBackup,
  onResetData,
}: SettingsManagerProps) {
  const isAdminUser = userEmail === 'tolkeeee@gmail.com' || userEmail === 'tolkeeeee@gmail.com' || userEmail === 'admin@cahier.com' || userEmail?.endsWith('@cahier.admin')

  return (
    <div className="space-y-6">
      {/* Mode Super Admin (Caché pour les autres) */}
      {isAdminUser && (
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold text-purple-900 flex items-center">
                <span className="text-xl mr-2">👑</span> Mode Super Admin
              </h2>
              <p className="text-sm text-purple-700">
                Vous avez des privilèges globaux. Accédez au tableau de bord administrateur.
              </p>
            </div>
            <a 
              href="/admin" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
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
    </div>
  )
}
