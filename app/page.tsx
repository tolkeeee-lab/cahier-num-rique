'use client'

import React, { useState, useEffect, useRef } from 'react'
import { SalesHistory } from '@/components/SalesHistory'
import { DebtsBook } from '@/components/DebtsBook'
import { TrendingUp, Notebook, BookText, BarChart3, Send, Loader, AlertTriangle } from 'lucide-react'

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

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([])
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  
  const [activeTab, setActiveTab] = useState<'cahier' | 'dettes' | 'trends'>('cahier')
  
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
    loadFinancialData()
    // Mettre à jour l'horloge
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Faire défiler vers le bas lors de la mise à jour des ventes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [sales, activeTab])

  const loadFinancialData = async () => {
    try {
      // 1. Charger toutes les ventes
      const response = await fetch('/api/sales')
      if (!response.ok) throw new Error('Erreur lors du chargement des écritures')
      const data = await response.json()
      const salesList = data.sales || []

      // 2. Charger les dettes clients (argent dehors)
      const clientsRes = await fetch('/api/debts?type=client')
      const clientsData = await clientsRes.json()
      const clientsList = clientsData.clients || []

      // 3. Charger les dettes fournisseurs (nos dettes)
      const suppliersRes = await fetch('/api/debts?type=supplier')
      const suppliersData = await suppliersRes.json()
      const suppliersList = suppliersData.suppliers || []

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

      const clientDebtsSum = clientsList.reduce((sum: number, c: any) => sum + c.amount, 0)
      const supplierDebtsSum = suppliersList.reduce((sum: number, s: any) => sum + s.amount, 0)

      setTiroirCaisse(cash)
      setArgentDehors(clientDebtsSum)
      setNosDettes(supplierDebtsSum)

      // Filtrer les ventes pour afficher seulement celles d'aujourd'hui dans le journal
      const todayStr = new Date().toISOString().split('T')[0]
      const todaysSales = salesList.filter((s: any) => s.date === todayStr)
      
      // Trier par heure croissante pour avoir l'effet d'écriture chronologique de bas en haut ou haut en bas
      // Le plus ancien en haut, le plus récent en bas pour le défilement
      setSales(todaysSales.reverse())

    } catch (err) {
      console.error('Erreur:', err)
      setPostItWarning('Impossible de charger les statistiques financières.')
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

  const submitTransaction = async (bodyData: { text: string; penColor: string; overrideData?: any }) => {
    setLoading(true)
    setPostItWarning(null)

    try {
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

    // Format: [quantité] [article] à/a/@ [montant]
    const match = input.match(/(\d+)\s+([^0-9àa@\s][^0-9àa@]*?)\s+(?:à|a|@)\s+(\d+)/i)
    if (match) {
      const quantity = parseInt(match[1], 10)
      const item = match[2].trim()
      const amount = parseInt(match[3], 10)

      if (quantity > 1) {
        setCalculationQuery({
          quantity,
          item,
          amount,
          rawText: input.trim(),
          penColor: selectedPen
        })
        return
      }
    }

    await submitTransaction({
      text: input.trim(),
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
              activeTab === 'trends'
                ? 'bg-[#fdfaf2] text-gray-900 border-t border-x border-gray-300 pb-3.5 z-20'
                : 'bg-[#cfc8bc] text-gray-700 border border-gray-300 hover:bg-[#dcd6c9]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            ANALYSE MARCHÉ
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
                <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wide">
                  200 PAGES • SANS MOBILE MONEY • 100% CASH
                </p>
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
                <div className="flex-grow p-6 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Flux de trésorerie */}
                    <div className="bg-[#fffdfb] border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Flux de Trésorerie
                      </h3>
                      
                      <div className="space-y-3 font-mono text-sm pt-2">
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">Solde Cash disponible :</span>
                          <span className="font-bold text-emerald-600">{formatPrice(tiroirCaisse)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">Total Crédits en attente :</span>
                          <span className="font-bold text-red-600">{formatPrice(argentDehors)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">Total Dettes grossistes :</span>
                          <span className="font-bold text-purple-600">{formatPrice(nosDettes)}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-base font-extrabold border-t-2 border-gray-200">
                          <span className="text-gray-800">Bilan (Net Estimé) :</span>
                          <span className={(tiroirCaisse + argentDehors - nosDettes) >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                            {formatPrice(tiroirCaisse + argentDehors - nosDettes)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Conseils d'aide à la décision */}
                    <div className="bg-[#fffdfb] border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-gray-700">
                        💡 Conseils du Cahier Intelligent
                      </h3>
                      <div className="space-y-3 leading-relaxed text-gray-600 font-handwritten text-xl pt-2">
                        {tiroirCaisse < 5000 && (
                          <p className="text-red-700 font-semibold">
                            ⚠️ Ton tiroir-caisse est presque vide. Évite de faire des dépenses ou d'acheter du stock cash aujourd'hui.
                          </p>
                        )}
                        {argentDehors > tiroirCaisse && (
                          <p className="text-amber-850">
                            📌 Tu as plus d'argent dehors ({formatPrice(argentDehors)}) que dans ton tiroir. Relance tes clients débiteurs pour récupérer du liquide.
                          </p>
                        )}
                        {nosDettes > 0 && (
                          <p className="text-purple-800">
                            💼 Pense à rembourser tes grossistes dès que tu as des rentrées d'argent suffisantes pour garder une bonne relation de confiance.
                          </p>
                        )}
                        {tiroirCaisse >= 5000 && argentDehors === 0 && nosDettes === 0 && (
                          <p className="text-emerald-700">
                            ✅ Excellente gestion financière ! Tes dettes et crédits sont à zéro et tu as du liquide disponible en caisse.
                          </p>
                        )}
                        <p className="text-gray-500 mt-2 text-sm leading-normal">
                          Le cahier de caisse digital vous conseille d'équilibrer vos crédits pour toujours garder une encaisse de sécurité de 25 000 FCFA.
                        </p>
                      </div>
                    </div>

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
                {calculationQuery.amount} F l'unité × {calculationQuery.quantity} articles
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
                Le lot complet de {calculationQuery.quantity} coûte {calculationQuery.amount} F
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
