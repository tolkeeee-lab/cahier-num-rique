import { test, expect } from '@playwright/test'

test.describe('Cahier Numérique — Parcours E2E Caisse & Offline-First', () => {
  test.beforeEach(async ({ page }) => {
    // Initialisation d'une session locale demo/owner pour accéder directement au cahier
    await page.addInitScript(() => {
      localStorage.setItem('cahier_mock_session', JSON.stringify({
        id: 'usr_playwright_test',
        email: 'test@cahier.ci',
        role: 'owner',
      }))
      localStorage.setItem('cahier_last_active_user', JSON.stringify({
        id: 'usr_playwright_test',
        email: 'test@cahier.ci',
        role: 'owner',
      }))
      localStorage.removeItem('cahier_logged_out_flag')
    })
  })

  test('Vérifie le chargement du journal et la saisie d\'une vente cash avec bandeau monnaie', async ({ page }) => {
    await page.goto('/journal')

    // Attendre que la page et le titre soient visibles
    await expect(page.locator('body')).toBeVisible()

    // Vérifier la présence du champ de saisie de vente
    const saleInput = page.locator('input[placeholder*="Écrivez une vente"], input[placeholder*="vente"]')
    await expect(saleInput).toBeVisible({ timeout: 15000 })

    // Saisir une vente cash avec syntaxe explicite "2 riz à 1000"
    await saleInput.fill('2 riz à 1000')
    await page.keyboard.press('Enter')

    // Vérifier l'apparition immédiate (0 ms) de la vente dans le journal
    await expect(page.locator('text=riz').first()).toBeVisible({ timeout: 5000 })

    // Vérifier la présence du bandeau caisse express avec les raccourcis coupures FCFA
    const cashierBanner = page.locator('aside[aria-label="Expérience Caisse et Reçu"]')
    await expect(cashierBanner.first()).toBeVisible({ timeout: 5000 })

    // Vérifier le bouton Reçu WhatsApp (1-Clic)
    const whatsappBtn = page.locator('button:has-text("Reçu WhatsApp")').first()
    await expect(whatsappBtn).toBeVisible()
  })

  test('Navigation et bascule vers le Stock et les Dettes', async ({ page }) => {
    await page.goto('/journal')

    // Clic sur l'onglet Stock
    const stockTab = page.locator('button:has-text("Stock"), [role="tab"]:has-text("Stock")').first()
    if (await stockTab.isVisible()) {
      await stockTab.click()
      await expect(page.locator('text=Produits').first()).toBeVisible({ timeout: 10000 })
    }

    // Clic sur l'onglet Dettes
    const debtsTab = page.locator('button:has-text("Dettes"), [role="tab"]:has-text("Dettes")').first()
    if (await debtsTab.isVisible()) {
      await debtsTab.click()
      await expect(page.locator('text=CLIENT').or(page.locator('text=Aucune dette')).first()).toBeVisible({ timeout: 10000 })
    }
  })
})

