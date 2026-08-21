'use client'

import React, { useState } from 'react'
import { CumuluNavbar, CumuluTab } from '@/components/cumulushop/Navbar'
import { OverviewDashboard } from '@/components/cumulushop/OverviewDashboard'
import { SourcingHunter } from '@/components/cumulushop/SourcingHunter'
import { CreativeStudio } from '@/components/cumulushop/CreativeStudio'
import { OrdersManager } from '@/components/cumulushop/OrdersManager'
import { EcommerceCopilot } from '@/components/cumulushop/EcommerceCopilot'

export default function CumulushopPage() {
  const [activeTab, setActiveTab] = useState<CumuluTab>('overview')

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Sticky Header */}
      <CumuluNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'sourcing' && <SourcingHunter />}
        {activeTab === 'studio' && <CreativeStudio />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'copilot' && <EcommerceCopilot />}
      </main>
    </div>
  )
}
