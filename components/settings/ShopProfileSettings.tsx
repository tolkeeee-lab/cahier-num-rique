'use client'

import React, { useState } from 'react'
import { Store, Save } from 'lucide-react'

interface ShopProfileSettingsProps {
  shopName: string
  activity: string
  phone: string
  address: string
  onSaveProfile?: (data: { shopName: string; activity: string; phone: string; address: string }) => Promise<void>
}

export const ShopProfileSettings: React.FC<ShopProfileSettingsProps> = ({
  shopName: initialName,
  activity: initialActivity,
  phone: initialPhone,
  address: initialAddress,
  onSaveProfile,
}) => {
  const [name, setName] = useState(initialName)
  const [activity, setActivity] = useState(initialActivity)
  const [phone, setPhone] = useState(initialPhone)
  const [address, setAddress] = useState(initialAddress)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSaveProfile) return

    setIsSaving(true)
    try {
      await onSaveProfile({ shopName: name, activity, phone, address })
    } catch (err) {
      console.error('Erreur sauvegarde profil boutique:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/90 p-5 rounded-2xl border border-amber-300/80 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
        <Store className="w-5 h-5 text-amber-700" />
        <h4 className="text-sm font-extrabold text-gray-900">Profil du Point de Vente</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1">Nom du commerce :</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1">Secteur d'activité :</label>
          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1">Numéro WhatsApp / Téléphone :</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>

        <div>
          <label className="block text-amber-950 font-bold uppercase mb-1">Adresse / Ville :</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-xs font-extrabold rounded-xl hover:from-[#fbbf24] hover:to-[#f59e0b] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder les Modifications'}</span>
        </button>
      </div>
    </form>
  )
}
