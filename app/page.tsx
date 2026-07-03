'use client'

import React, { useState, useEffect } from 'react'
import { SalesInput } from '@/components/SalesInput'
import { SalesHistory } from '@/components/SalesHistory'
import { DebtsBook } from '@/components/DebtsBook'
import { AlertCircle, TrendingUp, Notebook, BookText, BarChart3 } from 'lucide-react'

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

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([])
  const [tiroirCaisse, setTiroirCaisse] = useState(0)
  const [argentDehors, setArgentDehors] = useState(0)
  const [nosDettes, setNosDettes] = useState(0)
  
  const [activeTab, setActiveTab] = useState<'cahier' | 'dettes' | 'trends'>('cahier')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadFinancialData()
  }, [])

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
      setSales(todaysSales)

    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les statistiques financières.')
    }
  }

  const handleSaleRecorded = () => {
    loadFinancialData()
    setSuccessMessage('✓ Écriture enregistrée dans le cahier')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleSaleCrossedOut = () => {
    loadFinancialData()
    setSuccessMessage('✗ Écriture rayée avec succès')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleError = (err: string) => {
    setError(err)
    setTimeout(() => setError(null), 6000)
  }

  // Nombre d'anneaux du classeur spiral
  const spiralRings = Array.from({ length: 18 })

  return (
    <main className="min-h-screen py-8 px-4 max-w-7xl mx-auto flex flex-col gap-6 relative">
      
      {/* Lamp Highlight overlay for desk immersion */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500 opacity-[0.03] rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-4 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-amber-50/95 flex items-center gap-2">
            📔 Cahier de Caisse Intelligent
          </h1>
          <p className="text-xs text-amber-600/70 font-mono mt-1 uppercase tracking-widest">
            Séyès Premium • Cuir Émeraude • 100% CFA
          </p>
        </div>

        {/* The Three Pillars indicators on the header right (monospaced) */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-[#1e1a18] border border-emerald-900/40 rounded-xl px-4 py-2 flex flex-col">
            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Tiroir-Caisse</span>
            <span className="font-mono text-sm font-bold text-emerald-400 mt-0.5">{formatPrice(tiroirCaisse)}</span>
          </div>
          <div className="bg-[#1e1a18] border border-red-950/40 rounded-xl px-4 py-2 flex flex-col">
            <span className="text-[8px] font-bold text-red-500 uppercase tracking-wider">Argent Dehors</span>
            <span className="font-mono text-sm font-bold text-red-400 mt-0.5">{formatPrice(argentDehors)}</span>
          </div>
          <div className="bg-[#1e1a18] border border-purple-950/40 rounded-xl px-4 py-2 flex flex-col">
            <span className="text-[8px] font-bold text-purple-500 uppercase tracking-wider">Nos Dettes</span>
            <span className="font-mono text-sm font-bold text-purple-400 mt-0.5">{formatPrice(nosDettes)}</span>
          </div>
        </div>
      </header>

      {/* Les Trois Piliers Financiers (KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        
        {/* Tiroir Caisse */}
        <div className="bg-[#1e221d] rounded-2xl p-5 border border-emerald-950/60 shadow-md flex flex-col justify-between transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">
            💰 TIROIR-CAISSE (LIQUIDE CASH)
          </span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
            {formatPrice(tiroirCaisse)}
          </p>
          <span className="text-[10px] text-emerald-600 mt-2 font-handwritten text-base">
            Liquide disponible physiquement dans ton tiroir
          </span>
        </div>

        {/* Argent Dehors */}
        <div className="bg-[#241c1b] rounded-2xl p-5 border border-red-950/60 shadow-md flex flex-col justify-between transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase">
            🔴 ARGENT DEHORS (CRÉDITS CLIENTS)
          </span>
          <p className="text-2xl font-extrabold text-red-400 font-mono mt-2">
            {formatPrice(argentDehors)}
          </p>
          <span className="text-[10px] text-red-600 mt-2 font-handwritten text-base">
            Crédits octroyés à tes clients à recouvrer
          </span>
        </div>

        {/* Nos Dettes */}
        <div className="bg-[#221b24] rounded-2xl p-5 border border-purple-950/60 shadow-md flex flex-col justify-between transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-bold text-purple-500 tracking-wider uppercase">
            🟣 NOS DETTES (FOURNISSEURS)
          </span>
          <p className="text-2xl font-extrabold text-purple-400 font-mono mt-2">
            {formatPrice(nosDettes)}
          </p>
          <span className="text-[10px] text-purple-600 mt-2 font-handwritten text-base">
            Somme due aux grossistes pour stock à crédit
          </span>
        </div>
      </div>

      {/* Messages d'Alerte/Succès */}
      {error && !error.includes('Opération bloquée') && (
        <div className="p-4 bg-red-950/50 border border-red-800 rounded-2xl flex items-start gap-3 shadow-md relative z-10">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-2xl shadow-md relative z-10">
          <p className="text-sm text-emerald-200 font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Main Tabbed Cahier Layout Container */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* School board divider tabs (Onglets d'écolier cartonné) */}
        <div className="flex pl-20 -mb-[2px] relative z-10">
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
        <div className="flex-1 min-h-[620px] bg-[#fdfaf2] rounded-3xl border border-gray-300 shadow-2xl overflow-hidden flex relative z-0">
          
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
          <div className="flex-1 p-6 overflow-y-auto bg-[#fdfaf2] lined-paper pl-24">
            
            {activeTab === 'cahier' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                
                {/* Writing Input Column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-handwritten text-2xl">
                      Écrire une transaction
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Sélectionnez une couleur d'encre Bic puis décrivez votre vente/dépense.
                    </p>
                  </div>

                  <SalesInput onSaleRecorded={handleSaleRecorded} onError={handleError} />
                </div>

                {/* Day's Journal Column */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-handwritten text-2xl">
                      📖 Écritures de la journée
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Registre chronologique de vos opérations du jour.
                    </p>
                  </div>

                  {sales.length > 0 ? (
                    <SalesHistory 
                      sales={sales} 
                      onSaleCrossedOut={handleSaleCrossedOut} 
                      onError={handleError} 
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 bg-opacity-30 border border-dashed border-gray-300 rounded-2xl min-h-[300px]">
                      <p className="font-handwritten text-2xl text-gray-500">
                        Cahier vierge pour aujourd'hui
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-mono">
                        Aucune transaction écrite pour le moment.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'dettes' && (
              <div className="h-full">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-handwritten text-2xl">
                    📕 Livre des Dettes
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Gérez les remboursements de vos clients et les engagements envers vos fournisseurs grossistes.
                  </p>
                </div>
                <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} />
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="h-full flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-handwritten text-2xl">
                    📈 Analyse Marché & Caisse
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Suivi de votre trésorerie nette et conseils de gestion de caisse.
                  </p>
                </div>

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
                    <div className="space-y-3 leading-relaxed text-gray-600 font-handwritten text-lg pt-2">
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

      {/* Notebook Spine Footer */}
      <footer className="text-center text-[10px] text-[#8e857b]/60 font-mono py-2 uppercase tracking-widest mt-auto z-10 select-none">
        CAHIER NO. 200 • WEST AFRICA MARKET RD.
      </footer>

    </main>
  )
}
