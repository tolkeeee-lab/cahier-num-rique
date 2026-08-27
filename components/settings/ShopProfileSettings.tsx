'use client'

import React, { useState } from 'react'
import { Store, Save, Key, Copy, Check } from 'lucide-react'
import { formatShortShopCode } from '@/lib/shopCodeUtils'

interface ShopProfileSettingsProps {
  shopId?: string
  shopName: string
  activity: string
  phone: string
  address: string
  onSaveProfile?: (data: { shopName: string; activity: string; phone: string; address: string }) => Promise<void>
}

export const ShopProfileSettings: React.FC<ShopProfileSettingsProps> = ({
  shopId = 'default-shop',
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
  const [copied, setCopied] = useState(false)

  const shortCode = formatShortShopCode(shopId)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shortCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

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
      <div className="flex items-center justify-between border-b border-amber-200 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-700" />
          <h4 className="text-sm font-extrabold text-gray-900">Profil du Point de Vente</h4>
        </div>

        {/* Badge Code Boutique pour le propriétaire */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300/80 px-3 py-1.5 rounded-xl text-xs font-mono">
          <Key className="w-4 h-4 text-amber-600" />
          <span className="text-gray-600 font-medium">Code Équipe :</span>
          <span className="font-extrabold text-amber-900 tracking-wider bg-amber-200/80 px-2 py-0.5 rounded-md">{shortCode}</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="ml-1 text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 bg-amber-200/60 hover:bg-amber-300/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>
        </div>
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
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300/80 rounded-xl text-gray-900 font-bold focus:outline-none focus:border-amber-500 shadow-inner cursor-pointer"
          >
            <option value="boutique">🏪 Commerce / Boutique / Grossiste</option>
            <option value="resto">🍽️ Cafétéria / Restaurant / Bar / Maquis</option>
            <option value="prestations">✂️ Salon de Coiffure / Atelier / Services</option>
            <option value="particulier">🏡 Particulier / Budget du Foyer</option>
          </select>
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

