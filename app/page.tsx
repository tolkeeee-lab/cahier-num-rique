'use client'

import React, { useState, useEffect } from 'react'
import { SalesInput } from '@/components/SalesInput'
import { SalesHistory } from '@/components/SalesHistory'
import { AlertCircle } from 'lucide-react'

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Array<{
    name: string
    quantity: number
    unit_price: number
  }>
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt'
}

export default function Home() {
  const [sales, setSales] = useState<Sale[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadTodaysSales()
  }, [])

  const loadTodaysSales = async () => {
    try {
      const response = await fetch('/api/sales?date=today')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setSales(data.sales || [])
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const handleSaleRecorded = (newSale: Sale) => {
    setSales((prev) => [newSale, ...prev])
    setSuccessMessage('✓ Vente enregistrée avec succès')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleError = (err: string) => {
    setError(err)
    setTimeout(() => setError(null), 5000)
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📔 Cahier Numérique</h1>
          <p className="text-sm text-gray-600 mt-1">Gestion de boutique ultra-simple</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        <div className="mb-8">
          <SalesInput onSaleRecorded={handleSaleRecorded} onError={handleError} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Ventes d'aujourd'hui</h2>
          {sales.length > 0 ? (
            <SalesHistory sales={sales} />
          ) : (
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">Aucune vente enregistrée pour le moment</p>
              <p className="text-sm text-gray-400 mt-2">Commencez par enregistrer votre première vente</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
