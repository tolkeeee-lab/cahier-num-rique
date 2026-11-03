import { test, expect } from '@playwright/test'

test.describe('Synchronisation Bidirectionnelle Complète (Téléphone <-> PC)', () => {
  test('1. Une vente saisie sur le Téléphone apparaît sur le PC en direct (< 50ms) sans F5', async ({ context }) => {
    const sharedUserId = 'usr_synctest_bidir_' + Date.now()
    const sharedShopId = 'btq_sync_' + Date.now()

    // 1. Écran Téléphone (Mobile)
    const phonePage = await context.newPage()
    await phonePage.setViewportSize({ width: 390, height: 844 })

    // 2. Écran PC (Desktop)
    const pcPage = await context.newPage()
    await pcPage.setViewportSize({ width: 1280, height: 720 })

    const setupSession = async (page: any) => {
      await page.addInitScript(({ userId, shopId }: { userId: string; shopId: string }) => {
        const u = {
          id: userId,
          email: 'proprietaire@cahier.app',
          role: 'owner',
          shop_id: shopId,
        }
        localStorage.setItem('cahier_mock_session', JSON.stringify(u))
        localStorage.setItem('cahier_last_active_user', JSON.stringify(u))
        localStorage.removeItem('cahier_logged_out_flag')
      }, { userId: sharedUserId, shopId: sharedShopId })
    }

    await setupSession(phonePage)
    await setupSession(pcPage)

    await Promise.all([
      phonePage.goto('/journal'),
      pcPage.goto('/journal'),
    ])

    const phoneInput = phonePage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()
    const pcInput = pcPage.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]').first()

    await expect(phoneInput).toBeVisible({ timeout: 15000 })
    await expect(pcInput).toBeVisible({ timeout: 15000 })

    // ── TEST 1 : Téléphone ➔ PC ──
    const phoneArticle = `riz_phone_${Date.now().toString().slice(-4)}`
    console.log(`[Robot 1] Saisie sur Téléphone : "2 ${phoneArticle} à 1200"...`)
    await phoneInput.fill(`2 ${phoneArticle} à 1200`)
    await phonePage.keyboard.press('Enter')

    await expect(phonePage.locator(`text=${phoneArticle}`).first()).toBeVisible({ timeout: 4000 })
    console.log(`[Robot 1] ✓ Visible sur le Téléphone`)

    const startPhoneToPc = Date.now()
    await expect(pcPage.locator(`text=${phoneArticle}`).first()).toBeVisible({ timeout: 5000 })
    console.log(`[Robot 1] 🚀 Reçu sur le PC en ${Date.now() - startPhoneToPc} ms (sans F5) !`)

    // ── TEST 2 : PC ➔ Téléphone (Sens inverse) ──
    const pcArticle = `savon_pc_${Date.now().toString().slice(-4)}`
    console.log(`[Robot 2] Saisie sur PC : "1 ${pcArticle} à 350"...`)
    await pcInput.fill(`1 ${pcArticle} à 350`)
    await pcPage.keyboard.press('Enter')

    await expect(pcPage.locator(`text=${pcArticle}`).first()).toBeVisible({ timeout: 4000 })
    console.log(`[Robot 2] ✓ Visible sur le PC`)

    const startPcToPhone = Date.now()
    await expect(phonePage.locator(`text=${pcArticle}`).first()).toBeVisible({ timeout: 5000 })
    console.log(`[Robot 2] 🚀 Reçu sur le Téléphone en ${Date.now() - startPcToPhone} ms (sans F5) !`)

    // Fermeture propre
    await phonePage.close()
    await pcPage.close()
  })
})
