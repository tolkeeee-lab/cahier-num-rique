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
  userEmail?: string
  userShops?: any[]
  employees?: Employee[]
  onSaveProfile?: (data: { shopName: string; activity: string; phone: string; address: string }) => Promise<void>
  onUpdateShopActivity?: (shopId: string, activity: string) => void
  onInviteEmployee?: (email: string, role: string) => Promise<void>
  onRemoveEmployee?: (id: string) => Promise<void>
  onExportBackup?: () => void
  onResetData?: () => void
}

export function SettingsManager({
  shopName = 'Ma Boutique',
  activity = 'Commerce général',
  phone = '',
  address = '',
  employees = [],
  onSaveProfile,
  onInviteEmployee,
  onRemoveEmployee,
  onExportBackup,
  onResetData,
}: SettingsManagerProps) {
  return (
    <div className="space-y-6">
      {/* Profil de la boutique */}
      <ShopProfileSettings
        shopName={shopName}
        activity={activity}
        phone={phone}
        address={address}
        onSaveProfile={onSaveProfile}
      />

      {/* Gestion de l'équipe d'employés */}
      <EmployeeRoleManager
        employees={employees}
        onInviteEmployee={onInviteEmployee}
        onRemoveEmployee={onRemoveEmployee}
      />

      {/* Sauvegarde & Exportations */}
      <DataExportBackupSettings
        onExportBackup={onExportBackup}
        onResetData={onResetData}
      />
    </div>
  )
}
