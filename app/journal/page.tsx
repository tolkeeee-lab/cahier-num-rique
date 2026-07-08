'use client'

import React, { useState, useEffect, useRef } from 'react'
import { SalesHistory } from '@/components/SalesHistory'
import { DebtsBook } from '@/components/DebtsBook'
import { Notebook, BookText, BarChart3, Send, Loader, AlertTriangle, FolderArchive } from 'lucide-react'
import { supabaseClient, isSupabaseClientConfigured } from '@/lib/supabaseClient'
import { AuthScreen } from '@/components/AuthScreen'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt' | 'crossed_out'
  type: string
  pen_color: string
  notes: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

const PENS = [
  { 
    id: 'blue', 
    name: 'ENTRÉE', 
    color: '#1d4ed8', 
    bg: 'bg-blue-600', 
    border: 'border-blue-600', 
    textClass: 'ink-blue',
    dotBg: 'bg-[#1d4ed8]',
    placeholder: 'Stylo Bleu : Écrivez une vente cash... (ex: 2 sacs de riz à 22000)' 
  },
  { 
    id: 'red', 
    name: 'DÉPENSE', 
    color: '#e11d48', 
    bg: 'bg-rose-600', 
    border: 'border-rose-600', 
    textClass: 'ink-red', 
    dotBg: 'bg-[#e11d48]',
    placeholder: 'Stylo Rouge : Écrivez une dépense... (ex: achat emballages plastiques 2500)' 
  },
  { 
    id: 'green', 
    name: 'STOCK CASH', 
    color: '#047857', 
    bg: 'bg-emerald-700', 
    border: 'border-emerald-700', 
    textClass: 'ink-green', 
    dotBg: 'bg-[#047857]',
    placeholder: 'Stylo Vert : Écrivez un achat de stock payé cash... (ex: 5 cartons lait à 15000)' 
  },
  { 
    id: 'purple', 
    name: 'STOCK CRÉDIT', 
    color: '#701a75', 
    bg: 'bg-fuchsia-800', 
    border: 'border-fuchsia-800', 
    textClass: 'ink-purple', 
    dotBg: 'bg-[#701a75]',
    placeholder: 'Stylo Violet : Écrivez un achat à crédit fournisseur... (ex: Grossiste Chantal carton peak credit 35000)' 
  },
  { 
    id: 'yellow', 
    name: 'CRÉDIT CLIENT', 
    color: '#b45309', 
    bg: 'bg-amber-600', 
    border: 'border-amber-600', 
    textClass: 'ink-yellow', 
    dotBg: 'bg-[#b45309]',
    placeholder: 'Stylo Jaune : Écrivez un crédit donné à un client... (ex: Koffi prend 2 sacs de riz crédit 12000)' 
  },
]

export default function JournalPage() {
  const isConfigured = isSupabaseClientConfigured()
  const [user, setUser] = useState<any>(null)
  
  const getMappedUser = (rawUser: any) => {
    if (!rawUser) return null
    const meta = rawUser.user_metadata || {}
    return {
      id: rawUser.id,
      email: rawUser.email,
      name: meta.full_name || rawUser.full_name || 'Utilisateur',
      role: meta.role || rawUser.role || 'owner',
      shop_id: meta.shop_id || rawUser.shop_id || rawUser.id || 'default-shop'
    }
  }

  const mappedUser = getMappedUser(user)
  const [authLoading, setAuthLoading] = useState(true)
  const [demoRole, setDemoRole] = useState<'owner' | 'employee' | null>(null)
  // localDemo kept for backward compat - true when using demo bypass
  const localDemo = demoRole !== null

  const [sales, setSales] = useState<Sale[]>([])
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  
  const [activeTab, setActiveTab] = useState<'cahier' | 'dettes' | 'trends' | 'archives'>('cahier')
  const [allSales, setAllSales] = useState<Sale[]>([])
  
  // Sales Input fields inside page context
  const [input, setInput] = useState('')
  const [selectedPen, setSelectedPen] = useState('blue')
  const [loading, setLoading] = useState(false)
  const [postItWarning, setPostItWarning] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [calculationQuery, setCalculationQuery] = useState<{
    quantity: number
    item: string
    amount: number
    rawText: string
    penColor: string
  } | null>(null)

  const [showChangeCalc, setShowChangeCalc] = useState(false)
  const [changeTotal, setChangeTotal] = useState('')
  const [changeReceived, setChangeReceived] = useState('')

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 1. Lire la session active Supabase ou Mock local
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setAuthLoading(false)
      } else {
        const localSession = localStorage.getItem('cahier_mock_session')
        if (localSession) {
          setUser(JSON.parse(localSession))
        }
        setAuthLoading(false)
      }
    })

    // 2. Ecouter les changements d'état Supabase
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        const localSession = localStorage.getItem('cahier_mock_session')
        if (localSession) {
          setUser(JSON.parse(localSession))
        } else {
          setUser(null)
        }
      }
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('cahier_last_active_user', JSON.stringify(user))
    }
  }, [user])

  useEffect(() => {
    if (user || localDemo) {
      loadFinancialData()
    }
    // Mettre à jour l'horloge
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [user, localDemo])

  const handleLogout = async () => {
    localStorage.removeItem('cahier_mock_session')
    if (localDemo) {
      setDemoRole(null)
      setUser(null)
    } else {
      await supabaseClient.auth.signOut()
      setUser(null)
    }
  }

  // Faire défiler vers le bas lors de la mise à jour des ventes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [sales, activeTab])

  // Écouter l'état du réseau pour synchroniser dès le retour en ligne
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      console.log("[Network] Connexion rétablie, lancement de la synchronisation...")
      loadFinancialData()
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [mappedUser, isConfigured])

  const syncOfflineData = async () => {
    if (!mappedUser) return
    const shopId = mappedUser.shop_id
    const online = typeof window !== 'undefined' ? window.navigator.onLine : false
    if (!online) return

    try {
      const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${shopId}`) || '[]')
      const unsyncedSales = offlineSales.filter((s: any) => s.is_synced === false)

      if (unsyncedSales.length === 0) return

      console.log(`[Offline Sync] Synchronisation de ${unsyncedSales.length} écritures hors-ligne...`)

      for (const sale of unsyncedSales) {
        const bodyData = {
          text: sale.notes || '',
          penColor: sale.pen_color || 'blue',
          overrideData: {
            articles: (sale.articles || []).map((a: any) => ({
              name: a.name || a.nom,
              quantity: a.quantity || a.quantite,
              unit_price: a.unit_price || a.prix_unitaire
            })),
            total_amount: sale.total,
            paid_amount: sale.paid,
            debt_amount: sale.debt,
            client_name: sale.client || 'Client anonyme'
          }
        }

        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-shop-id': shopId
          },
          body: JSON.stringify(bodyData)
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la synchronisation réseau d\'une transaction')
        }

        sale.is_synced = true
      }

      // Mettre à jour le cache local pour marquer les ventes comme synchronisées
      const updatedSales = offlineSales.map((s: any) => {
        const found = unsyncedSales.find((us: any) => us.id === s.id)
        if (found) return { ...s, is_synced: true }
        return s
      })
      localStorage.setItem(`cahier_offline_sales_${shopId}`, JSON.stringify(updatedSales))
      console.log('[Offline Sync] Synchronisation terminée avec succès !')
    } catch (err) {
      console.error('[Offline Sync] Échec de la synchronisation :', err)
    }
  }

  const loadFinancialData = async () => {
    if (!mappedUser) return
    try {
      let salesList = []
      let clientsList = []
      let suppliersList = []

      const online = typeof window !== 'undefined' ? window.navigator.onLine : false
      const shopId = mappedUser.shop_id

      if (isConfigured && online) {
        try {
          // En ligne -> synchroniser d'abord les données locales non synchronisées
          await syncOfflineData()

          // Charger ensuite via le réseau
          const headers = { 'x-shop-id': shopId }
          const response = await fetch('/api/sales', { headers })
          if (!response.ok) throw new Error('Erreur lors du chargement des écritures')
          const data = await response.json()
          salesList = data.sales || []

          const clientsRes = await fetch('/api/debts?type=client', { headers })
          const clientsData = await clientsRes.json()
          clientsList = clientsData.clients || []

          const suppliersRes = await fetch('/api/debts?type=supplier', { headers })
          const suppliersData = await suppliersRes.json()
          suppliersList = suppliersData.suppliers || []

          // Mettre en cache dans localStorage pour le mode hors-ligne
          localStorage.setItem(`cahier_offline_sales_${shopId}`, JSON.stringify(salesList))
          localStorage.setItem(`cahier_offline_clients_${shopId}`, JSON.stringify(clientsList))
          localStorage.setItem(`cahier_offline_suppliers_${shopId}`, JSON.stringify(suppliersList))
        } catch (apiError) {
          console.warn('[API Fallback] Échec de chargement réseau, repli sur local storage :', apiError)
          // Charger les caches en cas d'erreur de base de données (ex: table non créée)
          salesList = JSON.parse(localStorage.getItem(`cahier_offline_sales_${shopId}`) || '[]')
          clientsList = JSON.parse(localStorage.getItem(`cahier_offline_clients_${shopId}`) || '[]')
          suppliersList = JSON.parse(localStorage.getItem(`cahier_offline_suppliers_${shopId}`) || '[]')
        }
      } else {
        // Hors-ligne -> charger les caches
        salesList = JSON.parse(localStorage.getItem(`cahier_offline_sales_${shopId}`) || '[]')
        clientsList = JSON.parse(localStorage.getItem(`cahier_offline_clients_${shopId}`) || '[]')
        suppliersList = JSON.parse(localStorage.getItem(`cahier_offline_suppliers_${shopId}`) || '[]')
      }

      // Calculer le tiroir caisse
      let cash = 0
      for (const item of salesList) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0

        if (type === 'cash_in' || type === 'payment_client') {
          cash += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cash -= total
        }
      }

      const clientDebtsSum = clientsList.reduce((sum: number, c: any) => sum + (c.amount || c.amount_owed || 0), 0)
      const supplierDebtsSum = suppliersList.reduce((sum: number, s: any) => sum + (s.amount || s.amount_owed || 0), 0)

      setTiroirCaisse(cash)
      setArgentDehors(clientDebtsSum)
      setNosDettes(supplierDebtsSum)

      // Filtrer les ventes pour afficher seulement celles d'aujourd'hui dans le journal
      const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const todaysSales = salesList.filter((s: any) => s.date === todayStr)
      
      setSales(todaysSales.reverse())
      setAllSales(salesList)

    } catch (err) {
      console.warn('Echec de chargement réseau, chargement du cache hors-ligne...', err)
      const shopId = mappedUser.shop_id
      const salesList = JSON.parse(localStorage.getItem(`cahier_offline_sales_${shopId}`) || '[]')
      const clientsList = JSON.parse(localStorage.getItem(`cahier_offline_clients_${shopId}`) || '[]')
      const suppliersList = JSON.parse(localStorage.getItem(`cahier_offline_suppliers_${shopId}`) || '[]')

      let cash = 0
      for (const item of salesList) {
        if (item.status === 'crossed_out') continue
        const type = item.type
        const paid = item.paid ?? 0
        const total = item.total ?? 0

        if (type === 'cash_in' || type === 'payment_client') {
          cash += paid
        } else if (type === 'cash_out' || type === 'purchase_cash' || type === 'payment_supplier') {
          cash -= total
        }
      }

      const clientDebtsSum = clientsList.reduce((sum: number, c: any) => sum + (c.amount || c.amount_owed || 0), 0)
      const supplierDebtsSum = suppliersList.reduce((sum: number, s: any) => sum + (s.amount || s.amount_owed || 0), 0)

      setTiroirCaisse(cash)
      setArgentDehors(clientDebtsSum)
      setNosDettes(supplierDebtsSum)

      const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const todaysSales = salesList.filter((s: any) => s.date === todayStr)
      setSales(todaysSales.reverse())
      setAllSales(salesList)
    }
  }

  const parseClientName = (text: string): string => {
    const clientRegex = /(?:pour|de|client|grossiste|fournisseur|a)\s+([A-Za-z]+)/i
    const clientMatch = text.match(clientRegex)
    if (clientMatch) {
      const name = clientMatch[1].trim()
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "Client anonyme"
  }

  const getCategoryTotals = () => {
    let alimentation = allSales.filter(s => s.type === 'cash_in' || s.type === 'payment_client').reduce((sum, s) => sum + s.total, 0)
    let stockMarchandise = allSales.filter(s => s.type === 'purchase_cash').reduce((sum, s) => sum + s.total, 0)
    let stockCredit = allSales.filter(s => s.type === 'purchase_credit').reduce((sum, s) => sum + s.total, 0)
    let remboursement = allSales.filter(s => s.type === 'payment_client' || s.type === 'payment_supplier').reduce((sum, s) => sum + s.total, 0)
    let grossiste = allSales.filter(s => s.type === 'payment_supplier').reduce((sum, s) => sum + s.total, 0)
    let energie = allSales.filter(s => s.type === 'cash_out' && (s.notes.toLowerCase().includes('sbee') || s.notes.toLowerCase().includes('courant') || s.notes.toLowerCase().includes('elec') || s.notes.toLowerCase().includes('ampoule') || s.notes.toLowerCase().includes('transport'))).reduce((sum, s) => sum + s.total, 0)

    const total = alimentation + stockMarchandise + stockCredit + remboursement + grossiste + energie

    return [
      { name: 'Alimentation', amount: alimentation, percentage: total > 0 ? Math.round((alimentation / total) * 100) : 0, color: 'bg-blue-600' },
      { name: 'Stock / Marchandise', amount: stockMarchandise, percentage: total > 0 ? Math.round((stockMarchandise / total) * 100) : 0, color: 'bg-emerald-600' },
      { name: 'Stock Crédit', amount: stockCredit, percentage: total > 0 ? Math.round((stockCredit / total) * 100) : 0, color: 'bg-rose-600' },
      { name: 'Remboursement', amount: remboursement, percentage: total > 0 ? Math.round((remboursement / total) * 100) : 0, color: 'bg-teal-600' },
      { name: 'Grossiste', amount: grossiste, percentage: total > 0 ? Math.round((grossiste / total) * 100) : 0, color: 'bg-purple-600' },
      { name: 'Énergie / SBEE', amount: energie, percentage: total > 0 ? Math.round((energie / total) * 100) : 0, color: 'bg-red-500' },
    ]
  }

  const getTopItems = () => {
    const itemMap: { [name: string]: { qty: number; amount: number } } = {}

    allSales.forEach(sale => {
      if (sale.status === 'crossed_out') return
      sale.articles.forEach(art => {
        const name = art.name.trim()
        if (!itemMap[name]) {
          itemMap[name] = { qty: 0, amount: 0 }
        }
        itemMap[name].qty += art.quantity
        itemMap[name].amount += art.quantity * art.unit_price
      })
    })

    return Object.entries(itemMap).map(([name, data]) => ({
      name,
      qty: data.qty,
      amount: data.amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }

  const parseTextLocallyClientSide = (text: string, penColor: string) => {
    const articles: any[] = []
    let totalFacture = 0
    
    const articleRegex = /(\d+)\s*(.*?)\s*(?:à|a|@|\s)\s*(\d+)/gi
    let match
    
    while ((match = articleRegex.exec(text)) !== null) {
      const qty = parseInt(match[1], 10)
      const name = match[2].trim() || "Article(s)"
      const price = parseInt(match[3], 10)

      if (qty > 1 && qty >= price) {
        continue
      }

      articles.push({
        nom: name,
        quantite: qty,
        prix_unitaire: price
      })
      totalFacture += qty * price
    }
    
    if (articles.length === 0) {
      const amountRegex = /(?:total|montant|somme|de)?\s*(\d{3,7})(?:\s*f|\s*fcfa|\s*cfa|\s*francs)?/i
      const amountMatch = text.match(amountRegex)
      if (amountMatch) {
        const amount = parseInt(amountMatch[1], 10)
        totalFacture = amount
        articles.push({
          nom: "Transaction générale",
          quantite: 1,
          prix_unitaire: amount
        })
      }
    }

    let nomClient = "Client anonyme"
    const clientRegex = /(?:pour|de|client|grossiste|fournisseur|a)\s+([A-Za-z]+)/i
    const clientMatch = text.match(clientRegex)
    if (clientMatch) {
      nomClient = clientMatch[1].trim()
      nomClient = nomClient.charAt(0).toUpperCase() + nomClient.slice(1)
    }

    return {
      nom_client: nomClient,
      articles,
      total_facture: totalFacture,
      montant_paye: (penColor === 'yellow' || penColor === 'purple') ? 0 : totalFacture,
      montant_dette: (penColor === 'yellow' || penColor === 'purple') ? totalFacture : 0
    }
  }

  const submitTransaction = async (bodyData: { text: string; penColor: string; overrideData?: any }) => {
    if (!mappedUser) return
    setLoading(true)
    setPostItWarning(null)

    const online = typeof window !== 'undefined' ? window.navigator.onLine : false
    const shopId = mappedUser.shop_id

    try {
      if (isConfigured && online) {
        // Mode en ligne -> Envoyer à l'API
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-shop-id': shopId
          },
          body: JSON.stringify(bodyData),
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.isSafeguardTriggered) {
            setPostItWarning(data.error)
          } else {
            throw new Error(data.error || 'Erreur lors de l\'enregistrement')
          }
          return
        }
      } else {
        // Mode hors-ligne / local fallback -> Enregistrer localement dans le cache localStorage
        let parsed: any = null
        const color = bodyData.penColor
        const text = bodyData.text

        if (bodyData.overrideData) {
          parsed = {
            nom_client: bodyData.overrideData.client_name || "Client anonyme",
            articles: bodyData.overrideData.articles.map((a: any) => ({
              nom: a.name || a.nom,
              quantite: a.quantity || a.quantite,
              prix_unitaire: a.unit_price || a.prix_unitaire
            })),
            total_facture: bodyData.overrideData.total_amount,
            montant_paye: bodyData.overrideData.paid_amount,
            montant_dette: bodyData.overrideData.debt_amount
          }
        } else {
          parsed = parseTextLocallyClientSide(text, color)
        }

        // Déterminer le type
        let type = 'cash_in'
        if (color === 'red') type = 'cash_out'
        else if (color === 'green') type = 'purchase_cash'
        else if (color === 'purple') type = 'purchase_credit'
        else if (color === 'yellow') type = 'sale_credit'

        // Safeguard tiroir caisse
        const isExpense = type === 'cash_out' || type === 'purchase_cash'
        const expenseAmount = parsed.total_facture

        if (isExpense && tiroirCaisse < expenseAmount) {
          setPostItWarning(`Opération bloquée : Solde insuffisant dans le tiroir-caisse. Il vous manque ${expenseAmount - tiroirCaisse} FCFA.`)
          return
        }

        // Créer l'objet transaction
        const now = new Date()
        const dateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' })
        const newSale = {
          id: Math.random().toString(36).substring(2, 9),
          shop_id: shopId,
          date: dateStr,
          time: timeStr,
          client: parsed.nom_client, // mapping standard de l'objet
          total: parsed.total_facture, // mapping standard de l'objet
          paid: parsed.montant_paye, // mapping standard de l'objet
          debt: parsed.montant_dette, // mapping standard de l'objet
          status: parsed.montant_dette > 0 ? 'debt' : 'paid',
          type: type,
          pen_color: color,
          notes: text,
          articles: parsed.articles.map((a: any) => ({
            name: a.nom,
            quantity: a.quantite,
            unit_price: a.prix_unitaire
          })),
          created_at: now.toISOString(),
          is_synced: false
        }

        // Insérer dans les ventes caches
        const offlineSales = JSON.parse(localStorage.getItem(`cahier_offline_sales_${shopId}`) || '[]')
        offlineSales.push(newSale)
        localStorage.setItem(`cahier_offline_sales_${shopId}`, JSON.stringify(offlineSales))

        // Mettre à jour les dettes si nécessaire
        if (parsed.montant_dette > 0) {
          if (type === 'sale_credit') {
            const clientsList = JSON.parse(localStorage.getItem(`cahier_offline_clients_${shopId}`) || '[]')
            const existingClient = clientsList.find((c: any) => c.client_name?.toLowerCase() === parsed.nom_client.toLowerCase())
            if (existingClient) {
              existingClient.amount = (existingClient.amount || 0) + parsed.montant_dette
            } else {
              clientsList.push({
                client_name: parsed.nom_client,
                amount: parsed.montant_dette
              })
            }
            localStorage.setItem(`cahier_offline_clients_${shopId}`, JSON.stringify(clientsList))
          } else if (type === 'purchase_credit') {
            const suppliersList = JSON.parse(localStorage.getItem(`cahier_offline_suppliers_${shopId}`) || '[]')
            const existingSupplier = suppliersList.find((s: any) => s.client_name?.toLowerCase() === parsed.nom_client.toLowerCase())
            if (existingSupplier) {
              existingSupplier.amount = (existingSupplier.amount || 0) + parsed.montant_dette
            } else {
              suppliersList.push({
                client_name: parsed.nom_client,
                amount: parsed.montant_dette
              })
            }
            localStorage.setItem(`cahier_offline_suppliers_${shopId}`, JSON.stringify(suppliersList))
          }
        }
      }

      setInput('')
      await loadFinancialData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setPostItWarning(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // 1. Nettoyer les espaces, points et virgules entre les chiffres (ex: "12 000" ou "12.000" -> "12000")
    const sanitizedInput = input.trim().replace(/(\d)[.,\s]+(?=\d)/g, "$1")

    // 2. Chercher le motif de calcul avec nom d'article optionnel
    const match = sanitizedInput.match(/(\d+)\s*(.*?)\s*(?:à|a|@|\s)\s*(\d+)/i)
    if (match) {
      const quantity = parseInt(match[1], 10)
      const item = match[2].trim() || "Article(s)"
      const amount = parseInt(match[3], 10)

      // Seulement si la quantité est cohérente (supérieure à 1, plus petite que le montant, et max 1000)
      if (quantity > 1 && quantity < amount && quantity <= 1000) {
        setCalculationQuery({
          quantity,
          item,
          amount,
          rawText: sanitizedInput,
          penColor: selectedPen
        })
        return
      }
    }

    await submitTransaction({
      text: sanitizedInput,
      penColor: selectedPen
    })
  }

  const handleSaleCrossedOut = () => {
    loadFinancialData()
  }

  const handleError = (err: string) => {
    setPostItWarning(err)
  }

  // Nombre d'anneaux du classeur spiral
  const spiralRings = Array.from({ length: 20 })
  const currentPen = PENS.find(p => p.id === selectedPen) || PENS[0]

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center">
        <Loader className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    )
  }

  if (!user && !localDemo) {
    return <AuthScreen 
      onBypass={(role) => {
        setDemoRole(role)
        // Create a synthetic demo user so mappedUser resolves correctly
        setUser({
          id: `demo-${role}-001`,
          email: `demo-${role}@cahier.local`,
          full_name: role === 'owner' ? '👑 Démo Propriétaire' : '🙋 Démo Gérant',
          role: role,
          shop_id: role === 'owner' ? 'demo-owner-shop' : 'demo-owner-shop'
        })
      }}
      onLoginSuccess={(usr) => setUser(usr)}
    />
  }

  return (
    <main className="min-h-dvh md:min-h-screen md:py-8 md:px-4 max-w-7xl mx-auto flex flex-col md:gap-6 relative overflow-x-hidden">
      
      {/* Lamp Highlight overlay for desk immersion */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500 opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Main Tabbed Cahier Layout Container */}
      <div className="flex-grow flex flex-col relative z-10 max-w-5xl mx-auto w-full h-full">

        {/* Notebook Main Open Plate Chassis */}
        <div className="bg-[#fdfaf2] md:rounded-3xl border-0 md:border border-gray-300 shadow-none md:shadow-2xl flex relative z-0 h-dvh md:h-[720px] overflow-hidden w-full max-w-full">
          
          {/* Left leather cover binder spine */}
          <div className="flex w-10 md:w-16 notebook-cover-left flex-col items-center justify-between py-6 md:py-12 z-10 flex-shrink-0 select-none">
            {/* Top brass screw */}
            <div className="brass-screw"></div>
            
            {/* Vertical gold letter spine title */}
            <div className="font-extrabold text-[7px] md:text-[9px] text-[#f59e0b] font-sans tracking-[0.2em] md:tracking-[0.4em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-85">
              Cahier de Caisse Intelligent
            </div>

            {/* Middle brass medallion */}
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[7px] md:text-[9px] font-bold font-mono my-2 md:my-4 shadow-md">
              <span className="scale-[0.8] md:scale-100">200</span>
              <span className="text-[4px] md:text-[5px] uppercase tracking-tighter -mt-0.5 md:mt-0 select-none">PAGES</span>
            </div>

            {/* Bottom brass screw */}
            <div className="brass-screw"></div>
          </div>

          {/* Spiral loops */}
          <div className="flex absolute left-[32px] md:left-[54px] top-0 bottom-0 w-4 md:w-5 flex-col items-center justify-around py-4 md:py-6 z-20 pointer-events-none">
            {spiralRings.map((_, i) => (
              <div 
                key={i} 
                className="w-5 md:w-8 h-2 md:h-3.5 spiral-ring"
              ></div>
            ))}
          </div>

          {/* Right Page ( Ivory Seyes Lined Paper ) */}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-[#fdfaf2] relative">
            
            {/* Header Area Inside the page */}
            <div className="px-3 py-2 md:p-6 md:pb-4 border-b border-dashed border-sky-300 border-opacity-40 select-none">
              {/* Top row: title + logout */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl md:text-3xl">📖</span>
                  <h1 className="text-base md:text-2xl font-bold text-gray-900 font-handwritten truncate">
                    Cahier de Caisse Intelligent
                  </h1>
                  {/* Role + boutique badge */}
                  <span className={`hidden sm:inline text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    mappedUser?.role === 'employee' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {mappedUser?.role === 'employee' ? '🙋' : '👑'} {mappedUser?.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Déconnexion"
                  className="flex-shrink-0 text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider border border-red-200 rounded-full px-2 py-1 transition-colors"
                >
                  Quitter
                </button>
              </div>

              {/* KPIs — horizontal scroll on mobile */}
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="bg-[#fffdf9] border border-emerald-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide whitespace-nowrap">💰 Tiroir Cash</span>
                  <span className="font-mono text-sm font-bold text-emerald-950 mt-0.5 whitespace-nowrap">{formatPrice(tiroirCaisse)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-rose-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wide whitespace-nowrap">🔴 Crédits dehors</span>
                  <span className="font-mono text-sm font-bold text-rose-950 mt-0.5 whitespace-nowrap">{formatPrice(argentDehors)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-purple-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm flex-shrink-0">
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wide whitespace-nowrap">🟣 Nos Dettes</span>
                  <span className="font-mono text-sm font-bold text-purple-950 mt-0.5 whitespace-nowrap">{formatPrice(nosDettes)}</span>
                </div>
              </div>
            </div>

            {/* In-page horizontal tab bar — scrollable, matches desktop look inside the page */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 bg-[#f7f3ea] select-none flex-shrink-0">
              <button
                onClick={() => setActiveTab('cahier')}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  activeTab === 'cahier'
                    ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                }`}
              >
                <Notebook className="w-3.5 h-3.5" />
                Mon Cahier
              </button>
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('dettes')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'dettes'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                  }`}
                >
                  <BookText className="w-3.5 h-3.5" />
                  Livre des Dettes
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('trends')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'trends'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analyse Marché
                </button>
              )}
              {mappedUser?.role !== 'employee' && (
                <button
                  onClick={() => setActiveTab('archives')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'archives'
                      ? 'border-gray-800 text-gray-900 bg-[#fdfaf2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-[#f0ebe0]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  Placard d'Archive
                </button>
              )}
            </div>

            {/* Content view based on active tab */}
            <div className="flex-1 overflow-hidden flex flex-col">
              
              {activeTab === 'cahier' && (
                <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
                  
                  {/* Pen selector — compact circles on mobile, pills on desktop */}
                  <div className="px-3 md:px-6 py-2 md:py-3 border-b border-gray-100 flex items-center gap-2 md:gap-4 bg-white bg-opacity-40 select-none z-10 overflow-x-auto scrollbar-hide">
                    <span className="hidden md:block text-xs font-bold text-gray-500 font-mono tracking-wider flex-shrink-0">
                      🖊️ STYLO BIC :
                    </span>
                    <div className="flex gap-2 md:gap-2 flex-nowrap">
                      {PENS.map((pen) => {
                        const isSelected = selectedPen === pen.id
                        return (
                          <button
                            key={pen.id}
                            type="button"
                            title={pen.name}
                            onClick={() => setSelectedPen(pen.id)}
                            className={`flex items-center gap-1.5 transition-all flex-shrink-0 ${
                              isSelected
                                ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105`
                                : 'bg-white bg-opacity-65 border-gray-200 text-gray-600 hover:bg-white'
                            } 
                            md:px-3 md:py-1 md:rounded-full md:border md:text-[10px] md:font-bold md:tracking-wide
                            px-2.5 py-2.5 rounded-full border`}
                          >
                            <span className={`w-2.5 h-2.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${pen.dotBg}`}></span>
                            <span className="hidden md:inline text-[10px] font-bold tracking-wide">{pen.name}</span>
                          </button>
                        )
                      })}
                    </div>
                    {/* Show current pen label on mobile */}
                    <span className="md:hidden text-[10px] font-bold text-gray-600 flex-shrink-0 ml-1">
                      {PENS.find(p => p.id === selectedPen)?.name}
                    </span>
                  </div>

                  {/* Scrollable Seyes lined area inside the page */}
                  <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto lined-paper scroll-smooth"
                  >
                    {sales.length > 0 ? (
                      <SalesHistory 
                        sales={sales} 
                        onSaleCrossedOut={handleSaleCrossedOut} 
                        onError={handleError} 
                        shopId={mappedUser?.shop_id}
                        isEmployee={mappedUser?.role === 'employee'}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-24 text-center min-h-[350px] no-underline">
                        <p className="font-handwritten text-3xl text-gray-400">
                          Cahier vierge pour aujourd'hui
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Sélectionnez une couleur d'encre et tapez une écriture ci-dessous.
                        </p>
                      </div>
                    )}
                  </div>
 
                  {/* Sticky writing input bar pinned to the bottom of the page */}
                  <form 
                    onSubmit={handleSubmit}
                    className="relative bg-[#fefdfa] border-t border-gray-200 py-3 pl-12 md:pl-24 pr-3 md:pr-6 flex items-center gap-2 md:gap-4 z-10 shadow-lg"
                  >
                    {/* Red margin line — responsive */}
                    <div className="absolute left-[40px] md:left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>
 
                    {/* Clock — positioned in left margin */}
                    <div className="absolute left-1 md:left-4 font-mono text-[9px] md:text-xs text-gray-400 font-bold select-none w-8 md:w-14 text-right pr-1 md:pr-2">
                      ⏰ {currentTime}
                    </div>

                    <input
                      type="text"
                      placeholder={currentPen.placeholder}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      className={`flex-grow bg-transparent text-lg border-0 outline-none focus:ring-0 font-handwritten px-2 ${currentPen.textClass}`}
                    />

                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-gray-900 hover:bg-black disabled:opacity-40 text-white flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 active:scale-95"
                    >
                      {loading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>

                    {/* Post-it calculette de monnaie — INSIDE the form, s'ouvre vers le haut */}
                    <div className={`absolute right-4 bottom-full mb-2 z-30 transition-all duration-300 ${
                      showChangeCalc
                        ? 'w-64 bg-amber-100 border border-amber-300 shadow-xl p-4 rotate-1 rounded-sm'
                        : 'w-36 bg-amber-200 hover:bg-[#fef08a] border border-amber-300 shadow-md p-2 cursor-pointer rotate-2 text-center rounded-sm'
                    } select-none`}>
                      {/* Ruban adhésif */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-4 bg-gray-300 bg-opacity-60 -rotate-2"></div>

                      {!showChangeCalc ? (
                        <div onClick={() => {
                          if (sales.length > 0) {
                            setChangeTotal(sales[0].total.toString())
                          }
                          setShowChangeCalc(true)
                        }} className="pt-2">
                          <span className="text-xl">💵</span>
                          <p className="font-handwritten font-bold text-amber-900 text-xs mt-1">Calculer la monnaie</p>
                        </div>
                      ) : (
                        <div className="flex flex-col text-left">
                          <div className="flex justify-between items-center border-b border-amber-200 pb-1 mb-2">
                            <span className="font-handwritten font-bold text-amber-900 text-sm">💵 Rendu de Monnaie</span>
                            <button type="button" onClick={() => setShowChangeCalc(false)} className="text-[10px] text-amber-700 hover:text-amber-900 font-bold font-mono">X</button>
                          </div>

                          {/* Input Total */}
                          <div className="mb-2">
                            <label className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">À payer (FCFA) :</label>
                            <input
                              type="number"
                              placeholder="Ex: 6000"
                              value={changeTotal}
                              onChange={(e) => setChangeTotal(e.target.value)}
                              className="w-full bg-white bg-opacity-70 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-amber-500"
                            />
                            {sales.length > 0 && sales[0].total !== parseInt(changeTotal) && (
                              <button
                                type="button"
                                onClick={() => setChangeTotal(sales[0].total.toString())}
                                className="text-[8px] font-mono text-amber-800 underline mt-0.5 block"
                              >
                                Dernier total ({sales[0].total} F)
                              </button>
                            )}
                          </div>

                          {/* Input Client Paid */}
                          <div className="mb-2">
                            <label className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">Reçu du client :</label>
                            <input
                              type="number"
                              placeholder="Ex: 10000"
                              value={changeReceived}
                              onChange={(e) => setChangeReceived(e.target.value)}
                              className="w-full bg-white bg-opacity-70 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-amber-500"
                            />

                            {/* Quick Cash Buttons */}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {[1000, 2000, 5000, 10000].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setChangeReceived(val.toString())}
                                  className="text-[8px] font-mono bg-white bg-opacity-90 border border-amber-300 px-1 rounded hover:bg-amber-50 text-amber-950 font-bold"
                                >
                                  {val} F
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Result Section */}
                          {parseInt(changeReceived) > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-amber-300">
                              {parseInt(changeReceived) >= (parseInt(changeTotal) || 0) ? (
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-amber-800 tracking-wider font-sans">À rendre :</div>
                                  <div className="font-handwritten text-xl font-bold text-emerald-800 mt-0.5">
                                    {parseInt(changeReceived) - (parseInt(changeTotal) || 0)} F
                                  </div>
                                  <div className="text-[8px] font-mono text-gray-700 mt-1 leading-tight">
                                    {(() => {
                                      const diff = parseInt(changeReceived) - (parseInt(changeTotal) || 0)
                                      if (diff === 0) return "Compte juste, rien à rendre."
                                      const bills: string[] = []
                                      let rem = diff
                                      const denom = [
                                        { value: 10000, label: '10k F' },
                                        { value: 5000, label: '5k F' },
                                        { value: 2000, label: '2k F' },
                                        { value: 1000, label: '1k F' },
                                        { value: 500, label: '500 F' },
                                      ]
                                      denom.forEach(d => {
                                        const count = Math.floor(rem / d.value)
                                        if (count > 0) {
                                          bills.push(`${count}x ${d.label}`)
                                          rem %= d.value
                                        }
                                      })
                                      if (rem > 0) bills.push(`${rem} F`)
                                      return "💵 Rendre : " + bills.join(" + ")
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[9px] font-sans font-bold text-red-700">
                                  Reçu insuffisant.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </form>

                </div>
              )}

              {activeTab === 'dettes' && (
                <div className="flex-1 overflow-hidden p-3 md:p-6 flex flex-col pb-16 md:pb-0">
                  <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} shopId={mappedUser?.shop_id} />
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0">
                  
                  {/* Secondary navigation bar inside the page */}
                  <div className="flex gap-4 mb-6 select-none">
                    <button
                      onClick={() => setActiveTab('trends')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-[#005f54] text-white shadow"
                    >
                      📝 Analyse des Tendances
                    </button>
                    <button
                      onClick={() => setActiveTab('archives')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-white bg-opacity-65 text-gray-600 hover:text-gray-900 border border-gray-200"
                    >
                      📁 Placard d'Archives
                    </button>
                  </div>

                  <div className="border-b border-dashed border-sky-300 border-opacity-40 pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 font-handwritten">
                      Statistiques du Marché & Éléments Structurés
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">
                      COLLECTE DE TENDANCES (ARRIÈRE-PLAN)
                    </p>
                  </div>

                  {/* Two column grid matching the screenshot */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
                    
                    {/* Left Column: Répartition de l'activité */}
                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-sans">
                          📊 RÉPARTITION DE L'ACTIVITÉ (VOLUME)
                        </h3>
                      </div>

                      <div className="space-y-4 pt-2">
                        {getCategoryTotals().reduce((sum, c) => sum + c.amount, 0) > 0 ? (
                          getCategoryTotals().map((cat) => (
                            <div key={cat.name} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-gray-800">
                                <span className="font-handwritten text-lg">{cat.name}</span>
                                <span className="font-mono">{formatPrice(cat.amount)} ({cat.percentage}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden border border-gray-300">
                                <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.percentage}%` }}></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-3xl mb-2">📊</span>
                            <p className="font-handwritten text-lg text-gray-500 font-bold">Aucune activité enregistrée.</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">Vos statistiques de caisse s'afficheront ici en temps réel.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Top Marchandises Émergentes */}
                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-sans">
                          📦 TOP MARCHANDISES ÉMERGENTES
                        </h3>
                      </div>

                      <div className="space-y-3 pt-2">
                        {getTopItems().length > 0 ? (
                          getTopItems().map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 border-b border-gray-100 pb-2">
                              {/* Circular number index */}
                              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 select-none">
                                {idx + 1}
                              </div>
                              {/* Item Name */}
                              <div className="flex-grow">
                                <span className="font-handwritten text-lg text-gray-800 font-bold leading-none block">
                                  {item.name}
                                </span>
                              </div>
                              {/* Price / Qty */}
                              <div className="text-right flex flex-col font-mono">
                                <span className="text-xs font-bold text-emerald-700">{formatPrice(item.amount)}</span>
                                <span className="text-[10px] text-gray-400">Qté : {item.qty} {item.qty > 1 ? 'units' : 'unit'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-3xl mb-2">📦</span>
                            <p className="font-handwritten text-lg text-gray-500 font-bold">Aucune vente enregistrée.</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">Les produits vendus avec leur quantité s'afficheront ici.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* PLACARD D'ARCHIVE */}
              {activeTab === 'archives' && (
                <div className="flex-grow p-3 md:p-6 overflow-y-auto flex flex-col h-full pb-16 md:pb-0">
                  
                  {/* Secondary navigation bar inside the page */}
                  <div className="flex gap-4 mb-6 select-none">
                    <button
                      onClick={() => setActiveTab('trends')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-white bg-opacity-65 text-gray-600 hover:text-gray-900 border border-gray-200"
                    >
                      📝 Analyse des Tendances
                    </button>
                    <button
                      onClick={() => setActiveTab('archives')}
                      className="px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-[#005f54] text-white shadow"
                    >
                      📁 Placard d'Archives
                    </button>
                  </div>

                  <div className="border-b border-dashed border-sky-300 border-opacity-40 pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 font-handwritten">
                      📖 Archives Générales du Cahier
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono uppercase tracking-wider">
                      HISTORIQUE DE TOUTES LES PAGES ÉCRITES
                    </p>
                  </div>

                  {/* Scrollable Seyes lined area showing all historical sales */}
                  <div className="flex-grow overflow-y-auto lined-paper pb-20 scroll-smooth">
                    {allSales.length > 0 ? (
                      <SalesHistory 
                        sales={allSales} 
                        onSaleCrossedOut={handleSaleCrossedOut} 
                        onError={handleError} 
                        shopId={mappedUser?.shop_id}
                        isEmployee={mappedUser?.role === 'employee'}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-24 text-center min-h-[350px]">
                        <p className="font-handwritten text-3xl text-gray-400">
                          Placard d'archives vide
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          Aucune transaction enregistrée historiquement.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>

      </div>

      {/* Sticky warning post-it card rendered over the center of the screen */}
      {postItWarning && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 transition-all flex flex-col items-center text-center">
          <div className="absolute -top-3 w-16 h-6 bg-gray-300 bg-opacity-70 -rotate-3"></div>
          <AlertTriangle className="w-8 h-8 text-amber-700 mb-2" />
          <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide handwritten mb-2">
            ⚠️ Opération Bloquée !
          </h4>
          <p className="text-amber-850 text-sm font-medium handwritten leading-relaxed">
            {postItWarning}
          </p>
          <button
            type="button"
            onClick={() => setPostItWarning(null)}
            className="mt-4 px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded shadow handwritten"
          >
            Fermer l'alerte
          </button>
        </div>
      )}

      {/* Sticky calculation helper post-it card rendered over the center of the screen */}
      {calculationQuery && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-[420px] bg-amber-100 border-2 border-amber-300 shadow-2xl p-4 md:p-6 -rotate-1 transition-all flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
          <div className="absolute -top-3 w-20 h-6 bg-gray-300 bg-opacity-70 rotate-2"></div>
          
          <h4 className="font-bold text-amber-900 text-lg uppercase tracking-wide handwritten mb-2 text-2xl">
            🧮 Aide au Calcul
          </h4>
          
          <p className="text-gray-800 text-sm font-medium leading-relaxed handwritten text-lg mb-4">
            Vous écrivez : <span className="underline italic">"{calculationQuery.rawText}"</span>.
            <br />
            Comment souhaitez-vous calculer <strong>{calculationQuery.amount} F</strong> pour les <strong>{calculationQuery.quantity} {calculationQuery.item}</strong> ?
          </p>

          <div className="w-full flex flex-col gap-3">
            {/* Option A (Unitaire) */}
            <button
              type="button"
              onClick={async () => {
                const total = calculationQuery.quantity * calculationQuery.amount
                const clientName = parseClientName(calculationQuery.rawText)
                await submitTransaction({
                  text: calculationQuery.rawText,
                  penColor: calculationQuery.penColor,
                  overrideData: {
                    articles: [{
                      name: calculationQuery.item,
                      quantity: calculationQuery.quantity,
                      unit_price: calculationQuery.amount
                    }],
                    total_amount: total,
                    paid_amount: (calculationQuery.penColor === 'yellow' || calculationQuery.penColor === 'purple') ? 0 : total,
                    debt_amount: (calculationQuery.penColor === 'yellow' || calculationQuery.penColor === 'purple') ? total : 0,
                    client_name: clientName
                  }
                })
                setCalculationQuery(null)
              }}
              className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-left transition-all hover:scale-[1.01]"
            >
              <div className="font-bold text-emerald-950 text-xs uppercase font-sans">
                Option 1 : Prix unitaire
              </div>
              <div className="handwritten text-emerald-800 text-base mt-1">
                Chaque {calculationQuery.item} coûte {calculationQuery.amount} F ({calculationQuery.amount} F × {calculationQuery.quantity})
              </div>
              <div className="font-mono text-emerald-950 font-extrabold text-sm mt-0.5">
                Total à enregistrer = {formatPrice(calculationQuery.quantity * calculationQuery.amount)}
              </div>
            </button>

            {/* Option B (Total) */}
            <button
              type="button"
              onClick={async () => {
                const clientName = parseClientName(calculationQuery.rawText)
                await submitTransaction({
                  text: calculationQuery.rawText,
                  penColor: calculationQuery.penColor,
                  overrideData: {
                    articles: [{
                      name: calculationQuery.item,
                      quantity: calculationQuery.quantity,
                      unit_price: Math.round(calculationQuery.amount / calculationQuery.quantity)
                    }],
                    total_amount: calculationQuery.amount,
                    paid_amount: (calculationQuery.penColor === 'yellow' || calculationQuery.penColor === 'purple') ? 0 : calculationQuery.amount,
                    debt_amount: (calculationQuery.penColor === 'yellow' || calculationQuery.penColor === 'purple') ? calculationQuery.amount : 0,
                    client_name: clientName
                  }
                })
                setCalculationQuery(null)
              }}
              className="w-full p-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xl text-left transition-all hover:scale-[1.01]"
            >
              <div className="font-bold text-purple-950 text-xs uppercase font-sans">
                Option 2 : Prix global
              </div>
              <div className="handwritten text-purple-800 text-base mt-1">
                Le lot complet de {calculationQuery.quantity} {calculationQuery.item} coûte {calculationQuery.amount} F (soit {Math.round(calculationQuery.amount / calculationQuery.quantity)} F par {calculationQuery.item})
              </div>
              <div className="font-mono text-purple-950 font-extrabold text-sm mt-0.5">
                Total à enregistrer = {formatPrice(calculationQuery.amount)}
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCalculationQuery(null)}
            className="mt-5 text-gray-500 hover:text-gray-800 font-bold text-xs uppercase tracking-wider font-sans underline"
          >
            Annuler et corriger
          </button>
        </div>
      )}

      {/* Notebook Spine Footer */}
      <footer className="text-center text-[10px] text-[#8e857b]/60 font-mono py-2 uppercase tracking-widest mt-auto z-10 select-none">
        CAHIER NO. 200 • WEST AFRICA MARKET RD.
      </footer>

    </main>
  )
}
