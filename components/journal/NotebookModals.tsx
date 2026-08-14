'use client'

import React from 'react'
import BoutiqueAssistantModal from '@/components/BoutiqueAssistantModal'
import { CashClosingModal } from '@/components/CashClosingModal'
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal'
import { SyscohadaModal } from '@/components/SyscohadaModal'
import { ReceiptPrinterModal } from '@/components/ReceiptPrinterModal'

interface NotebookModalsProps {
  showAssistantModal: boolean
  onCloseAssistantModal: () => void
  showCashClosingModal: boolean
  onCloseCashClosingModal: () => void
  showBarcodeScannerModal: boolean
  onCloseBarcodeScannerModal: () => void
  showSyscohadaModal: boolean
  onCloseSyscohadaModal: () => void
  showReceiptModal: boolean
  onCloseReceiptModal: () => void
  sales: any[]
  products?: any[]
  currentShopName: string
  receiptSale?: any
}

export const NotebookModals: React.FC<NotebookModalsProps> = ({
  showAssistantModal,
  onCloseAssistantModal,
  showCashClosingModal,
  onCloseCashClosingModal,
  showBarcodeScannerModal,
  onCloseBarcodeScannerModal,
  showSyscohadaModal,
  onCloseSyscohadaModal,
  showReceiptModal,
  onCloseReceiptModal,
  sales,
  products = [],
  currentShopName,
  receiptSale,
}) => {
  return (
    <>
      {/* Modale Assistant IA Boutique */}
      {showAssistantModal && (
        <BoutiqueAssistantModal
          isOpen={showAssistantModal}
          onClose={onCloseAssistantModal}
          sales={sales}
          products={products}
        />
      )}

      {/* Modale Clôture de Caisse */}
      {showCashClosingModal && (
        <CashClosingModal
          isOpen={showCashClosingModal}
          onClose={onCloseCashClosingModal}
          sales={sales}
          shopName={currentShopName}
        />
      )}

      {/* Modale Scanner Code-barres */}
      {showBarcodeScannerModal && (
        <BarcodeScannerModal
          isOpen={showBarcodeScannerModal}
          onClose={onCloseBarcodeScannerModal}
          onDetected={(barcode: string) => {
            console.log('Code-barres scanné:', barcode)
            onCloseBarcodeScannerModal()
          }}
        />
      )}

      {/* Modale Comptabilité SYSCOHADA */}
      {showSyscohadaModal && (
        <SyscohadaModal
          isOpen={showSyscohadaModal}
          onClose={onCloseSyscohadaModal}
          sales={sales}
          shopName={currentShopName}
        />
      )}

      {/* Modale Impression Reçu Thermique ESC/POS */}
      {showReceiptModal && receiptSale && (
        <ReceiptPrinterModal
          isOpen={showReceiptModal}
          onClose={onCloseReceiptModal}
          sale={receiptSale}
          shopName={currentShopName}
        />
      )}
    </>
  )
}
