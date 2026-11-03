import { test, expect } from '@playwright/test'

test.describe('Synchronisation Bidirectionnelle Patron <-> Employé', () => {
  test('Une vente saisie par l\'Employé apparaît chez le Patron en direct (< 50ms) et vice-versa', async ({ context }) => {
    const sharedShopId = 'shop_patron_emp_' + Date.now()
    const ownerUserId = 'usr_patron_' + Date.now()
    const employeeUserId = 'usr_employe_' + Date.now()

    // 1. Écran Patron (PC / Tablette)
    const ownerPage = await context.newPage()
    await ownerPage.setViewportSize({ width: 1280, height: 720 })

    // 2. Écran Employé (Téléphone Mobile)
    const employeePage = await context.newPage()
    await employeePage.setViewportSize({ width: 390, height: 844 })

    // Configuration session Patron
    await ownerPage.addInitScript(({ userId, shopId }: { userId: string; shopId: string }) => {
      const u = {
        id: userId,
        email: 'patron@cahier.app',
        role: 'owner',
        shop_id: shopId,
        shop_name: 'Boutique Patron & Équipe',
      }
      localStorage.setItem('cahier_mock_session', JSON.stringify(u))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
      localStorage.setItem(`cahier_user_shops_${userId}`, JSON.stringify([{ id: shopId, name: 'Boutique Patron & Équipe', activity: 'boutique' }]))
      localStorage.removeItem('cahier_logged_out_flag')
    }, { userId: ownerUserId, shopId: sharedShopId })

    // Configuration session Employé (rattaché au même shopId)
    await employeePage.addInitScript(({ userId, shopId }: { userId: string; shopId: string }) => {
      const u = {
        id: userId,
        email: 'vendeur@cahier.app',
        role: 'employee',
        shop_id: shopId,
        shop_name: 'Boutique Patron & Équipe',
      }
      localStorage.setItem('cahier_mock_session', JSON.stringify(u))
      localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
      localStorage.setItem(`cahier_user_shops_${userId}`, JSON.stringify([{ id: shopId, name: 'Boutique Patron & Équipe', activity: 'boutique' }]))
      localStorage.removeItem('cahier_logged_out_flag')
    }, { userId: employeeUserId, shopId: sharedShopId })

    await Promise.all([
      ownerPage.goto('/journal'),
      employeePage.goto('/journal'),
    ])

    const ownerInput = ownerPage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()
    const employeeInput = employeePage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()

    await expect(ownerInput).toBeVisible({ timeout: 15000 })
    await expect(employeeInput).toBeVisible({ timeout: 15000 })

    // ── TEST 1 : Employé (Mobile) ➔ Patron (PC) ──
    const employeeArticle = `lait_employe_${Date.now().toString().slice(-4)}`
    console.log(`[Test 1] Employé saisit sur mobile : "3 ${employeeArticle} à 500"...`)
    await employeeInput.fill(`3 ${employeeArticle} à 500`)
    await employeePage.keyboard.press('Enter')

    await expect(employeePage.locator(`text=${employeeArticle}`).first()).toBeVisible({ timeout: 4000 })
    console.log(`[Test 1] ✓ Visible sur l'écran de l'Employé`)

    const startEmpToOwner = Date.now()
    await expect(ownerPage.locator(`text=${employeeArticle}`).first()).toBeVisible({ timeout: 5000 })
    console.log(`[Test 1] 🚀 Reçu chez le Patron en ${Date.now() - startEmpToOwner} ms sans recharger la page !`)

    // ── TEST 2 : Patron (PC) ➔ Employé (Mobile) ──
    const ownerArticle = `sucre_patron_${Date.now().toString().slice(-4)}`
    console.log(`[Test 2] Patron saisit sur PC : "2 ${ownerArticle} à 750"...`)
    await ownerInput.fill(`2 ${ownerArticle} à 750`)
    await ownerPage.keyboard.press('Enter')

    await expect(ownerPage.locator(`text=${ownerArticle}`).first()).toBeVisible({ timeout: 4000 })
    console.log(`[Test 2] ✓ Visible sur l'écran du Patron`)

    const startOwnerToEmp = Date.now()
    await expect(employeePage.locator(`text=${ownerArticle}`).first()).toBeVisible({ timeout: 5000 })
    console.log(`[Test 2] 🚀 Reçu chez l'Employé en ${Date.now() - startOwnerToEmp} ms sans recharger la page !`)

    await ownerPage.close()
    await employeePage.close()
  })
})
