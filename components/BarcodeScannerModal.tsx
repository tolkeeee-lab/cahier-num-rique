'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QrCode, X, Camera, Check, RefreshCw, Sparkles, Link, AlertCircle, Zap, ZapOff } from 'lucide-react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'
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

// Bip sonore de caisse professionnel
function playScannerBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1760, ctx.currentTime) // Note A6 (bip caisse aigu et net)
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
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [selectedAssociateProductId, setSelectedAssociateProductId] = useState<string>('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const isScanningRef = useRef<boolean>(false)

  // Produit correspondant dans la boutique
  const matchedProduct = scannedResult
    ? products.find(p => p.barcode === scannedResult || p.id === scannedResult || p.name.toLowerCase() === scannedResult.toLowerCase())
    : null

  const stopScanner = useCallback(() => {
    isScanningRef.current = false
    
    // Arrêter le flux caméra
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

  const handleScanSuccess = useCallback((decodedText: string) => {
    const code = decodedText.trim()
    if (!code) return

    playScannerBeep()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([60, 40, 60]) } catch {}
    }

    setScannedResult(code)
    stopScanner()
  }, [stopScanner])

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
    setScannedResult(null)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Votre navigateur ne supporte pas l'accès direct à la caméra.")
      setIsStarting(false)
      return
    }

    try {
      stopScanner()

      // Configuration ZXing
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

      const reader = new BrowserMultiFormatReader(hints, 120)
      codeReaderRef.current = reader

      // Demande du flux caméra avec autofocus et résolution HD
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Vérifier support de la torche / flash
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

      // ── MOTEUR 1 : BarcodeDetector Natif (Accélération matérielle iOS/Android) ──
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
                  return
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

      // ── MOTEUR 2 : ZXing Décodeur continu ──
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
            <span>Scanner Code-Barres & QR</span>
          </div>

          <div className="flex items-center gap-1.5">
            {torchSupported && cameraActive && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-full transition-colors ${torchOn ? 'bg-amber-400 text-amber-950' : 'bg-amber-200/80 text-amber-800 hover:bg-amber-300'}`}
                title="Activer la lampe torche"
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

        <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
          
          {/* ÉCRAN 1 : Résultat du scan détecté */}
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
                    Vous pouvez insérer cet article dans la vente, ou lui associer un produit de votre stock.
                  </p>

                  {/* Lier à un produit existant */}
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
                        className="px-2.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs disabled:opacity-40 flex items-center gap-1 cursor-pointer"
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
            /* ÉCRAN 2 : Viseur Caméra en direct */
            <>
              <div className="relative bg-black rounded-2xl overflow-hidden min-h-[240px] aspect-4/3 flex items-center justify-center border-2 border-amber-300 shadow-inner">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  playsInline
                  muted
                />

                {/* Viseur visuel avec laser animé */}
                {cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                    <div className="w-64 h-40 border-2 border-amber-400 rounded-2xl bg-amber-400/10 relative flex items-center justify-center shadow-lg overflow-hidden">
                      {/* Ligne laser balayeuse rouge */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" />
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-amber-200 bg-black/60 px-2 py-0.5 rounded-full font-mono">
                      Placez le code-barres dans le cadre
                    </p>
                  </div>
                )}

                {/* Écran d'attente / erreur */}
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
