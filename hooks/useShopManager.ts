'use client'

import { useState, useEffect } from 'react'

export interface Shop {
  id: string
  name: string
  activity: string
}

export function useShopManager(mappedUser: any) {
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [userShops, setUserShops] = useState<Shop[]>([])
  const [showNewShopModal, setShowNewShopModal] = useState(false)
  const [newShopName, setNewShopName] = useState('')
  const [newShopActivity, setNewShopActivity] = useState<'boutique' | 'resto' | 'prestations'>('boutique')

  useEffect(() => {
    if (mappedUser?.id) {
      const uId = mappedUser.id
      const uShopId = mappedUser.shop_id || `${uId}-main`

      const stored = localStorage.getItem(`cahier_user_shops_${uId}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (JSON.stringify(userShops) !== JSON.stringify(parsed)) {
              setUserShops(parsed)
            }
            if (!selectedShopId) {
              setSelectedShopId(parsed[0].id)
            }
            return
          }
        } catch { }
      }

      const userActivity = (mappedUser as any)?.activity || (mappedUser as any)?.user_metadata?.shop_activity || 'boutique'
      const defaultShops: Shop[] = [
        { id: uShopId, name: (mappedUser as any)?.shop_name || 'Mon Point de Vente', activity: userActivity }
      ]
      if (JSON.stringify(userShops) !== JSON.stringify(defaultShops)) {
        setUserShops(defaultShops)
      }
      localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(defaultShops))
      if (!selectedShopId) {
        setSelectedShopId(uShopId)
      }
    }
  }, [mappedUser?.id, mappedUser?.shop_id, selectedShopId, userShops, mappedUser])

  const shopId = selectedShopId || mappedUser?.shop_id || 'default-shop'
  const currentShop = userShops.find(s => s.id === shopId)
  const shopActivity = currentShop?.activity || (mappedUser as any)?.activity || 'boutique'

  const handleCreateShop = () => {
    if (!newShopName.trim() || !mappedUser?.id) return
    const newId = `shop-${Date.now()}`
    const newShopObj: Shop = {
      id: newId,
      name: newShopName.trim(),
      activity: newShopActivity
    }
    const updated = [...userShops, newShopObj]
    setUserShops(updated)
    localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updated))
    setSelectedShopId(newId)
    setNewShopName('')
    setShowNewShopModal(false)
  }

  return {
    shopId,
    selectedShopId,
    setSelectedShopId,
    userShops,
    setUserShops,
    currentShop,
    shopActivity,
    showNewShopModal,
    setShowNewShopModal,
    newShopName,
    setNewShopName,
    newShopActivity,
    setNewShopActivity,
    handleCreateShop
  }
}
