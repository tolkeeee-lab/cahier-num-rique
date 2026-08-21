'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { QrCode, X, Camera, Check, RefreshCw } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'interactive-barcode-scanner'

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch (err) {
        console.warn('[BarcodeScanner] Erreur lors de l\'arrêt du scanner:', err)
      } finally {
        html5QrCodeRef.current = null
        setCameraActive(false)
      }
    }
  }, [])

  const startScanner = useCallback(async () => {
    setCameraError(null)
    setIsStarting(true)

    // S'assurer que le container DOM existe
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
        qrbox: { width: 250, height: 180 },
        aspectRatio: 1.333333,
      }

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Détection réussie !
          if (navigator.vibrate) {
            try { navigator.vibrate(80) } catch {}
          }
          stopScanner().then(() => {
            onDetected(decodedText.trim())
          })
        },
        () => {
          // Frame sans code - normal, ignorer
        }
      )

      setCameraActive(true)
    } catch (err: any) {
      console.warn('[BarcodeScanner] Erreur démarrage caméra:', err)
      setCameraError(
        err?.message?.includes('Permission')
          ? "Permission caméra refusée. Veuillez autoriser l'accès à la caméra."
          : "Impossible d'accéder à la caméra. Saisissez le code manuellement."
      )
      setCameraActive(false)
    } finally {
      setIsStarting(false)
    }
  }, [onDetected, stopScanner])

  useEffect(() => {
    if (isOpen) {
      // Petite temporisation pour laisser le DOM monter le div
      const timer = setTimeout(() => {
        startScanner()
      }, 150)
      return () => {
        clearTimeout(timer)
        stopScanner()
      }
    } else {
      stopScanner()
    }
  }, [isOpen, startScanner, stopScanner])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      stopScanner().then(() => {
        onDetected(manualCode.trim())
        setManualCode('')
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-[#fbf9f4] border-2 border-amber-300 rounded-[28px] max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-amber-200 bg-amber-100 flex items-center justify-between text-amber-950 flex-shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-700" />
            <span>Scanner Code-Barres & QR</span>
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
          
          {/* Zone de scan Vidéo */}
          <div className="relative bg-black rounded-2xl overflow-hidden min-h-[220px] flex items-center justify-center border-2 border-amber-300 shadow-inner">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Overlay d'état / Erreur */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center text-gray-300 space-y-2.5">
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

          {/* Fallback Saisie Manuelle ou Douchette USB */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Ou saisissez / bipez avec une douchette USB :
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
                <span>Insérer</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
