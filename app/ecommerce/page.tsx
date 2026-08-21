'use client'

import React, { useState } from 'react'
import { CumuluHeader, CumuluTab } from '@/components/ecommerce/CumuluHeader'
import { ChatCopilot } from '@/components/ecommerce/ChatCopilot'
import { WinningProductScorer } from '@/components/ecommerce/WinningProductScorer'
import { VideoScriptStudio } from '@/components/ecommerce/VideoScriptStudio'
import { ProductCopywriter } from '@/components/ecommerce/ProductCopywriter'
import { OrdersManager } from '@/components/ecommerce/OrdersManager'

export default function EcommercePage() {
  const [activeTab, setActiveTab] = useState<CumuluTab>('copilot')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header CumuluShop */}
      <CumuluHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenu selon l'onglet actif */}
      <main className="flex-1">
        {activeTab === 'copilot' && <ChatCopilot />}
        {activeTab === 'scorer' && <WinningProductScorer />}
        {activeTab === 'scripts' && <VideoScriptStudio />}
        {activeTab === 'copywriting' && <ProductCopywriter />}
        {activeTab === 'catalog' && <OrdersManager />}
      </main>
    </div>
  )
}
