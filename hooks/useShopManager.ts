'use client'

import { useState, useEffect, useRef } from 'react'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

import { isRealUuid, findShopIdByCode, formatShortShopCode } from '@/lib/shopCodeUtils'
import { migrateOfflineShopSales } from '@/lib/offlineDb'

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
            const { data: empRows } = await supabaseClient
              .from('employees')
              .select('id, shop_id, name, role, shop_code, created_at')
              .eq('email', uEmail)
              .order('created_at', { ascending: false })

            if (empRows && empRows.length > 0) {
              // 1. Chercher d'abord une ligne qui possède un VRAI UUID (ex: 58c54b4a-4d32-4686-971e-b5f87985...)
              let bestRow = empRows.find(r => isRealUuid(r.shop_id)) || empRows[0]

              // 2. Si shop_id est un code court (ex: BTQ-58C54), le résoudre en UUID réel du patron
              if (bestRow?.shop_id && !isRealUuid(bestRow.shop_id)) {
                const resolvedRealUuid = await findShopIdByCode(bestRow.shop_id)
                if (isRealUuid(resolvedRealUuid)) {
                  bestRow.shop_id = resolvedRealUuid
                  await supabaseClient.from('employees').update({ shop_id: resolvedRealUuid }).eq('id', bestRow.id)
                }
              }

              // 3. Nettoyer les doublons de lignes temporaires inutiles
              if (empRows.length > 1 && isRealUuid(bestRow.shop_id)) {
                const junkRows = empRows.filter(r => r.id !== bestRow.id && !isRealUuid(r.shop_id))
                for (const junk of junkRows) {
                  await supabaseClient.from('employees').delete().eq('id', junk.id)
                }
              }


              if (bestRow?.shop_id) {
                assignedShopId = bestRow.shop_id
                if (bestRow.role) assignedRole = bestRow.role

                if (isRealUuid(bestRow.shop_id)) {
                  // Re-lier dans Supabase toute vente, produit ou dette inséré sous le code court littéral
                  const shortCode = formatShortShopCode(bestRow.shop_id)
                  if (shortCode && shortCode !== bestRow.shop_id) {
                    await supabaseClient.from('sales').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode)
                    await supabaseClient.from('products').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode)
                    await supabaseClient.from('debts').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode)
                  }
                }

                // Tenter d'obtenir le nom officiel depuis public.shops
                try {
                  const { data: sRow } = await supabaseClient
                    .from('shops')
                    .select('name')
                    .eq('id', bestRow.shop_id)
                    .maybeSingle()

                  if (sRow?.name) {
                    assignedShopName = sRow.name
                  }
                } catch {}

                // Fallback : obtenir le nom du patron via employees
                if (!assignedShopName || assignedShopName === 'Boutique Assignée') {
                  const { data: ownerData } = await supabaseClient
                    .from('employees')
                    .select('name, email')
                    .eq('shop_id', bestRow.shop_id)
                    .eq('role', 'owner')
                    .limit(1)
                    .maybeSingle()

                  if (ownerData?.name) {
                    assignedShopName = `Boutique de ${ownerData.name}`
                  }
                }

              }
            }
          }

          if (assignedShopId && !isRealUuid(assignedShopId) && isOnline) {
            const oldId = assignedShopId
            const resolved = await findShopIdByCode(assignedShopId)
            if (isRealUuid(resolved)) {
              migrateOfflineShopSales(oldId, resolved)
              assignedShopId = resolved
            }
          }

          if ((assignedRole === 'employee' || isEmployeeFromMeta) && assignedShopId && isMounted) {
            const previousId = (mappedUser as any)?.shop_id
            if (previousId && previousId !== assignedShopId) {
              migrateOfflineShopSales(previousId, assignedShopId)
            }
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
            // Mettre à jour les boutiques en résolvant les codes courts éventuels
            const resolvedShops = await Promise.all(parsed.map(async (s: Shop) => {
              if (s.id && !isRealUuid(s.id) && isOnline) {
                const realId = await findShopIdByCode(s.id)
                if (isRealUuid(realId)) return { ...s, id: realId }
              }
              return s
            }))
            setUserShops(resolvedShops)
            setSelectedShopId((prev) => prev || resolvedShops[0].id)
            localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(resolvedShops))
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

    const targetShopId = shopId || mappedUser.shop_id || mappedUser.id

    // 1. Mettre à jour dans la liste des boutiques
    let updatedShops = userShops.map((s) => {
      if (s.id === targetShopId || s.id === selectedShopId || userShops.length === 1) {
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

    // 3. Si Supabase est actif, sauvegarder dans user_metadata ET dans public.employees
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

        // Mettre à jour la fiche patron dans employees pour que les employés voient le nouveau nom
        await supabaseClient
          .from('employees')
          .update({ name: data.shopName })
          .eq('id', mappedUser.id)

        // Sauvegarder/mettre à jour dans la table officielle public.shops si elle existe
        try {
          await supabaseClient.from('shops').upsert([
            {
              id: targetShopId,
              owner_id: mappedUser.id,
              name: data.shopName,
              activity: data.activity,
              phone: data.phone,
              address: data.address,
              shop_code: formatShortShopCode(targetShopId),
              updated_at: new Date().toISOString(),
            }
          ], { onConflict: 'id' })
        } catch {}
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

