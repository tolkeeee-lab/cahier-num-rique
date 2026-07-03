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
      // 1. Charger toutes les ventes pour calculer le tiroir caisse
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
  const spiralRings = Array.from({ length: 15 })

  return (
    <main className="min-h-screen py-8 px-4 max-w-7xl mx-auto flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            📔 Cahier de Caisse Intelligent
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1 uppercase tracking-wider">
            200 PAGES • SANS MOBILE MONEY • 100% CASH
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm gap-1 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('cahier')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'cahier'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <Notebook className="w-3.5 h-3.5" />
            MON CAHIER
          </button>
          <button
            onClick={() => setActiveTab('dettes')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'dettes'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <BookText className="w-3.5 h-3.5" />
            LIVRE DES DETTES
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'trends'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-950'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            ANALYSE MARCHÉ
          </button>
        </div>
      </header>

      {/* Les Trois Piliers Financiers (KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Tiroir Caisse */}
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">
            💰 ARGENT DANS LE TIROIR (CASH)
          </span>
          <p className="text-2xl font-extrabold text-emerald-950 font-mono mt-2">
            {formatPrice(tiroirCaisse)}
          </p>
          <span className="text-[10px] text-emerald-600 mt-2 font-handwritten">
            Somme de liquide physique présente en caisse
          </span>
        </div>

        {/* Argent Dehors */}
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-red-700 tracking-wider uppercase">
            🔴 ARGENT DEHORS (CRÉDITS CLIENTS)
          </span>
          <p className="text-2xl font-extrabold text-red-950 font-mono mt-2">
            {formatPrice(argentDehors)}
          </p>
          <span className="text-[10px] text-red-600 mt-2 font-handwritten">
            Crédits octroyés à tes clients à recouvrer
          </span>
        </div>

        {/* Nos Dettes */}
        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-purple-700 tracking-wider uppercase">
            🟣 NOS DETTES (FOURNISSEURS)
          </span>
          <p className="text-2xl font-extrabold text-purple-950 font-mono mt-2">
            {formatPrice(nosDettes)}
          </p>
          <span className="text-[10px] text-purple-600 mt-2 font-handwritten">
            Somme que tu dois rembourser aux grossistes
          </span>
        </div>
      </div>

      {/* Messages d'Alerte/Succès standard */}
      {error && !error.includes('Opération bloquée') && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl shadow-sm">
          <p className="text-sm text-green-700 font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Main Content Area - Styled like a physical notebook */}
      <div className="flex-1 min-h-[600px] flex">
        
        {/* Notebook layout */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-300 shadow-xl overflow-hidden flex relative">
          
          {/* Cover Left with Spiral bindings */}
          <div className="w-12 notebook-cover-left flex flex-col items-center justify-around py-4 z-10 flex-shrink-0">
            {spiralRings.map((_, i) => (
              <div 
                key={i} 
                className="w-10 h-3.5 spiral-ring rounded-full transform translate-x-4 border border-gray-400"
              ></div>
            ))}
          </div>

          {/* Page content */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#fffdf9]">
            
            {activeTab === 'cahier' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                
                {/* Saisie (Côté Gauche) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-handwritten">
                      Écrire une transaction
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Décris l'opération, l'IA et les regex s'occupent du reste.
                    </p>
                  </div>

                  <SalesInput onSaleRecorded={handleSaleRecorded} onError={handleError} />
                </div>

                {/* Journal du Jour (Côté Droit) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-handwritten">
                      📖 Écritures de la journée
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Journal de caisse chronologique.
                    </p>
                  </div>

                  {sales.length > 0 ? (
                    <SalesHistory 
                      sales={sales} 
                      onSaleCrossedOut={handleSaleCrossedOut} 
                      onError={handleError} 
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl min-h-[300px]">
                      <p className="font-handwritten text-xl text-gray-500">
                        Cahier vierge pour aujourd'hui
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-mono">
                        Sélectionne un stylo Bic et enregistre ta première vente.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'dettes' && (
              <div className="h-full">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-handwritten">
                    📕 Livre des Dettes
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Gère tes crédits clients (argent dehors) et tes engagements grossistes.
                  </p>
                </div>
                <DebtsBook onRefreshTotals={loadFinancialData} onError={handleError} />
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="h-full flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-handwritten">
                    📈 Analyse Marché & Caisse
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Statistiques de tes flux financiers et de ton stock.
                  </p>
                </div>

                {/* Trends Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Flux de trésorerie */}
                  <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
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
                        <span className="text-gray-500">Total Dettes fournisseurs :</span>
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
                  <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-700">
                      💡 Conseils du Cahier Intelligent
                    </h3>
                    <div className="space-y-3 text-xs leading-relaxed text-gray-600 font-handwritten pt-2 text-base">
                      {tiroirCaisse < 5000 && (
                        <p className="text-red-700 font-semibold">
                          ⚠️ Ton tiroir-caisse est presque vide. Évite de faire des dépenses ou d'acheter du stock cash aujourd'hui.
                        </p>
                      )}
                      {argentDehors > tiroirCaisse && (
                        <p className="text-amber-800">
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
                      <p className="text-gray-500 mt-2">
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
      <footer className="text-center text-[10px] text-gray-400 font-mono py-2 uppercase tracking-widest mt-auto">
        CAHIER NO. 200 • WEST AFRICA MARKET RD.
      </footer>

    </main>
  )
}
