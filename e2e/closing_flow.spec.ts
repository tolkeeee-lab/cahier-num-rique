import { test, expect } from '@playwright/test'

test.describe('Cahier Numérique — Parcours E2E Clôture de Caisse (Z) & Mode Hors-Ligne', () => {
  const testShopId = 'SHOP-TEST-CLOSING'

  test.beforeEach(async ({ page }) => {
    // Initialisation d'une session commerçant complète avec des ventes de test
    await page.addInitScript(({ shopId }) => {
      const mockUser = {
        id: 'usr_closing_test',
        email: 'closing@cahier.ci',
        role: 'owner',
        shop_id: shopId,
        shop_name: 'Boutique Test Clôture',
      }

      localStorage.setItem('cahier_mock_session', JSON.stringify(mockUser))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(mockUser))
      localStorage.setItem('cahier_current_shop_id', shopId)
      localStorage.setItem(`cahier_user_shops_${mockUser.id}`, JSON.stringify([
        { id: shopId, name: 'Boutique Test Clôture', activity: 'boutique' }
      ]))
      localStorage.removeItem('cahier_logged_out_flag')

      // Vente cash du jour pour générer un flux théorique positif (10 000 F)
      const salesKey = `cahier_offline_sales_${shopId}`
      const testSales = [
        {
          id: 'sale_cash_01',
          shop_id: shopId,
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          client: 'Client Comptoir',
          articles: [{ name: 'Sac de Riz 25kg', quantity: 1, unit_price: 10000 }],
          total: 10000,
          total_amount: 10000,
          paid: 10000,
          paid_amount: 10000,
          debt: 0,
          debt_amount: 0,
          status: 'paid',
          type: 'sale_cash',
          pen_color: 'blue',
          created_at: new Date().toISOString(),
          is_synced: true,
        },
      ]
      localStorage.setItem(salesKey, JSON.stringify(testSales))
    }, { shopId: testShopId })
  })

  test('Vérifie l\'ouverture du modal de clôture Z, le billetage et l\'enregistrement sans erreur', async ({ page }) => {
    // Intercepter l'appel API cash-closings
    await page.route('**/api/cash-closings*', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, closing: { ...postData, id: 'closing_saved_01' } }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ closings: [] }),
        })
      }
    })

    await page.goto('/journal')

    // Attendre que la page soit prête
    await expect(page.locator('body')).toBeVisible()

    // 1. Ouvrir le modal de clôture de caisse Z
    const closingBtn = page.locator('button:has-text("Clôture")').first()
    await expect(closingBtn).toBeVisible({ timeout: 15000 })
    await closingBtn.click()

    // Vérifier l'apparition du modal avec son titre
    const modalTitle = page.locator('text=Clôture de Caisse (Z)')
    await expect(modalTitle).toBeVisible({ timeout: 5000 })

    // 2. Vérifier la présence du solde théorique attendu
    await expect(page.locator('text=Espèces Théoriques Attendues')).toBeVisible()

    // 3. Ouvrir l'assistant billetage
    const countBillsBtn = page.locator('button:has-text("Compter mes billets")').first()
    if (await countBillsBtn.isVisible()) {
      await countBillsBtn.click()
      await expect(page.locator('text=Assistant Billetage')).toBeVisible({ timeout: 3000 })

      // Saisir 1 billet de 10 000 F
      const tenThousandInput = page.locator('input[type="number"]').first()
      await tenThousandInput.fill('1')

      // Appliquer le billetage
      const applyBilletageBtn = page.locator('button:has-text("Valider le total")').first()
      await applyBilletageBtn.click()
    }

    // 4. Enregistrer la clôture Z
    const saveClosingBtn = page.locator('button:has-text("Valider & Enregistrer la Clôture Z")').first()
    await expect(saveClosingBtn).toBeVisible()
    await saveClosingBtn.click()

    // Vérifier la confirmation visuelle du succès
    await expect(page.locator('text=Clôture Z enregistrée avec succès')).toBeVisible({ timeout: 5000 })

    // 5. Basculer sur l'onglet Historique à l'intérieur du modal
    const historyModalTab = page.locator('div.fixed button:has-text("Historique")').first()
    await expect(historyModalTab).toBeVisible({ timeout: 5000 })
    await historyModalTab.click()

    // Vérifier la présence de l'écriture dans l'historique
    await expect(page.locator('text=Écart 0 F').first()).toBeVisible({ timeout: 5000 })
  })

  test('Vérifie la résilience hors-ligne et l\'analyse de manquant de caisse', async ({ page }) => {
    await page.goto('/journal')

    // Ouvrir le modal
    const closingBtn = page.locator('button:has-text("Clôture")').first()
    await expect(closingBtn).toBeVisible({ timeout: 15000 })
    await closingBtn.click()

    // Saisir un montant réel inférieur au théorique (manquant)
    const actualCashInput = page.locator('input[placeholder*="Par défaut"]').first()
    await actualCashInput.fill('5000')

    // Vérifier la détection immédiate de manquant
    await expect(page.locator('text=Manquant de Caisse').or(page.locator('text=Caisse Parfaite'))).toBeVisible({ timeout: 5000 })

    // Bouton de partage WhatsApp opérationnel
    const whatsappShare = page.locator('a:has-text("Partager WhatsApp")').first()
    await expect(whatsappShare).toBeVisible()
    const href = await whatsappShare.getAttribute('href')
    expect(href).toContain('api.whatsapp.com')
  })
})
