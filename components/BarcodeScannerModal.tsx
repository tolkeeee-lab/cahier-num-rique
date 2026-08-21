'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QrCode, X, Camera, Check, RefreshCw, Sparkles, Zap, ZapOff, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'
import { formatPrice } from '@/lib/penUtils'

interface Product {
  id: string
  name: string
  unit_price: number
  barcode?: string
}

export interface ScannedCartItem {
  id: string
  name: string
  unit_price: number
  quantity: number
  barcode?: string
}

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (formattedSaleText: string) => void
  products?: Product[]
  onAssociateBarcode?: (productId: string, barcode: string) => void
  onSaveNewProduct?: (name: string, price: number, barcode: string) => void
}

// Bip sonore net et professionnel de caisse
function playScannerBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1760, ctx.currentTime) // Note A6
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {}
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
  products = [],
  onAssociateBarcode,
  onSaveNewProduct,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // Panier multi-scan en direct
  const [cart, setCart] = useState<ScannedCartItem[]>([])

  // Gestion d'un code-barres inconnu
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [selectedExistingId, setSelectedExistingId] = useState('')

  // Anti-rebond par code pour éviter de biper 10 fois par seconde le même code
  const lastScannedTimeRef = useRef<{ [code: string]: number }>({})

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const isScanningRef = useRef<boolean>(false)

  const stopScanner = useCallback(() => {
    isScanningRef.current = false
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset()
      } catch {}
      codeReaderRef.current = null
    }

    setCameraActive(false)
    setTorchOn(false)
    setTorchSupported(false)
  }, [])

  // Ajout / Incrémentation d'un article dans le panier scanné
  const addItemToCart = useCallback((item: { id: string; name: string; unit_price: number; barcode?: string }) => {
    setCart(prev => {
      const idx = prev.findIndex(p => p.id === item.id || (p.barcode && item.barcode && p.barcode === item.barcode))
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
        return updated
      } else {
        return [...prev, { ...item, quantity: 1 }]
      }
    })
  }, [])

  const handleScanSuccess = useCallback((decodedText: string) => {
    const code = decodedText.trim()
    if (!code) return

    // Debounce : 1 seconde d'écart minimum pour le même code
    const now = Date.now()
    const lastTime = lastScannedTimeRef.current[code] || 0
    if (now - lastTime < 1000) {
      return
    }
    lastScannedTimeRef.current[code] = now

    playScannerBeep()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([60, 30, 60]) } catch {}
    }

    // Recherche dans les produits existants
    const matched = products.find(p => 
      p.barcode === code || 
      p.id === code || 
      p.name.toLowerCase() === code.toLowerCase()
    )

    if (matched) {
      addItemToCart({
        id: matched.id,
        name: matched.name,
        unit_price: matched.unit_price,
        barcode: matched.barcode || code,
      })
    } else {
      // Code inconnu : ouvrir la fiche de création rapide
      setUnknownBarcode(code)
      setNewProductName('')
      setNewProductPrice('')
      setSelectedExistingId('')
    }
  }, [addItemToCart, products])

  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const newStatus = !torchOn
      await (track as any).applyConstraints({
        advanced: [{ torch: newStatus }]
      })
      setTorchOn(newStatus)
    } catch (err) {
      console.warn('[Torch]', err)
    }
  }

  const startScanner = useCallback(async () => {
    setCameraError(null)
    setIsStarting(true)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Votre navigateur ne supporte pas l'accès direct à la caméra.")
      setIsStarting(false)
      return
    }

    try {
      stopScanner()

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints, 100)
      codeReaderRef.current = reader

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      })

      streamRef.current = stream

      const track = stream.getVideoTracks()[0]
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {}
        if (capabilities.torch) {
          setTorchSupported(true)
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setCameraActive(true)
      isScanningRef.current = true

      // Moteur 1 : BarcodeDetector Natif Matériel
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const nativeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
          })

          const scanNativeLoop = async () => {
            if (!isScanningRef.current) return
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await nativeDetector.detect(videoRef.current)
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleScanSuccess(barcodes[0].rawValue)
                }
              } catch {}
            }
            if (isScanningRef.current) {
              requestAnimationFrame(scanNativeLoop)
            }
          }
          requestAnimationFrame(scanNativeLoop)
        } catch {}
      }

      // Moteur 2 : ZXing Continu
      if (videoRef.current) {
        reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (!isScanningRef.current) return
          if (result && result.getText()) {
            handleScanSuccess(result.getText())
          }
        })
      }

    } catch (err: any) {
      console.warn('[BarcodeScanner] Erreur démarrage:', err)
      setCameraError(
        err?.name === 'NotAllowedError' || err?.message?.includes('Permission')
          ? "Permission caméra refusée. Autorisez l'accès à l'appareil photo dans Safari/Chrome."
          : "Impossible de lancer la caméra. Vous pouvez saisir le code manuellement ci-dessous."
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
      }, 100)
      return () => {
        clearTimeout(timer)
        stopScanner()
      }
    } else {
      stopScanner()
      setCart([])
      setUnknownBarcode(null)
    }
  }, [isOpen, startScanner, stopScanner])

  if (!isOpen) return null

  // Ajuster la quantité dans le panier
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta
        return newQ > 0 ? { ...item, quantity: newQ } : item
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  // Valider et insérer tout le panier dans le cahier
  const handleValidateSale = () => {
    if (cart.length === 0) return

    // Formater l'écriture propre pour le cahier
    // ex: "2 Lait Peak à 550, 1 Savon Fanico à 500"
    const entries = cart.map(item => `${item.quantity} ${item.name} à ${item.unit_price}`)
    const formattedText = entries.join(', ')

    stopScanner()
    onDetected(formattedText)
    onClose()
  }

  // Sauvegarder un nouveau produit scanné
  const handleSaveUnknown = (e: React.FormEvent) => {
    e.preventDefault()
    if (!unknownBarcode) return

    if (selectedExistingId) {
      // Lier à un produit existant
      if (onAssociateBarcode) {
        onAssociateBarcode(selectedExistingId, unknownBarcode)
      }
      const prod = products.find(p => p.id === selectedExistingId)
      if (prod) {
        addItemToCart({
          id: prod.id,
          name: prod.name,
          unit_price: prod.unit_price,
          barcode: unknownBarcode,
        })
      }
    } else if (newProductName.trim()) {
      // Créer un nouveau produit
      const price = parseFloat(newProductPrice) || 0
      const newId = `prod_${Date.now()}`
      if (onSaveNewProduct) {
        onSaveNewProduct(newProductName.trim(), price, unknownBarcode)
      }
      addItemToCart({
        id: newId,
        name: newProductName.trim(),
        unit_price: price,
        barcode: unknownBarcode,
      })
    }

    setUnknownBarcode(null)
  }

  // Saisie manuelle de code-barres
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim())
      setManualCode('')
    }
  }

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-[#fbf9f4] border-2 border-amber-300 rounded-[28px] max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-amber-200 bg-amber-100 flex items-center justify-between text-amber-950 flex-shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-700" />
            <span>Mode Caisse & Multi-Scan</span>
          </div>

          <div className="flex items-center gap-1.5">
            {torchSupported && cameraActive && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${torchOn ? 'bg-amber-400 text-amber-950' : 'bg-amber-200/80 text-amber-800 hover:bg-amber-300'}`}
                title="Allumer la lampe torche"
              >
                {torchOn ? <Zap className="w-4 h-4 fill-amber-950" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => { stopScanner(); onClose(); }}
              className="p-1 rounded-full hover:bg-amber-200/60 transition-colors cursor-pointer text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la modale */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          
          {/* FICHE : Enregistrement rapide si code inconnu */}
          {unknownBarcode && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2.5 shadow-md animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Nouveau Code Scanné : {unknownBarcode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnknownBarcode(null)}
                  className="text-gray-500 hover:text-gray-900 text-xs font-bold"
                >
                  Passer ✕
                </button>
              </div>

              <form onSubmit={handleSaveUnknown} className="space-y-2">
                {/* Option 1 : Créer Nouveau Produit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-amber-950 uppercase mb-0.5">
                      Nom de l'article :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lait Concentré"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      autoFocus
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-amber-950 uppercase mb-0.5">
                      Prix de Vente (F) :
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 1100"
                      value={newProductPrice}
                      onChange={e => setNewProductPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Option 2 : Ou Lier à un produit déjà en stock */}
                {products.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">
                      Ou choisir un article existant :
                    </label>
                    <select
                      value={selectedExistingId}
                      onChange={e => setSelectedExistingId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                    >
                      <option value="">-- Lier à un produit existant --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatPrice(p.unit_price)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newProductName.trim() && !selectedExistingId}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer & Ajouter au Panier</span>
                </button>
              </form>
            </div>
          )}

          {/* Viseur Caméra Réduit & Fluide */}
          <div className="relative bg-black rounded-2xl overflow-hidden h-[180px] sm:h-[200px] flex items-center justify-center border-2 border-amber-300 shadow-inner">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Viseur laser animé */}
            {cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2">
                <div className="w-56 h-28 border-2 border-amber-400 rounded-2xl bg-amber-400/10 relative flex items-center justify-center shadow-lg overflow-hidden">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" />
                </div>
                <p className="mt-1.5 text-[10px] font-bold text-amber-200 bg-black/60 px-2 py-0.5 rounded-full font-mono">
                  Bipez vos articles l'un après l'autre
                </p>
              </div>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center text-gray-300 space-y-2">
                {isStarting ? (
                  <>
                    <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                    <p className="font-bold text-xs text-amber-200">Activation de la caméra...</p>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-amber-500 opacity-80" />
                    <p className="text-xs text-gray-300 max-w-xs">{cameraError || "Caméra en attente"}</p>
                    <button
                      type="button"
                      onClick={startScanner}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Démarrer la caméra
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Saisie manuelle de secours */}
          <form onSubmit={handleManualSubmit} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Code-barres manuel..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-amber-500 font-mono shadow-inner"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 bg-amber-950 hover:bg-black text-white font-extrabold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              + Biper
            </button>
          </form>

          {/* PANIER DE SCAN EN DIRECT */}
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-3 space-y-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-100 pb-1.5 text-gray-700">
              <div className="flex items-center gap-1.5 font-extrabold text-xs text-amber-950">
                <ShoppingCart className="w-4 h-4 text-amber-700" />
                <span>Panier en cours ({totalItemsCount} article{totalItemsCount > 1 ? 's' : ''})</span>
              </div>
              <span className="font-mono font-black text-xs text-emerald-800">
                {formatPrice(totalCartAmount)}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-4 text-center text-gray-400 text-[11px] font-sans">
                Aucun article scanné. Présentez un code-barres devant la caméra pour commencer la vente.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-amber-50/70 p-1.5 sm:p-2 rounded-xl border border-amber-200/80"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-extrabold text-gray-900 text-xs truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {formatPrice(item.unit_price)} × {item.quantity} = <strong className="text-emerald-900">{formatPrice(item.unit_price * item.quantity)}</strong>
                      </p>
                    </div>

                    {/* Contrôles de Quantité */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="w-6 h-6 rounded-lg bg-white border border-amber-300 flex items-center justify-center text-amber-950 hover:bg-amber-100 font-bold disabled:opacity-30 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-6 text-center font-black font-mono text-xs text-amber-950">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-amber-300 flex items-center justify-center text-amber-950 hover:bg-amber-100 font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-1 cursor-pointer"
                        title="Retirer cet article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer : Bouton de Validation Globale de la Vente */}
        <div className="p-3 sm:p-4 bg-amber-100 border-t border-amber-200 flex-shrink-0 flex items-center justify-between gap-3">
          <div className="text-amber-950 font-mono">
            <p className="text-[10px] font-bold uppercase text-amber-800">Total à encaisser :</p>
            <p className="text-sm font-black text-emerald-950">{formatPrice(totalCartAmount)}</p>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleValidateSale}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-md font-mono"
          >
            <span>Valider la Vente ({totalItemsCount})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
