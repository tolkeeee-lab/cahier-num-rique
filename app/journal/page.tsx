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
  const [authLoading, setAuthLoading] = useState(true)
  const [localDemo, setLocalDemo] = useState(false)

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
    if (user || localDemo) {
      loadFinancialData()
    }
    // Mettre à jour l'horloge
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [user, localDemo])

  const handleLogout = async () => {
    localStorage.removeItem('cahier_mock_session')
    if (localDemo) {
      setLocalDemo(false)
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

  const loadFinancialData = async () => {
    try {
      let salesList = []
      let clientsList = []
      let suppliersList = []

      const online = typeof window !== 'undefined' ? window.navigator.onLine : false

      if (isConfigured && online) {
        // En ligne -> charger via le réseau
        const response = await fetch('/api/sales')
        if (!response.ok) throw new Error('Erreur lors du chargement des écritures')
        const data = await response.json()
        salesList = data.sales || []

        const clientsRes = await fetch('/api/debts?type=client')
        const clientsData = await clientsRes.json()
        clientsList = clientsData.clients || []

        const suppliersRes = await fetch('/api/debts?type=supplier')
        const suppliersData = await suppliersRes.json()
        suppliersList = suppliersData.suppliers || []

        // Mettre en cache dans localStorage pour le mode hors-ligne
        localStorage.setItem('cahier_offline_sales', JSON.stringify(salesList))
        localStorage.setItem('cahier_offline_clients', JSON.stringify(clientsList))
        localStorage.setItem('cahier_offline_suppliers', JSON.stringify(suppliersList))
      } else {
        // Hors-ligne -> charger les caches
        salesList = JSON.parse(localStorage.getItem('cahier_offline_sales') || '[]')
        clientsList = JSON.parse(localStorage.getItem('cahier_offline_clients') || '[]')
        suppliersList = JSON.parse(localStorage.getItem('cahier_offline_suppliers') || '[]')
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
      const todayStr = new Date().toISOString().split('T')[0]
      const todaysSales = salesList.filter((s: any) => s.date === todayStr)
      
      setSales(todaysSales.reverse())
      setAllSales(salesList)

    } catch (err) {
      console.warn('Echec de chargement réseau, chargement du cache hors-ligne...', err)
      const salesList = JSON.parse(localStorage.getItem('cahier_offline_sales') || '[]')
      const clientsList = JSON.parse(localStorage.getItem('cahier_offline_clients') || '[]')
      const suppliersList = JSON.parse(localStorage.getItem('cahier_offline_suppliers') || '[]')

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

      const todayStr = new Date().toISOString().split('T')[0]
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
    
    const articleRegex = /(\d+)\s*(.*?)\s*(?:à|a|@)\s+(\d+)/gi
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
    setLoading(true)
    setPostItWarning(null)

    const online = typeof window !== 'undefined' ? window.navigator.onLine : false

    try {
      if (isConfigured && online) {
        // Mode en ligne -> Envoyer à l'API
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        const newSale = {
          id: Math.random().toString(36).substring(2, 9),
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
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
        const offlineSales = JSON.parse(localStorage.getItem('cahier_offline_sales') || '[]')
        offlineSales.push(newSale)
        localStorage.setItem('cahier_offline_sales', JSON.stringify(offlineSales))

        // Mettre à jour les dettes si nécessaire
        if (parsed.montant_dette > 0) {
          if (type === 'sale_credit') {
            const clientsList = JSON.parse(localStorage.getItem('cahier_offline_clients') || '[]')
            const existingClient = clientsList.find((c: any) => c.client_name?.toLowerCase() === parsed.nom_client.toLowerCase())
            if (existingClient) {
              existingClient.amount = (existingClient.amount || 0) + parsed.montant_dette
            } else {
              clientsList.push({
                client_name: parsed.nom_client,
                amount: parsed.montant_dette
              })
            }
            localStorage.setItem('cahier_offline_clients', JSON.stringify(clientsList))
          } else if (type === 'purchase_credit') {
            const suppliersList = JSON.parse(localStorage.getItem('cahier_offline_suppliers') || '[]')
            const existingSupplier = suppliersList.find((s: any) => s.client_name?.toLowerCase() === parsed.nom_client.toLowerCase())
            if (existingSupplier) {
              existingSupplier.amount = (existingSupplier.amount || 0) + parsed.montant_dette
            } else {
              suppliersList.push({
                client_name: parsed.nom_client,
                amount: parsed.montant_dette
              })
            }
            localStorage.setItem('cahier_offline_suppliers', JSON.stringify(suppliersList))
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
    const match = sanitizedInput.match(/(\d+)\s*(.*?)\s*(?:à|a|@)\s+(\d+)/i)
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
    return <AuthScreen onBypass={() => setLocalDemo(true)} onLoginSuccess={(usr) => setUser(usr)} />
  }

  return (
    <main className="min-h-screen py-8 px-4 max-w-7xl mx-auto flex flex-col gap-6 relative">
      
      {/* Lamp Highlight overlay for desk immersion */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500 opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Main Tabbed Cahier Layout Container */}
      <div className="flex-grow flex flex-col relative z-10 max-w-5xl mx-auto w-full">
        
        {/* School board divider tabs (Onglets d'écolier cartonné) */}
        <div className="flex pl-20 -mb-[2px] relative z-10 select-none">
          <button
            onClick={() => setActiveTab('cahier')}
            className={`notebook-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              activeTab === 'cahier'
                ? 'bg-[#fdfaf2] text-gray-900 border-t border-x border-gray-300 pb-3.5 z-20'
                : 'bg-[#cfc8bc] text-gray-700 border border-gray-300 hover:bg-[#dcd6c9]'
            }`}
          >
            <Notebook className="w-3.5 h-3.5" />
            MON CAHIER
          </button>
          <button
            onClick={() => setActiveTab('dettes')}
            className={`notebook-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 -ml-1 ${
              activeTab === 'dettes'
                ? 'bg-[#fdfaf2] text-gray-900 border-t border-x border-gray-300 pb-3.5 z-20'
                : 'bg-[#cfc8bc] text-gray-700 border border-gray-300 hover:bg-[#dcd6c9]'
            }`}
          >
            <BookText className="w-3.5 h-3.5" />
            LIVRE DES DETTES
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`notebook-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 -ml-1 ${
              (activeTab === 'trends')
                ? 'bg-[#fdfaf2] text-gray-900 border-t border-x border-gray-300 pb-3.5 z-20'
                : 'bg-[#cfc8bc] text-gray-700 border border-gray-300 hover:bg-[#dcd6c9]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            ANALYSE MARCHÉ
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`notebook-tab px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 -ml-1 ${
              activeTab === 'archives'
                ? 'bg-[#fdfaf2] text-gray-900 border-t border-x border-gray-300 pb-3.5 z-20'
                : 'bg-[#cfc8bc] text-gray-700 border border-gray-300 hover:bg-[#dcd6c9]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            PLACARD D'ARCHIVE
          </button>
        </div>

        {/* Notebook Main Open Plate Chassis */}
        <div className="bg-[#fdfaf2] rounded-3xl border border-gray-300 shadow-2xl flex relative z-0 h-[720px] overflow-hidden">
          
          {/* Left leather cover binder spine */}
          <div className="w-16 notebook-cover-left flex flex-col items-center justify-between py-12 z-10 flex-shrink-0 select-none">
            {/* Top brass screw */}
            <div className="brass-screw"></div>
            
            {/* Vertical gold letter spine title */}
            <div className="font-extrabold text-[9px] text-[#f59e0b] font-sans tracking-[0.4em] uppercase select-none my-auto whitespace-nowrap [writing-mode:vertical-lr] rotate-180 text-center opacity-85">
              Cahier de Caisse Intelligent
            </div>

            {/* Middle brass medallion */}
            <div className="w-10 h-10 rounded-full brass-medallion flex flex-col items-center justify-center text-[9px] font-bold font-mono my-4 shadow-md">
              <span>200</span>
              <span className="text-[5px] uppercase tracking-tighter">PAGES</span>
            </div>

            {/* Bottom brass screw */}
            <div className="brass-screw"></div>
          </div>

          {/* Copper/Brass Spiral loops column (absolute positioned over the spine border) */}
          <div className="absolute left-[54px] top-0 bottom-0 w-5 flex flex-col items-center justify-around py-6 z-20 pointer-events-none">
            {spiralRings.map((_, i) => (
              <div 
                key={i} 
                className="w-8 h-3.5 spiral-ring"
              ></div>
            ))}
          </div>

          {/* Right Page ( Ivory Seyes Lined Paper ) */}
          <div className="flex-1 flex flex-col h-full bg-[#fdfaf2] relative">
            
            {/* Header Area Inside the page */}
            <div className="p-6 pb-4 border-b border-dashed border-sky-300 border-opacity-40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-handwritten flex items-center gap-1.5 text-3xl">
                  📖 Cahier de Caisse Intelligent
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
                    200 PAGES • SANS MOBILE MONEY • 100% CASH
                  </p>
                  <span className="text-gray-300 text-[10px] select-none">•</span>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase tracking-wider underline transition-colors"
                  >
                    Fermer le cahier (Déconnexion)
                  </button>
                </div>
              </div>

              {/* Three Pillars KPIs inside the page header */}
              <div className="flex gap-3 flex-wrap">
                <div className="bg-[#fffdf9] border border-emerald-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm">
                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wide">💰 Argent dans le tiroir (Cash)</span>
                  <span className="font-mono text-sm font-bold text-emerald-950 mt-0.5">{formatPrice(tiroirCaisse)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-rose-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm">
                  <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wide">🔴 Argent dehors (Crédits)</span>
                  <span className="font-mono text-sm font-bold text-rose-950 mt-0.5">{formatPrice(argentDehors)}</span>
                </div>
                <div className="bg-[#fffdf9] border border-purple-200 rounded-xl px-3 py-1.5 flex flex-col shadow-sm">
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wide">🟣 Nos Dettes (Fournisseurs)</span>
                  <span className="font-mono text-sm font-bold text-purple-950 mt-0.5">{formatPrice(nosDettes)}</span>
                </div>
              </div>
            </div>

            {/* Content view based on active tab */}
            <div className="flex-1 overflow-hidden flex flex-col">
              
              {activeTab === 'cahier' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  
                  {/* Bic 4-couleurs selector bar inside the page */}
                  <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-4 bg-white bg-opacity-40 select-none z-10">
                    <span className="text-xs font-bold text-gray-500 font-mono tracking-wider">
                      🖊️ CHOISI TON STYLO BIC :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PENS.map((pen) => {
                        const isSelected = selectedPen === pen.id
                        return (
                          <button
                            key={pen.id}
                            type="button"
                            onClick={() => {
                              setSelectedPen(pen.id)
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wide transition-all ${
                              isSelected
                                ? `${pen.bg} ${pen.border} text-white shadow-sm scale-105`
                                : 'bg-white bg-opacity-65 border-gray-200 text-gray-600 hover:bg-white'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${pen.dotBg}`}></span>
                            {pen.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scrollable Seyes lined area inside the page */}
                  <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto lined-paper pb-20 scroll-smooth"
                  >
                    {sales.length > 0 ? (
                      <SalesHistory 
                        sales={sales} 
                        onSaleCrossedOut={handleSaleCrossedOut} 
                        onError={handleError} 
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
                    className="absolute bottom-0 left-0 right-0 bg-[#fefdfa] border-t border-gray-200 py-3 px-6 pl-24 flex items-center gap-4 z-10 shadow-lg"
                  >
                    {/* Red margin overlay line over the bottom bar for seamless notebook look */}
                    <div className="absolute left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

                    {/* Clock time representation on the left margin */}
                    <div className="absolute left-4 font-mono text-xs text-gray-400 font-bold select-none w-14 text-right pr-2">
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
                  </form>

                </div>
              )}

              {activeTab === 'dettes' && (
                <div className="flex-1 overflow-hidden p-6 flex flex-col">
                  <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} />
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="flex-grow p-6 overflow-y-auto flex flex-col h-full">
                  
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
                <div className="flex-grow p-6 overflow-y-auto flex flex-col h-full">
                  
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
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-amber-200 border-2 border-amber-300 shadow-2xl p-6 rotate-2 transition-all flex flex-col items-center text-center">
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
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-amber-100 border-2 border-amber-300 shadow-2xl p-6 -rotate-1 transition-all flex flex-col items-center text-center">
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
