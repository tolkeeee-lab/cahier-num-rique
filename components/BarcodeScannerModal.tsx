'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { QrCode, X, Camera, Check } from 'lucide-react'

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const startCamera = useCallback(async () => {
    setErrorMsg(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès à la caméra n'est pas supporté par ce navigateur.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err: any) {
      console.warn('[Camera Scanner]', err)
      setErrorMsg("Impossible d'activer la caméra. Saisissez le code-barres manuellement ci-dessous.")
      stopCamera()
    }
  }, [stopCamera])

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onDetected(manualCode.trim())
      setManualCode('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-xs">
      <div className="bg-[#fbf9f4] border border-amber-300 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-200 bg-amber-100 flex items-center justify-between text-amber-950">
          <div className="font-bold text-sm flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-700" />
            <span>Scanner Code-Barres / QR Code</span>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1 rounded-full hover:bg-amber-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Zone de prévisualisation Vidéo Caméra */}
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-amber-300 shadow-inner">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {/* Viseur visuel de scan */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-32 border-2 border-amber-400 rounded-xl bg-amber-400 bg-opacity-10 animate-pulse relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-0.5 bg-red-500 shadow-md"></div>
                </div>
              </div>
            )}

            {!cameraActive && (
              <div className="text-center p-4 text-gray-400 space-y-2">
                <Camera className="w-10 h-10 mx-auto opacity-50 text-amber-600" />
                <p className="text-xs font-mono">{errorMsg || "Initialisation de la caméra..."}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold"
                >
                  Réessayer la Caméra
                </button>
              </div>
            )}
          </div>

          {/* Fallback : Saisie manuelle du code-barres */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Ou saisissez / scannez avec une douchette USB :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: 6151234567890"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                autoFocus
                className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Valider</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
