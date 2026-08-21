'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QrCode, X, Camera, Check, RefreshCw, Sparkles, Link, AlertCircle } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { formatPrice } from '@/lib/penUtils'

interface Product {
  id: string
  name: string
  unit_price: number
  barcode?: string
}

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
  products?: Product[]
  onAssociateBarcode?: (productId: string, barcode: string) => void
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
  products = [],
  onAssociateBarcode,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [selectedAssociateProductId, setSelectedAssociateProductId] = useState<string>('')
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'interactive-barcode-scanner'

  // Trouver le produit correspondant s'il existe
  const matchedProduct = scannedResult
    ? products.find(p => p.barcode === scannedResult || p.id === scannedResult || p.name.toLowerCase() === scannedResult.toLowerCase())
    : null

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.warn('[BarcodeScanner] Erreur stop scanner:', err)
      } finally {
        html5QrCodeRef.current = null
        setCameraActive(false)
      }
    }
  }, [])

  const handleScanSuccess = useCallback((decodedText: string) => {
    const code = decodedText.trim()
    if (!code) return

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(80) } catch {}
    }

    setScannedResult(code)
    stopScanner()
  }, [stopScanner])

  const startScanner = useCallback(async () => {
    setCameraError(null)
    setIsStarting(true)
    setScannedResult(null)

    const container = document.getElementById(scannerContainerId)
    if (!container) {
      setIsStarting(false)
      return
    }

    try {
      await stopScanner()

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      })
      html5QrCodeRef.current = html5QrCode

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
          return {
            width: Math.max(160, Math.floor(minEdge * 0.75)),
            height: Math.max(120, Math.floor(minEdge * 0.55)),
          }
        },
        aspectRatio: 1.333333,
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        () => {}
      )

      setCameraActive(true)
    } catch (err: any) {
      console.warn('[BarcodeScanner] Erreur démarrage:', err)
      setCameraError(
        err?.message?.includes('Permission')
          ? "Permission caméra refusée. Autorisez l'accès à l'appareil photo dans vos réglages."
          : "Impossible d'activer la caméra. Saisissez le code manuellement ci-dessous."
      )
      setCameraActive(false)
    } finally {
      setIsStarting(false)
    }
  }, [handleScanSuccess, stopScanner])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner()
      }, 150)
      return () => {
        clearTimeout(timer)
        stopScanner()
      }
    } else {
      stopScanner()
      setScannedResult(null)
    }
  }, [isOpen, startScanner, stopScanner])

  if (!isOpen) return null

  const handleConfirmInsert = () => {
    if (scannedResult) {
      onDetected(scannedResult)
      onClose()
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim())
      setManualCode('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-[#fbf9f4] border-2 border-amber-300 rounded-[28px] max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-amber-200 bg-amber-100 flex items-center justify-between text-amber-950 flex-shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-700" />
            <span>Scanner Code-Barres de Boutique</span>
          </div>
          <button
            type="button"
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1 rounded-full hover:bg-amber-200/60 transition-colors cursor-pointer text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
          
          {/* ÉCRAN 1 : Si un code vient d'être détecté avec succès */}
          {scannedResult ? (
            <div className="p-4 bg-white border-2 border-emerald-400 rounded-2xl space-y-3.5 shadow-md animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm border-b border-emerald-100 pb-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Code-Barres Bippé avec Succès !</span>
              </div>

              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center space-y-1">
                <p className="text-[10px] uppercase font-bold text-emerald-900">Numéro scanné</p>
                <p className="text-base font-black text-emerald-950 font-mono tracking-wider">{scannedResult}</p>
              </div>

              {matchedProduct ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-amber-800">Article identifié dans le stock</p>
                  <p className="text-sm font-extrabold text-gray-900">{matchedProduct.name}</p>
                  <p className="text-xs font-black text-amber-950 font-mono">Prix : {formatPrice(matchedProduct.unit_price)}</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Article non enregistré sous ce code</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">
                    Vous pouvez insérer cet article dans la vente, ou lui associer un produit existant.
                  </p>

                  {/* Associer à un produit existant */}
                  {products.length > 0 && onAssociateBarcode && (
                    <div className="pt-1 flex gap-1.5">
                      <select
                        value={selectedAssociateProductId}
                        onChange={e => setSelectedAssociateProductId(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                      >
                        <option value="">-- Lier à un produit --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatPrice(p.unit_price)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedAssociateProductId}
                        onClick={() => {
                          onAssociateBarcode(selectedAssociateProductId, scannedResult)
                          const p = products.find(prod => prod.id === selectedAssociateProductId)
                          if (p) onDetected(p.name)
                          onClose()
                        }}
                        className="px-2.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs disabled:opacity-40 flex items-center gap-1"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>Lier</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions de confirmation */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setScannedResult(null); startScanner(); }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 font-extrabold text-xs transition-all cursor-pointer font-mono"
                >
                  Scanner un autre
                </button>

                <button
                  type="button"
                  onClick={handleConfirmInsert}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono"
                >
                  <Check className="w-4 h-4" />
                  <span>Insérer dans la vente</span>
                </button>
              </div>
            </div>
          ) : (
            /* ÉCRAN 2 : Viseur Vidéo en cours */
            <>
              <div className="relative bg-black rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center border-2 border-amber-300 shadow-inner">
                <div id={scannerContainerId} className="w-full h-full" />

                {!cameraActive && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center text-gray-300 space-y-2.5">
                    {isStarting ? (
                      <>
                        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="font-bold text-xs text-amber-200">Activation de la caméra...</p>
                      </>
                    ) : (
                      <>
                        <Camera className="w-9 h-9 text-amber-500 opacity-80" />
                        <p className="text-xs text-gray-300 max-w-xs">{cameraError || "Caméra en attente"}</p>
                        <button
                          type="button"
                          onClick={startScanner}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Démarrer la caméra
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Saisie manuelle de secours */}
              <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                  Ou tapez le code manuellement :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 6151234567890"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-amber-500 font-mono shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="px-4 py-2 bg-amber-950 hover:bg-black text-white font-extrabold rounded-xl text-xs transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Valider</span>
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
