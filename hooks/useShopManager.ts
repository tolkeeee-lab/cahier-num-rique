'use client'

import { useState, useEffect } from 'react'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

export interface Shop {
  id: string
  name: string
  activity: string
}

export function useShopManager(mappedUser: any) {
  const [selectedShopId, setSelectedShopId] = useState<string>('')
  const [userShops, setUserShops] = useState<Shop[]>([])
  const [employeeRole, setEmployeeRole] = useState<string | null>(null)
  const [showNewShopModal, setShowNewShopModal] = useState(false)
  const [newShopName, setNewShopName] = useState('')
  const [newShopActivity, setNewShopActivity] = useState<'boutique' | 'resto' | 'prestations'>('boutique')

  useEffect(() => {
    let isMounted = true

    async function initializeShops() {
      if (!mappedUser?.id) return

      const uId = mappedUser.id
      const uEmail = (mappedUser.email || '').toLowerCase().trim()
      const uShopId = mappedUser.shop_id || `${uId}-main`
      const isOnline = isSupabaseClientConfigured()

      // ── 1. Vérification si l'utilisateur est un Employé assigné à une Boutique Patron ──
      if (isOnline && uEmail) {
        try {
          const { data: empData } = await supabaseClient
            .from('employees')
            .select('shop_id, name, role')
            .eq('email', uEmail)
            .maybeSingle()

          if (empData?.shop_id && isMounted) {
            const assignedShopId = empData.shop_id
            const assignedRole = empData.role || 'employee'
            setEmployeeRole(assignedRole)
            const empShop: Shop = {
              id: assignedShopId,
              name: (mappedUser as any)?.shop_name || 'Boutique Assignée',
              activity: (mappedUser as any)?.activity || 'boutique'
            }
            setUserShops([empShop])
            setSelectedShopId(assignedShopId)
            localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify([empShop]))
            return
          }
        } catch (e) {
          console.warn('Erreur vérification rôle employé:', e)
        }
      }

      // ── 2. Pour le Propriétaire : Chargement des boutiques locales & distantes ──
      const stored = localStorage.getItem(`cahier_user_shops_${uId}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
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
      if (JSON.stringify(userShops) !== JSON.stringify(defaultShops) && isMounted) {
        setUserShops(defaultShops)
      }
      localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(defaultShops))
      if (!selectedShopId && isMounted) {
        setSelectedShopId(uShopId)
      }
    }

    initializeShops()

    return () => {
      isMounted = false
    }
  }, [mappedUser?.id, mappedUser?.email, mappedUser?.shop_id, selectedShopId])

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
    employeeRole,
    showNewShopModal,
    setShowNewShopModal,
    newShopName,
    setNewShopName,
    newShopActivity,
    setNewShopActivity,
    handleCreateShop
  }
}
