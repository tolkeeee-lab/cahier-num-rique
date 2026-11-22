import React from 'react'
import { Search, Plus, FileSpreadsheet, Trash2, ShoppingBag, GitMerge, X, Calculator, ScanBarcode } from 'lucide-react'

interface StockToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  categoryFilter: string
  onCategoryFilterChange: (cat: string) => void
  categories: string[]
  onAddProduct: () => void
  onOpenBarcodeScanner?: () => void
  onOpenRestockAdvisor?: () => void
  onOpenCalculator?: () => void
  onExportCSV?: () => void
  onClearAllStock?: () => void
  hasProducts?: boolean
  isEmployee?: boolean
  duplicateCount?: number
  onOpenMergeModal?: () => void
}

export const StockToolbar: React.FC<StockToolbarProps> = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  onAddProduct,
  onOpenBarcodeScanner,
  onOpenRestockAdvisor,
  onOpenCalculator,
  onExportCSV,
  onClearAllStock,
  hasProducts = false,
  isEmployee = false,
  duplicateCount = 0,
  onOpenMergeModal,
}) => {
  return (
    <div className="bg-[#faf5e8] p-3 rounded-xl border border-[#e2d6be] space-y-2.5 mb-3">
      {/* Ligne 1 : Recherche + CTA Nouveau produit */}
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onSearchChange('')
              }
            }}
            placeholder="Rechercher un produit..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {!isEmployee && (
          <button
            type="button"
            onClick={onAddProduct}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#064e3b] hover:bg-[#075e47] text-[#f59e0b] text-xs font-semibold rounded-xl active:scale-[0.97] transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Nouveau</span>
          </button>
        )}
      </div>

      {/* Ligne 2 : Catégorie + Outils sobres sans débordement */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 font-medium focus:outline-none focus:border-emerald-700 cursor-pointer"
        >
          <option value="TOUT">Toutes les catégories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onOpenBarcodeScanner && !isEmployee && (
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-700 border border-stone-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="Scanner un code-barres"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
              <span className="hidden sm:inline">Scanner</span>
            </button>
          )}

          {onOpenRestockAdvisor && (
            <button
              type="button"
              onClick={onOpenRestockAdvisor}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-700 border border-stone-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="Conseil réapprovisionnement"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
              <span className="hidden sm:inline">Réassort</span>
            </button>
          )}

          {onOpenCalculator && !isEmployee && (
            <button
              type="button"
              onClick={onOpenCalculator}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-700 border border-stone-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="Calculateur valeur & paliers"
            >
              <Calculator className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.5} />
              <span className="hidden sm:inline">Paliers</span>
            </button>
          )}

          {duplicateCount > 0 && onOpenMergeModal && !isEmployee && (
            <button
              type="button"
              onClick={onOpenMergeModal}
              className="px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 active:scale-[0.97] text-amber-900 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              title={`${duplicateCount} doublon(s) détecté(s)`}
            >
              <GitMerge className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="font-mono tabular-nums">{duplicateCount}</span>
            </button>
          )}

          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="p-1.5 rounded-lg bg-white hover:bg-stone-50 active:scale-[0.97] text-stone-600 border border-stone-200 transition-colors cursor-pointer"
              title="Exporter l'inventaire CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}

          {!isEmployee && hasProducts && onClearAllStock && (
            <button
              type="button"
              onClick={onClearAllStock}
              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 active:scale-[0.97] text-stone-500 hover:text-rose-700 border border-stone-200 transition-colors cursor-pointer"
              title="Vider tout le stock"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
