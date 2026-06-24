'use client'

import React from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface Article {
  name: string
  quantity: number
  unit_price: number
}

interface Sale {
  id: string
  date: string
  time: string
  client: string
  articles: Article[]
  total: number
  paid: number
  debt: number
  status: 'paid' | 'debt'
}

interface SalesHistoryProps {
  sales: Sale[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(price)
}

export function SalesHistory({ sales }: SalesHistoryProps) {
  if (sales.length === 0) return null

  const totals = sales.reduce(
    (acc, sale) => ({
      totalSales: acc.totalSales + sale.total,
      totalPaid: acc.totalPaid + sale.paid,
      totalDebt: acc.totalDebt + sale.debt,
    }),
    { totalSales: 0, totalPaid: 0, totalDebt: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Total</p>
          <p className="text-lg font-bold text-blue-900 mt-1">
            {formatPrice(totals.totalSales)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Encaissé</p>
          <p className="text-lg font-bold text-green-900 mt-1">
            {formatPrice(totals.totalPaid)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Dettes</p>
          <p className="text-lg font-bold text-red-900 mt-1">
            {formatPrice(totals.totalDebt)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className={`rounded-lg border p-4 transition-colors ${
              sale.status === 'paid'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{sale.client}</h3>
                <p className="text-xs text-gray-600 mt-1">
                  {sale.time} • {sale.date}
                </p>
              </div>
              {sale.status === 'paid' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
            </div>

            <div className="space-y-1 mb-3 pb-3 border-b border-gray-300 border-opacity-50">
              {sale.articles.map((article, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {article.quantity}x {article.name}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {formatPrice(article.quantity * article.unit_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total facture:</span>
                <span className="font-semibold text-gray-900">{formatPrice(sale.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={sale.status === 'paid' ? 'text-green-700' : 'text-red-700'}>
                  {sale.status === 'paid' ? '✓ Encaissé:' : '⚠️ Dû:'}
                </span>
                <span
                  className={`font-semibold ${
                    sale.status === 'paid' ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {formatPrice(sale.status === 'paid' ? sale.paid : sale.debt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
