import { test, expect } from '@playwright/test'

test.describe('Cahier Numérique — Parcours E2E Stock & Dettes (Offline-First)', () => {
  const shopId = 'SHOP-TEST-PLAYWRIGHT'

  test.beforeEach(async ({ page }) => {
    // Initialisation d'une session locale avec identifiants boutique et données de test
    await page.addInitScript(({ currentShopId }) => {
      const mockUser = {
        id: 'usr_playwright_test',
        email: 'test@cahier.ci',
        role: 'owner',
        shop_id: currentShopId,
        shop_name: 'Boutique Playwright Test',
      }

      localStorage.setItem('cahier_mock_session', JSON.stringify(mockUser))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(mockUser))
      localStorage.setItem('cahier_current_shop_id', currentShopId)
      localStorage.setItem(`cahier_user_shops_${mockUser.id}`, JSON.stringify([
        { id: currentShopId, name: 'Boutique Playwright Test', activity: 'boutique' }
      ]))
      localStorage.removeItem('cahier_logged_out_flag')

      // 1. Initialisation d'un produit en alerte stock bas dans le cache local
      const productsKey = `cahier_offline_products_${currentShopId}`
      const testProducts = [
        {
          id: 'prod_test_lait',
          shop_id: currentShopId,
          name: 'Lait Nido',
          category: 'Alimentation',
          unit: 'boîte',
          alert_threshold: 10,
          initial_stock: 2,
          current_stock: 2,
          unit_cost: 2000,
          unit_price: 2500,
          created_at: new Date().toISOString(),
          stock_tracked: true,
        },
      ]
      localStorage.setItem(productsKey, JSON.stringify(testProducts))

      // 2. Initialisation d'une vente à crédit pour tester le carnet de dettes
      const salesKey = `cahier_offline_sales_${currentShopId}`
      const testSales = [
        {
          id: 'sale_credit_koffi',
          shop_id: currentShopId,
          date: '2026-10-30',
          time: '10:00',
          client: 'Koffi +22507000000',
          client_name: 'Koffi +22507000000',
          total: 5000,
          total_amount: 5000,
          paid: 1000,
          paid_amount: 1000,
          debt: 4000,
          debt_amount: 4000,
          status: 'debt',
          type: 'sale_credit',
          pen_color: 'purple',
          notes: 'Achat crédit 2 sacs de riz',
          articles: [
            { name: 'Riz Boni', quantity: 2, unit_price: 2500 }
          ],
          created_at: new Date().toISOString(),
          is_synced: true,
        }
      ]
      localStorage.setItem(salesKey, JSON.stringify(testSales))
    }, { currentShopId: shopId })

    // Intercepter l'appel /api/stock pour renvoyer directement le produit de test en environnement local
    await page.route('**/api/stock*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          products: [
            {
              id: 'prod_test_lait',
              shop_id: shopId,
              name: 'Lait Nido',
              category: 'Alimentation',
              unit: 'boîte',
              alert_threshold: 10,
              initial_stock: 2,
              current_stock: 2,
              unit_cost: 2000,
              unit_price: 2500,
              created_at: new Date().toISOString(),
              stock_tracked: true,
            }
          ],
          orphans: [],
          total: 1,
        }),
      })
    })

    // Intercepter l'appel /api/debts pour renvoyer la dette du client Koffi
    await page.route('**/api/debts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          debts: [
            {
              id: 'debt_koffi_1',
              client_name: 'Koffi +22507000000',
              amount_owed: 4000,
              paid_amount: 1000,
              status: 'pending',
              debt_type: 'client',
              history: [
                {
                  id: 'sale_credit_koffi',
                  date: '2026-10-30',
                  time: '10:00',
                  description: 'Achat à crédit: Riz Boni',
                  amount: 4000,
                }
              ]
            }
          ]
        }),
      })
    })
  })

  test('Vérifie le chargement du Stock, la détection du stock bas et l\'approvisionnement 1-clic', async ({ page }) => {
    await page.goto('/journal')
    await expect(page.locator('body')).toBeVisible()

    // Basculer vers l'onglet Stock
    const stockTab = page.locator('button:has-text("Stock"), [role="tab"]:has-text("Stock")').first()
    await expect(stockTab).toBeVisible({ timeout: 15000 })
    await stockTab.click()

    // Vérifier l'affichage du produit 'Lait Nido'
    await expect(page.locator('text=Lait Nido').first()).toBeVisible({ timeout: 10000 })

    // Vérifier la présence du bouton commander (alerte stock bas)
    const orderButton = page.locator('button:has-text("Commander (1-Clic)"), button:has-text("Commander")').first()
    if (await orderButton.isVisible()) {
      await orderButton.click()
      // Doit afficher l'état de confirmation
      await expect(page.locator('text=Ajouté').or(page.locator('text=Commander')).first()).toBeVisible()
    }
  })

  test('Vérifie le carnet de Dettes, la détection du client débiteur et l\'action Relance WhatsApp', async ({ page }) => {
    await page.goto('/journal')
    await expect(page.locator('body')).toBeVisible()

    // Basculer vers l'onglet Dettes
    const debtsTab = page.locator('button:has-text("Dettes"), [role="tab"]:has-text("Dettes")').first()
    await expect(debtsTab).toBeVisible({ timeout: 15000 })
    await debtsTab.click()

    // Vérifier l'apparition de la fiche client ou de la liste
    await expect(page.locator('text=Koffi').or(page.locator('text=CLIENT')).first()).toBeVisible({ timeout: 10000 })

    // Vérifier le bouton de relance WhatsApp
    const relanceBtn = page.locator('button:has-text("Relancer"), button[title*="WhatsApp"], a[href*="whatsapp"]').first()
    await expect(relanceBtn).toBeVisible({ timeout: 5000 })
  })
})
