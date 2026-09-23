'use client'

import { useState, useEffect, useRef } from 'react'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'

import { isRealUuid, findShopIdByCode, formatShortShopCode } from '@/lib/shopCodeUtils'
import { migrateOfflineShopSales } from '@/lib/offlineDb'

export interface Shop {
  id: string
  name: string
  activity: string
  country?: string
  city?: string
}


export function useShopManager(mappedUser: any) {
  const [userShops, setUserShops] = useState<Shop[]>(() => {
    if (typeof window === 'undefined' || !mappedUser?.id) return []
    try {
      const stored = localStorage.getItem(`cahier_user_shops_${mappedUser.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return []
  })

  const [selectedShopId, setSelectedShopId] = useState<string>(() => {
    if (typeof window === 'undefined' || !mappedUser?.id) return ''
    try {
      const stored = localStorage.getItem(`cahier_user_shops_${mappedUser.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) return parsed[0].id
      }
    } catch {}
    return mappedUser?.shop_id || ''
  })

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
            const { data: empRows, error: empErr } = await supabaseClient
              .from('employees')
              .select('id, shop_id, name, role, created_at')
              .eq('email', uEmail)
              .order('created_at', { ascending: false })

            if (empErr) console.warn('[ShopManager] employees query error:', empErr.message)

            if (empRows && empRows.length > 0) {
              // 1. Chercher d'abord une ligne qui possède un VRAI UUID
              let bestRow = empRows.find(r => isRealUuid(r.shop_id)) || empRows[0]

              // 2. Si shop_id est un code court, le résoudre
              if (bestRow?.shop_id && !isRealUuid(bestRow.shop_id)) {
                const resolvedRealUuid = await findShopIdByCode(bestRow.shop_id)
                if (isRealUuid(resolvedRealUuid)) {
                  bestRow.shop_id = resolvedRealUuid
                  supabaseClient.from('employees').update({ shop_id: resolvedRealUuid }).eq('id', bestRow.id).then(() => {})
                }
              }

              if (bestRow?.shop_id) {
                assignedShopId = bestRow.shop_id
                if (bestRow.role) assignedRole = bestRow.role

                // Migration non-bloquante et unique en arrière-plan
                if (isRealUuid(bestRow.shop_id)) {
                  const shortCode = formatShortShopCode(bestRow.shop_id)
                  if (shortCode && shortCode !== bestRow.shop_id) {
                    const migKey = `cahier_shortcode_synced_${bestRow.shop_id}`
                    if (typeof window !== 'undefined' && !localStorage.getItem(migKey)) {
                      localStorage.setItem(migKey, 'true')
                      Promise.all([
                        supabaseClient.from('sales').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                        supabaseClient.from('sold_articles').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                        supabaseClient.from('products').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                        supabaseClient.from('debts').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                        supabaseClient.from('supplier_debts').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                        supabaseClient.from('cash_closings').update({ shop_id: bestRow.shop_id }).eq('shop_id', shortCode),
                      ]).catch(() => {})
                    }
                  }
                }

                // PRIORITÉ 1 : nom officiel depuis la table public.shops
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

                // PRIORITÉ 2 : nom depuis la table employees de la boutique (patron)
                if (!assignedShopName || assignedShopName === 'Boutique Assignée') {
                  try {
                    const { data: ownerData } = await supabaseClient
                      .from('employees')
                      .select('name, email')
                      .eq('shop_id', bestRow.shop_id)
                      .eq('role', 'owner')
                      .limit(1)
                      .maybeSingle()

                    if ((ownerData as any)?.shop_name) {
                      assignedShopName = (ownerData as any).shop_name
                    } else if (ownerData?.name) {
                      assignedShopName = `Boutique de ${ownerData.name}`
                    }
                  } catch {}
                }

                // PRIORITÉ 3 : nom dans localStorage (mis à jour lors de la sauvegarde du profil)
                if (!assignedShopName || assignedShopName === 'Boutique Assignée') {
                  const lsName = typeof window !== 'undefined'
                    ? localStorage.getItem(`cahier_shop_name_${bestRow.shop_id}`)
                    : null
                  if (lsName) assignedShopName = lsName
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



      // ── 2. Pour le Propriétaire : Chargement des boutiques distantes & locales ──
      let ownerShops: Shop[] = []

      // A. Source 1 : Supabase `shops` table (Source de vérité Cloud)
      if (isOnline && mappedUser?.id) {
        try {
          const ownerUuid = isRealUuid(mappedUser.id) ? mappedUser.id : null
          let query = supabaseClient.from('shops').select('id, name, activity, country, city, shop_code')
          
          const { data: dbShops, error: dbErr } = ownerUuid
            ? await query.eq('owner_id', ownerUuid).order('created_at', { ascending: true })
            : await query.or(`owner_id.eq.${mappedUser.id},id.eq.${uShopId}`).order('created_at', { ascending: true })

          if (!dbErr && dbShops && dbShops.length > 0) {
            ownerShops = dbShops.map(s => ({
              id: s.id,
              name: s.name || (mappedUser as any)?.shop_name || 'Mon Point de Vente',
              activity: s.activity || (mappedUser as any)?.activity || 'boutique',
              country: s.country || 'BJ',
              city: s.city || '',
            }))
          }
        } catch (e) {
          console.warn('[ShopManager] Erreur lecture shops Supabase:', e)
        }
      }

      // B. Source 2 : LocalStorage `cahier_user_shops_${uId}`
      if (ownerShops.length === 0) {
        const stored = localStorage.getItem(`cahier_user_shops_${uId}`)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              ownerShops = parsed
            }
          } catch {}
        }
      }

      // C. Source 3 : Nom personnalisé unitaire dans localStorage `cahier_shop_name_*`
      const savedName = typeof window !== 'undefined'
        ? (localStorage.getItem(`cahier_shop_name_${uShopId}`) || 
           localStorage.getItem(`cahier_shop_name_${uId}`) ||
           (ownerShops[0]?.id ? localStorage.getItem(`cahier_shop_name_${ownerShops[0].id}`) : null))
        : null

      if (ownerShops.length === 0) {
        const userActivity = (mappedUser as any)?.activity || (mappedUser as any)?.user_metadata?.shop_activity || 'boutique'
        const initialName = savedName || (mappedUser as any)?.shop_name || 'Mon Point de Vente'
        ownerShops = [{ id: uShopId, name: initialName, activity: userActivity }]
      } else if (savedName && (ownerShops[0].name === 'Mon Point de Vente' || !ownerShops[0].name)) {
        ownerShops[0].name = savedName
      }

      // Mettre à jour les boutiques en résolvant les codes courts éventuels
      const resolvedShops = await Promise.all(ownerShops.map(async (s: Shop) => {
        if (s.id && !isRealUuid(s.id) && isOnline) {
          const realId = await findShopIdByCode(s.id)
          if (isRealUuid(realId)) return { ...s, id: realId }
        }
        return s
      }))

      if (isMounted) {
        setUserShops(resolvedShops)
        setSelectedShopId((prev) => prev || resolvedShops[0].id)
      }
      localStorage.setItem(`cahier_user_shops_${uId}`, JSON.stringify(resolvedShops))
      if (resolvedShops[0]?.name && resolvedShops[0]?.id) {
        localStorage.setItem(`cahier_shop_name_${resolvedShops[0].id}`, resolvedShops[0].name)
      }
    }

    initializeShops()

    return () => {
      isMounted = false
    }
  }, [mappedUser?.id, mappedUser?.email, mappedUser?.shop_id])

  const shopId = selectedShopId || mappedUser?.shop_id || 'default-shop'
  
  // Recherche tolérante de la boutique active (exact, UUID insensible à la casse, ou code court normalisé)
  const currentShop = userShops.find((s) => 
    s.id === shopId ||
    (isRealUuid(s.id) && isRealUuid(shopId) && s.id.toLowerCase() === shopId.toLowerCase()) ||
    normalizeShopCode(s.id) === normalizeShopCode(shopId)
  ) || userShops[0]

  const shopActivity = currentShop?.activity || (mappedUser as any)?.activity || 'boutique'
  
  const shopName = currentShop?.name || 
    (typeof window !== 'undefined' ? (localStorage.getItem(`cahier_shop_name_${shopId}`) || localStorage.getItem(`cahier_shop_name_${userShops[0]?.id}`)) : null) ||
    (mappedUser as any)?.shop_name ||
    'Mon Point de Vente'

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

  const handleUpdateShopProfile = async (data: { shopName: string; activity: string; phone?: string; address?: string; country?: string; city?: string }) => {
    if (!mappedUser?.id) return

    const targetShopId = shopId || mappedUser.shop_id || mappedUser.id
    const targetCountry = data.country || 'BJ'
    const targetCity = data.city || ''

    // 1. Mettre à jour dans la liste locale des boutiques
    let updatedShops = userShops.map((s) => {
      if (
        s.id === targetShopId || 
        s.id === selectedShopId || 
        (isRealUuid(s.id) && isRealUuid(targetShopId) && s.id.toLowerCase() === targetShopId.toLowerCase()) ||
        normalizeShopCode(s.id) === normalizeShopCode(targetShopId) ||
        userShops.length === 1
      ) {
        return { ...s, name: data.shopName, activity: data.activity, country: targetCountry, city: targetCity }
      }
      return s
    })

    if (!updatedShops.some(s => s.id === targetShopId || normalizeShopCode(s.id) === normalizeShopCode(targetShopId))) {
      updatedShops.push({ id: targetShopId, name: data.shopName, activity: data.activity, country: targetCountry, city: targetCity })
    }

    setUserShops(updatedShops)
    localStorage.setItem(`cahier_user_shops_${mappedUser.id}`, JSON.stringify(updatedShops))

    // 2. Mettre à jour téléphone, adresse, pays & ville dans localStorage pour tous les alias
    const aliases = [targetShopId, selectedShopId, normalizeShopCode(targetShopId), formatShortShopCode(targetShopId)]
    for (const a of aliases) {
      if (a) {
        localStorage.setItem(`cahier_shop_name_${a}`, data.shopName)
        if (data.phone !== undefined) localStorage.setItem(`cahier_shop_phone_${a}`, data.phone)
        if (data.address !== undefined) localStorage.setItem(`cahier_shop_address_${a}`, data.address)
        localStorage.setItem(`cahier_shop_country_${a}`, targetCountry)
        localStorage.setItem(`cahier_shop_city_${a}`, targetCity)
      }
    }

    // 3. Si Supabase est actif, sauvegarder dans les différentes tables indépendamment
    if (isSupabaseClientConfigured()) {
      // a) Mise à jour Metadata (Auth)
      try {
        await supabaseClient.auth.updateUser({
          data: {
            shop_name: data.shopName,
            shop_activity: data.activity,
            phone: data.phone,
            address: data.address,
            country: targetCountry,
            city: targetCity,
          }
        })
      } catch (e) {
        console.warn('[ShopManager] Erreur updateUser:', e)
      }

      // b) Mise à jour Shops (Table de référence Cloud)
      try {
        const validShopUuid = isRealUuid(targetShopId) 
          ? targetShopId 
          : (isRealUuid(mappedUser.id) ? mappedUser.id : undefined)

        const shopPayload: any = {
          owner_id: isRealUuid(mappedUser.id) ? mappedUser.id : undefined,
          name: data.shopName,
          activity: data.activity,
          phone: data.phone,
          address: data.address,
          country: targetCountry,
          city: targetCity,
          shop_code: formatShortShopCode(targetShopId),
          updated_at: new Date().toISOString(),
        }

        if (validShopUuid) {
          shopPayload.id = validShopUuid
        }

        await supabaseClient
          .from('shops')
          .upsert([shopPayload], { onConflict: validShopUuid ? 'id' : undefined })
      } catch (e) {
        console.warn('[ShopManager] Erreur upsert shops:', e)
      }
    }
  }

  return {
    selectedShopId,
    setSelectedShopId,
    shopId,
    shopName,
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

