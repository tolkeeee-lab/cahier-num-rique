import { test, expect } from '@playwright/test'

test.describe('Restrictions d\'Accès des Onglets — Rôle Employé vs Rôle Propriétaire', () => {
  test('L\'employé accède UNIQUEMENT à Cahier, Historique et Dettes (Stock, Courses, Comptabilité, Réglages masqués)', async ({ browser }) => {
    test.setTimeout(60000)

    const sharedShopId = 'btq_test_perm_' + Date.now()
    const employeeUserId = 'emp_user_' + Date.now()

    // 1. Session Employé (ex: sur smartphone)
    const employeeContext = await browser.newContext()
    const employeePage = await employeeContext.newPage()
    await employeePage.setViewportSize({ width: 390, height: 844 })

    await employeePage.addInitScript(({ userId, shopId }: { userId: string; shopId: string }) => {
      const u = {
        id: userId,
        email: 'vendeur@cahier.app',
        role: 'employee',
        app_role: 'employee',
        user_metadata: { role: 'employee' },
        shop_id: shopId,
        shop_name: 'Boutique Test Permissions',
      }
      localStorage.setItem('cahier_mock_session', JSON.stringify(u))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
      localStorage.setItem(`cahier_user_shops_${userId}`, JSON.stringify([{ id: shopId, name: 'Boutique Test Permissions', activity: 'boutique' }]))
      localStorage.removeItem('cahier_logged_out_flag')
    }, { userId: employeeUserId, shopId: sharedShopId })

    await employeePage.goto('/journal')

    const employeeInput = employeePage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()
    await expect(employeeInput).toBeVisible({ timeout: 20000 })

    // ── VÉRIFICATION ONGLETS VISIBLES POUR L'EMPLOYÉ ──
    const cahierTab = employeePage.locator('nav button:has-text("Cahier")')
    const historyTab = employeePage.locator('nav button:has-text("Historique")')
    const dettesTab = employeePage.locator('nav button:has-text("Dettes")')

    await expect(cahierTab).toBeVisible()
    await expect(historyTab).toBeVisible()
    await expect(dettesTab).toBeVisible()
    console.log('✓ Onglets autorisés visibles : Cahier, Historique Ventes, Livre des Dettes')

    // ── VÉRIFICATION ONGLETS INTERDITS / MASQUÉS POUR L'EMPLOYÉ ──
    await expect(employeePage.locator('nav button:has-text("Stock")')).not.toBeVisible()
    await expect(employeePage.locator('nav button:has-text("Courses")')).not.toBeVisible()
    await expect(employeePage.locator('nav button:has-text("Comptabilité")')).not.toBeVisible()
    await expect(employeePage.locator('nav button:has-text("Réglages")')).not.toBeVisible()
    await expect(employeePage.locator('nav button:has-text("Foyer")')).not.toBeVisible()
    console.log('✓ Onglets interdits masqués pour l\'employé : Stock, Courses, Comptabilité, Réglages')

    // ── VÉRIFICATION DU GARDE-FOU (REDIRECTION SI TENTATIVE D\'ACCÈS DIRECT) ──
    // Même si un script tente d'activer l'onglet 'stock', la page le redirige sur 'cahier'
    await employeePage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('cahier_switch_tab', { detail: 'stock' }))
    })
    await expect(cahierTab).toHaveClass(/border-\[#047857\]|bg-gradient-to-b/)
    console.log('✓ Garde-fou actif : redirection immédiate sur le Cahier')

    await employeePage.close()
    await employeeContext.close()
  })

  test('Le Propriétaire (Patron) a un accès complet à tous les onglets de gestion', async ({ browser }) => {
    test.setTimeout(60000)

    const sharedShopId = 'btq_test_owner_' + Date.now()
    const ownerUserId = 'owner_user_' + Date.now()

    // Session Patron (ex: sur PC / Tablette)
    const ownerContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()
    await ownerPage.setViewportSize({ width: 1280, height: 720 })

    await ownerPage.addInitScript(({ userId, shopId }: { userId: string; shopId: string }) => {
      const u = {
        id: userId,
        email: 'patron@cahier.app',
        role: 'owner',
        user_metadata: { role: 'owner' },
        shop_id: shopId,
        shop_name: 'Boutique Patron',
      }
      localStorage.setItem('cahier_mock_session', JSON.stringify(u))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
      localStorage.setItem(`cahier_user_shops_${userId}`, JSON.stringify([{ id: shopId, name: 'Boutique Patron', activity: 'boutique' }]))
      localStorage.removeItem('cahier_logged_out_flag')
    }, { userId: ownerUserId, shopId: sharedShopId })

    await ownerPage.goto('/journal')

    const ownerInput = ownerPage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()
    await expect(ownerInput).toBeVisible({ timeout: 20000 })

    // Le patron voit tous ses onglets
    await expect(ownerPage.locator('nav button:has-text("Cahier")')).toBeVisible()
    await expect(ownerPage.locator('nav button:has-text("Historique")')).toBeVisible()
    await expect(ownerPage.locator('nav button:has-text("Stock")')).toBeVisible()
    await expect(ownerPage.locator('nav button:has-text("Dettes")')).toBeVisible()
    await expect(ownerPage.locator('nav button:has-text("Courses")')).toBeVisible()
    await expect(ownerPage.locator('nav button:has-text("Réglages")')).toBeVisible()
    console.log('✓ Accès complet patron validé (Cahier, Historique, Stock, Dettes, Courses, Réglages)')

    await ownerPage.close()
    await ownerContext.close()
  })
})

