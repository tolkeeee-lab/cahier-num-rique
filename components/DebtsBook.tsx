'use client'

import React, { useState, useEffect } from 'react'
import { Search, Plus, ChevronRight, AlertCircle, Loader } from 'lucide-react'

interface HistoryItem {
  id: string
  date: string
  time: string
  description: string
  amount: number // positive for addition, negative for repayment
}

interface EntityDebts {
  id: string
  name: string
  amount: number // Current outstanding balance
  paid: number
  status: string
  history: HistoryItem[]
}

interface DebtsBookProps {
  onRefreshTotals: () => void
  onError: (msg: string) => void
  shopId?: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

export function DebtsBook({ onRefreshTotals, onError, shopId }: DebtsBookProps) {
  const [activeSubTab, setActiveSubTab] = useState<'client' | 'supplier'>('client')
  const [searchQuery, setSearchQuery] = useState('')
  const [entities, setEntities] = useState<EntityDebts[]>([])
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Form states
  const [payAmount, setPayAmount] = useState('')
  const [creditDesc, setCreditDesc] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadDebts()
    setSelectedEntityName(null)
  }, [activeSubTab])

  const loadDebts = async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (shopId) headers['x-shop-id'] = shopId
      const response = await fetch(`/api/debts?type=${activeSubTab}`, { headers })
      if (!response.ok) throw new Error('Erreur lors du chargement des dettes')
      const data = await response.json()
      
      const list = activeSubTab === 'supplier' ? data.suppliers : data.clients
      setEntities(list || [])
      
      // Si aucune entité sélectionnée mais qu'il y en a, sélectionner la première par défaut
      if (list && list.length > 0 && !selectedEntityName) {
        setSelectedEntityName(list[0].name)
      }
    } catch (e) {
      console.error(e)
      onError('Impossible de charger le livre des dettes.')
    } finally {
      setLoading(false)
    }
  }

  const selectedEntity = entities.find(e => e.name === selectedEntityName) || null

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntityName || !payAmount.trim()) return

    const amountNum = parseInt(payAmount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Veuillez entrer un montant valide')
      return
    }

    setActionLoading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (shopId) headers['x-shop-id'] = shopId
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: selectedEntityName,
          amount: amountNum,
          type: activeSubTab,
          action: 'pay',
          description: activeSubTab === 'supplier' 
            ? `Remboursement dette grossiste ${selectedEntityName}`
            : `Remboursement crédit client ${selectedEntityName}`
        })
      })

      const data = await response.json()
      if (!response.ok) {
        onError(data.error || 'Erreur lors du remboursement')
        return
      }

      setPayAmount('')
      await loadDebts()
      onRefreshTotals()
    } catch (err) {
      onError('Erreur réseau lors de la transaction.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntityName || !creditAmount.trim() || !creditDesc.trim()) return

    const amountNum = parseInt(creditAmount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Veuillez entrer un montant valide')
      return
    }

    setActionLoading(true)
    try {
      const headers2: Record<string, string> = { 'Content-Type': 'application/json' }
      if (shopId) headers2['x-shop-id'] = shopId
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: headers2,
        body: JSON.stringify({
          name: selectedEntityName,
          amount: amountNum,
          type: activeSubTab,
          action: 'credit',
          description: creditDesc.trim()
        })
      })

      const data = await response.json()
      if (!response.ok) {
        onError(data.error || 'Erreur lors de l\'ajout du crédit')
        return
      }

      setCreditAmount('')
      setCreditDesc('')
      await loadDebts()
      onRefreshTotals()
    } catch (err) {
      onError('Erreur réseau lors de la transaction.')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtrer les entités selon la recherche
  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Sidebar - Liste des Débiteurs/Grossistes */}
      <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col h-[520px]">
        {/* Sub Navigation */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveSubTab('client')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'client'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            👥 CLIENTS
          </button>
          <button
            onClick={() => setActiveSubTab('supplier')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'supplier'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            💛 GROSSISTES
          </button>
        </div>

        {/* Barre de Recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeSubTab === 'supplier' ? 'Rechercher grossiste...' : 'Rechercher client...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white text-gray-800 transition-colors"
          />
        </div>

        {/* Liste des entités */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Loader className="w-6 h-6 animate-spin" />
              <span className="text-xs">Chargement...</span>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Aucun résultat trouvé
            </div>
          ) : (
            filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setSelectedEntityName(e.name)
                  setPayAmount('')
                  setCreditAmount('')
                  setCreditDesc('')
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  selectedEntityName === e.name
                    ? 'border-gray-900 bg-gray-50 shadow-sm scale-[1.01]'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm font-handwritten">{e.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {e.history?.length || 0} écritures
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold font-mono ${e.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPrice(e.amount)}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bouton pour ajouter un nouveau client/grossiste directement */}
        <button
          onClick={() => {
            const newName = prompt(activeSubTab === 'supplier' ? 'Nom du nouveau grossiste :' : 'Nom du nouveau client :')
            if (newName && newName.trim()) {
              const formattedName = newName.trim().charAt(0).toUpperCase() + newName.trim().slice(1)
              setSelectedEntityName(formattedName)
              setEntities(prev => [
                {
                  id: Math.random().toString(36).substring(2, 9),
                  name: formattedName,
                  amount: 0,
                  paid: 0,
                  status: 'paid',
                  history: []
                },
                ...prev
              ])
            }
          }}
          className="mt-4 flex items-center justify-center gap-1.5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors w-full"
        >
          <Plus className="w-4 h-4" />
          Nouveau {activeSubTab === 'supplier' ? 'Grossiste' : 'Client'}
        </button>
      </div>

      {/* Main Panel - Fiche de Dette Lignée */}
      <div className="md:col-span-2 flex flex-col h-[520px] bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {selectedEntity ? (
          <div className="flex flex-col h-full">
            {/* Header de la Fiche */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
                  {activeSubTab === 'supplier' ? 'Fiche de Dette Fournisseur (Nos Dettes)' : 'Fiche de Crédit Client (Argent Dehors)'}
                </span>
                <h3 className="text-xl font-bold text-gray-900 font-handwritten mt-0.5">
                  {activeSubTab === 'supplier' ? 'Grossiste' : 'Client'} : {selectedEntity.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
                  {activeSubTab === 'supplier' ? "Somme qu'on lui doit" : "Somme qu'il nous doit"}
                </span>
                <div className={`text-lg font-bold font-mono mt-0.5 ${selectedEntity.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatPrice(selectedEntity.amount)}
                </div>
              </div>
            </div>

            {/* Lignes de Cahier Lignées pour l'Historique */}
            <div className="flex-1 overflow-y-auto lined-paper pl-24 pr-4 py-6 relative">
              {/* Ligne rouge de marge */}
              <div className="absolute left-[80px] top-0 bottom-0 w-[2px] bg-red-400 bg-opacity-40"></div>

              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 select-none block mb-3 no-underline">
                📄 HISTORIQUE DES ENGAGEMENTS :
              </span>

              {selectedEntity.history && selectedEntity.history.length > 0 ? (
                <div className="lined-text-container space-y-0 text-base">
                  {selectedEntity.history.map((tx, idx) => {
                    const isPayment = tx.amount < 0
                    const inkClass = activeSubTab === 'supplier'
                      ? (isPayment ? 'ink-red' : 'ink-purple') // Grossiste : Remboursement = rouge (sortie cash), Achat crédit = violet
                      : (isPayment ? 'ink-blue' : 'ink-yellow') // Client : Remboursement = bleu (entrée cash), Crédit donné = jaune/ambre

                    return (
                      <div key={tx.id || idx} className="lined-item flex items-center justify-between pr-2">
                        <div className={`flex-1 pr-4 py-1 leading-relaxed ${inkClass}`}>
                          <span className="text-xs uppercase font-mono mr-2 bg-gray-100 bg-opacity-60 px-1 py-0.5 rounded text-gray-500 font-sans border border-gray-200 no-underline select-none">
                            {tx.date}
                          </span>
                          {tx.description}
                        </div>
                        <div className={`font-mono text-sm font-bold flex-shrink-0 ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                          {isPayment ? '-' : '+'}
                          {formatPrice(Math.abs(tx.amount))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 font-handwritten text-lg no-underline">
                  Aucun engagement enregistré pour le moment.
                </div>
              )}
            </div>

            {/* Formulaires d'Actions au bas de la fiche */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Formulaire de remboursement */}
              <form onSubmit={handlePaySubmit} className="space-y-2 p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                  🟢 {activeSubTab === 'supplier' ? 'REMBOURSER NOTRE DETTE' : 'ENCAISSER NOTRE DU'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Montant payé (FCFA)..."
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    disabled={actionLoading}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 text-gray-800"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !payAmount.trim()}
                    className="px-4 py-1.5 bg-[#16a34a] hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Valider
                  </button>
                </div>
                <p className="text-[9px] text-gray-400">
                  {activeSubTab === 'supplier' 
                    ? '⚠️ Cette action retirera de l\'argent liquide de ton tiroir-caisse.' 
                    : '💰 Cette action ajoutera de l\'argent liquide dans ton tiroir-caisse.'}
                </p>
              </form>

              {/* Formulaire d'ajout de crédit */}
              <form onSubmit={handleCreditSubmit} className="space-y-2 p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1">
                  🟣 {activeSubTab === 'supplier' ? 'ACHETER DU STOCK A CREDIT' : 'DONNER CREDIT CLIENT'}
                </span>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Ex: Sac de riz maman..."
                    value={creditDesc}
                    onChange={(e) => setCreditDesc(e.target.value)}
                    disabled={actionLoading}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-gray-400 text-gray-800"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Montant (FCFA)..."
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      disabled={actionLoading}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-gray-400 text-gray-800"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !creditAmount.trim() || !creditDesc.trim()}
                      className="px-4 py-1.5 bg-[#7c3aed] hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 gap-2">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm font-handwritten">Sélectionnez ou créez une fiche de dette</span>
          </div>
        )}
      </div>

    </div>
  )
}
