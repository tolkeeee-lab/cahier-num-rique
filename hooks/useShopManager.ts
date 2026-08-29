'use client'

import { useState, useEffect, useRef } from 'react'
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

  const initializedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!mappedUser?.id) return

    const uId = mappedUser.id
    if (initializedUserIdRef.current === uId) {
      return
    }
    initializedUserIdRef.current = uId

    let isMounted = true

    async function initializeShops() {
      const uEmail = (mappedUser.email || '').toLowerCase().trim()
      const uShopId = mappedUser.shop_id || `${uId}-main`
      const isOnline = isSupabaseClientConfigured()

      // ── 1. Vérification si l'utilisateur est un Employé assigné à une Boutique Patron ──
      const isEmployeeFromMeta = (mappedUser as any)?.role === 'employee'

      if (isEmployeeFromMeta || (isOnline && uEmail)) {
        try {
          let assignedShopId = (mappedUser as any)?.shop_id
          let assignedRole = (mappedUser as any)?.role || 'employee'
          let assignedShopName = (mappedUser as any)?.shop_name || 'Boutique Assignée'

          if (isOnline && uEmail) {
            const { data: empData } = await supabaseClient
              .from('employees')
              .select('shop_id, name, role, shop_code')
              .eq('email', uEmail)
              .maybeSingle()

            if (empData?.shop_id) {
              assignedShopId = empData.shop_id
              if (empData.role) assignedRole = empData.role

              // Tenter d'obtenir le nom de la boutique du patron si possible
              const { data: ownerData } = await supabaseClient
                .from('employees')
                .select('name, email')
                .eq('shop_id', empData.shop_id)
                .eq('role', 'owner')
                .limit(1)
                .maybeSingle()

              if (ownerData?.name) {
                assignedShopName = `Boutique de ${ownerData.name}`
              }
            }
          }

          if ((assignedRole === 'employee' || isEmployeeFromMeta) && assignedShopId && isMounted) {
            setEmployeeRole('employee')
            const empShop: Shop = {
              id: assignedShopId,
              name: assignedShopName,
              activity: (mappedUser as any)?.activity || 'boutique',
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
            setUserShops(parsed)
            setSelectedShopId((prev) => prev || parsed[0].id)
            return
          }
        } catch {}
      }

      const userActivity = (mappedUser as any)?.activity || (mappedUser as any)?.user_metadata?.shop_activity || 'boutique'
      const defaultShops: Shop[] = [
        { id: uShopId, name: (mappedUser as any)?.shop_name || 'Mon Point de Vente', activity: userActivity },
      ]
      if (isMounted) {
        setUserShops(defaultShops)
        setSelectedShopId((prev) => prev || uShopId)
      }
      localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(defaultShops))
    }

    initializeShops()

    return () => {
      isMounted = false
    }
  }, [mappedUser?.id, mappedUser?.email, mappedUser?.shop_id])

  const shopId = selectedShopId || mappedUser?.shop_id || 'default-shop'
  const currentShop = userShops.find((s) => s.id === shopId)
  const shopActivity = currentShop?.activity || (mappedUser as any)?.activity || 'boutique'

  const handleCreateShop = () => {
    if (!newShopName.trim() || !mappedUser?.id) return
    const newId = `shop-${Date.now()}`
    const newShopObj: Shop = {
      id: newId,
      name: newShopName.trim(),
      activity: newShopActivity,
    }
    const updated = [...userShops, newShopObj]
    setUserShops(updated)
    localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updated))
    setSelectedShopId(newId)
    setNewShopName('')
    setShowNewShopModal(false)
  }

  const handleSwitchShop = (id: string) => {
    setSelectedShopId(id)
  }

  const handleUpdateShopProfile = async (data: { shopName: string; activity: string; phone?: string; address?: string }) => {
    if (!mappedUser?.id) return

    const targetShopId = shopId || `${mappedUser.id}-main`

    // 1. Mettre à jour dans la liste des boutiques
    const updatedShops = userShops.map((s) => {
      if (s.id === targetShopId) {
        return { ...s, name: data.shopName, activity: data.activity }
      }
      return s
    })

    if (!updatedShops.some(s => s.id === targetShopId)) {
      updatedShops.push({ id: targetShopId, name: data.shopName, activity: data.activity })
    }

    setUserShops(updatedShops)
    localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updatedShops))

    // 2. Mettre à jour téléphone & adresse dans localStorage
    if (data.phone !== undefined) {
      localStorage.setItem(`cahier_shop_phone_${targetShopId}`, data.phone)
    }
    if (data.address !== undefined) {
      localStorage.setItem(`cahier_shop_address_${targetShopId}`, data.address)
    }

    // 3. Si Supabase est actif, sauvegarder dans les user_metadata Supabase
    if (isSupabaseClientConfigured()) {
      try {
        await supabaseClient.auth.updateUser({
          data: {
            shop_name: data.shopName,
            shop_activity: data.activity,
            phone: data.phone,
            address: data.address,
          }
        })
      } catch (e) {
        console.warn('Erreur mise à jour metadata Supabase:', e)
      }
    }
  }

  return {
    selectedShopId,
    setSelectedShopId,
    shopId,
    userShops,
    setUserShops,
    currentShop,
    shopActivity,
    employeeRole,
    showNewShopModal,
    newShopName,
    newShopActivity,
    setShowNewShopModal,
    setNewShopName,
    setNewShopActivity,
    handleCreateShop,
    handleSwitchShop,
    handleUpdateShopProfile,
  }
}

