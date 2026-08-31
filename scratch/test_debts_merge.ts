import fs from 'fs'

// Mock des fonctions
const shopId = 'test-shop'

const apiDebts = [
  { id: '1', client_name: 'Jean', amount_owed: 5000, paid_amount: 0, status: 'pending', debt_type: 'client' },
  { id: '2', client_name: 'Fournisseur A', amount_owed: 10000, paid_amount: 0, status: 'pending', debt_type: 'supplier' }
]

const offlineSales = [
  {
    id: 'off-1',
    type: 'payment_client',
    client: 'Jean',
    total: 2000,
    paid: 2000,
    debt: 0,
    status: 'paid',
    is_synced: false
  },
  {
    id: 'off-2',
    type: 'purchase_credit',
    client: 'Fournisseur A',
    total: 5000,
    paid: 0,
    debt: 5000,
    status: 'pending',
    is_synced: false
  },
  {
    id: 'off-3',
    type: 'sale_credit',
    client: 'Nouveau Client',
    total: 3000,
    paid: 0,
    debt: 3000,
    status: 'pending',
    is_synced: false
  }
]

function testMergeLogic(apiDebts: any[], sales: any[]) {
  const mergedDebts = [...apiDebts]
  const unsyncedSales = sales.filter(s => s.status !== 'crossed_out' && s.is_synced === false)

  const processSales = (filteredSales: any[], type: 'client' | 'supplier') => {
    const names = Array.from(new Set(filteredSales.map(s => s.client_name || s.client).filter(Boolean)))
    
    names.forEach(name => {
      const sSales = filteredSales.filter(s => s.client_name === name || s.client === name)
      const owed = sSales.filter(s => s.type === (type === 'client' ? 'sale_credit' : 'purchase_credit')).reduce((sum, s) => sum + (s.debt_amount ?? s.debt ?? s.total_amount ?? s.total ?? 0), 0)
      const paid = sSales.filter(s => s.type === (type === 'client' ? 'payment_client' : 'payment_supplier')).reduce((sum, s) => sum + (s.paid_amount ?? s.paid ?? s.total_amount ?? s.total ?? 0), 0)
      
      const existingIdx = mergedDebts.findIndex(d => d.client_name === name && d.debt_type === type)
      if (existingIdx >= 0) {
        mergedDebts[existingIdx].amount_owed += owed
        mergedDebts[existingIdx].paid_amount = (mergedDebts[existingIdx].paid_amount || 0) + paid
        const newBalance = mergedDebts[existingIdx].amount_owed - (mergedDebts[existingIdx].paid_amount || 0)
        mergedDebts[existingIdx].status = newBalance <= 0 ? 'settled' : 'pending'
      } else {
        const balance = Math.max(0, owed - paid)
        mergedDebts.push({
          id: `local-${type}-${name}`,
          client_name: name as string,
          amount_owed: Math.max(0, owed),
          paid_amount: paid,
          debt_type: type,
          status: balance <= 0 ? 'settled' : 'pending',
          created_at: new Date().toISOString()
        })
      }
    })
  }

  const clientSales = unsyncedSales.filter(s => s.type === 'sale_credit' || s.type === 'payment_client')
  processSales(clientSales, 'client')

  const suppSales = unsyncedSales.filter(s => s.type === 'purchase_credit' || s.type === 'payment_supplier')
  processSales(suppSales, 'supplier')

  return mergedDebts
}

const result = testMergeLogic(apiDebts, offlineSales)
console.log(JSON.stringify(result, null, 2))
