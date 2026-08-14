'use client'

/**
 * EditSaleModal.tsx
 *
 * Modale de modification complète d'une vente :
 * - Modification du nom du client
 * - Ajout, modification de la quantité/prix, ou suppression d'un article
 * - Calcul automatique du nouveau total
 * - Option de suppression / raturage direct
 */

import React, { useState, useEffect } from 'react'
import { X, Trash2, Check } from 'lucide-react'
import { formatPrice } from '@/lib/penUtils'

interface Article {
  name: string
  quantity: number
  unit_price: number
}

interface EditSaleModalProps {
  isOpen: boolean
  sale: any
  onClose: () => void
  onSave: (saleId: string, updatedArticles: Article[], clientName: string) => Promise<void>
  onDelete?: (saleId: string) => Promise<void>
}

export function EditSaleModal({
  isOpen,
  sale,
  onClose,
  onSave,
  onDelete,
}: EditSaleModalProps) {
  const [clientName, setClientName] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newArtName, setNewArtName] = useState('')
  const [newArtQty, setNewArtQty] = useState('1')
  const [newArtPrice, setNewArtPrice] = useState('')

  useEffect(() => {
    if (sale) {
      setClientName(sale.client || sale.client_name || 'Client anonyme')
      setArticles((sale.articles || []).map((a: any) => ({
        name: a.name || a.nom || 'Article',
        quantity: a.quantity || a.quantite || 1,
        unit_price: a.unit_price || a.prix_unitaire || 0,
      })))
    }
  }, [sale])

  if (!isOpen || !sale) return null

  const handleQtyChange = (index: number, qty: number) => {
    const next = [...articles]
    next[index].quantity = Math.max(1, qty)
    setArticles(next)
  }

  const handlePriceChange = (index: number, price: number) => {
    const next = [...articles]
    next[index].unit_price = Math.max(0, price)
    setArticles(next)
  }

  const handleNameChange = (index: number, name: string) => {
    const next = [...articles]
    next[index].name = name
    setArticles(next)
  }

  const handleRemoveArticle = (index: number) => {
    setArticles(articles.filter((_, i) => i !== index))
  }

  const handleAddNewArticle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newArtName.trim()) return
    const q = parseInt(newArtQty, 10) || 1
    const p = parseInt(newArtPrice, 10) || 0
    setArticles([...articles, { name: newArtName.trim(), quantity: q, unit_price: p }])
    setNewArtName('')
    setNewArtQty('1')
    setNewArtPrice('')
  }

  const totalCalculated = articles.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSave(sale.id, articles, clientName.trim() || 'Client anonyme')
      onClose()
    } catch (err) {
      console.error('Erreur modification vente:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#fffdf2] border border-amber-300 rounded-[24px] p-5 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-amber-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Modifier l'Écriture de Vente</h3>
              <p className="text-xs text-gray-500 font-mono">ID: {sale.id?.slice(0, 8)}... • {sale.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom du Client */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
              Nom du Client / Note
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-gray-900 bg-white border border-amber-300 rounded-xl outline-none focus:border-amber-500"
              placeholder="ex: Marie, Koffi, Client anonyme"
            />
          </div>

          {/* Liste des articles à modifier */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Articles vendus ({articles.length})
            </label>

            {articles.map((art, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white border border-amber-200 p-2 rounded-xl text-xs">
                <input
                  type="text"
                  value={art.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="flex-grow font-bold text-gray-900 outline-none min-w-0"
                  placeholder="Nom de l'article"
                />

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-gray-400 text-[10px]">Qté:</span>
                  <input
                    type="number"
                    min={1}
                    value={art.quantity}
                    onChange={(e) => handleQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                    className="w-12 text-center font-mono font-bold bg-amber-50 border border-amber-200 rounded-lg py-0.5"
                  />
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-gray-400 text-[10px]">Prix:</span>
                  <input
                    type="number"
                    min={0}
                    value={art.unit_price}
                    onChange={(e) => handlePriceChange(idx, parseInt(e.target.value, 10) || 0)}
                    className="w-20 text-right font-mono font-bold bg-amber-50 border border-amber-200 rounded-lg py-0.5 px-1"
                  />
                  <span className="text-[10px] text-gray-400 font-mono">F</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveArticle(idx)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition-colors flex-shrink-0"
                  title="Supprimer cet article"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {articles.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                Aucun article dans cette vente.
              </p>
            )}
          </div>

          {/* Formulaire ajout rapide d'un article à la liste */}
          <div className="bg-amber-100/60 border border-amber-300/80 p-2.5 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-amber-900 uppercase">
              + Ajouter un article à cette vente
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="text"
                value={newArtName}
                onChange={(e) => setNewArtName(e.target.value)}
                placeholder="Nom du produit"
                className="flex-grow text-xs px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg outline-none min-w-[120px]"
              />
              <input
                type="number"
                min={1}
                value={newArtQty}
                onChange={(e) => setNewArtQty(e.target.value)}
                placeholder="Qté"
                className="w-12 text-xs text-center font-mono font-bold px-1 py-1.5 bg-white border border-amber-300 rounded-lg outline-none"
              />
              <input
                type="number"
                min={0}
                value={newArtPrice}
                onChange={(e) => setNewArtPrice(e.target.value)}
                placeholder="Prix F"
                className="w-20 text-xs text-right font-mono font-bold px-2 py-1.5 bg-white border border-amber-300 rounded-lg outline-none"
              />
              <button
                type="button"
                onClick={handleAddNewArticle}
                disabled={!newArtName.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Nouveau Total */}
          <div className="pt-2 border-t border-dashed border-amber-300 flex items-center justify-between font-mono">
            <span className="text-xs text-gray-600 font-bold">Nouveau Total Calculé :</span>
            <span className="text-base font-extrabold text-amber-900">{formatPrice(totalCalculated)}</span>
          </div>

          {/* Boutons validation & suppression */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Voulez-vous vraiment annuler / raturer cette vente ?")) {
                    await onDelete(sale.id)
                    onClose()
                  }
                }}
                className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl border border-rose-300 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Raturer la Vente</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
