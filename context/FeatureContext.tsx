'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface FeatureFlags {
  enableSyscohada: boolean
  enableBarcodeScanner: boolean
  enableReceiptPrinter: boolean
  enableCashClosing: boolean
  enableParticulierMode: boolean
  enableStockManagement: boolean
  enableAnalytics: boolean
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableSyscohada: false,
  enableBarcodeScanner: true,
  enableReceiptPrinter: true,
  enableCashClosing: true,
  enableParticulierMode: false,
  enableStockManagement: true,
  enableAnalytics: true,
}

interface FeatureContextType {
  features: FeatureFlags
  toggleFeature: (key: keyof FeatureFlags) => void
  setFeature: (key: keyof FeatureFlags, enabled: boolean) => void
  resetFeatures: () => void
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined)

const STORAGE_KEY = 'cahier_feature_flags'

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setFeatures({ ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) })
      }
    } catch (e) {
      console.error('Erreur chargement feature flags:', e)
    }
  }, [])

  const saveFlags = (newFlags: FeatureFlags) => {
    setFeatures(newFlags)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFlags))
    } catch (e) {
      console.error('Erreur sauvegarde feature flags:', e)
    }
  }

  const toggleFeature = (key: keyof FeatureFlags) => {
    saveFlags({ ...features, [key]: !features[key] })
  }

  const setFeature = (key: keyof FeatureFlags, enabled: boolean) => {
    saveFlags({ ...features, [key]: enabled })
  }

  const resetFeatures = () => {
    saveFlags(DEFAULT_FEATURE_FLAGS)
  }

  return (
    <FeatureContext.Provider value={{ features, toggleFeature, setFeature, resetFeatures }}>
      {children}
    </FeatureContext.Provider>
  )
}

export const useFeatures = (): FeatureContextType => {
  const context = useContext(FeatureContext)
  if (!context) {
    throw new Error('useFeatures doit être utilisé à l\'intérieur de FeatureProvider')
  }
  return context
}
