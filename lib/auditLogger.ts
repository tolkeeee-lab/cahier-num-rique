/**
 * auditLogger.ts — Journal d'audit anti-fraude pour le Cahier Numérique
 * 
 * Trace les actions sensibles (biffage, suppression, retours, clôture Z, ajustement stock)
 * de manière résiliente et non-bloquante.
 */

import { supabaseClient, isSupabaseClientConfigured } from './supabaseClient'

export type AuditAction = 
  | 'sale_created'
  | 'sale_crossed_out'
  | 'sale_returned'
  | 'sale_deleted'
  | 'cash_closing'
  | 'stock_adjusted'
  | 'price_updated'

export interface AuditLogEntry {
  shopId: string
  action: AuditAction
  targetId?: string
  details?: Record<string, any>
  userEmail?: string
}

export async function logAuditEvent({
  shopId,
  action,
  targetId,
  details = {},
  userEmail,
}: AuditLogEntry): Promise<void> {
  try {
    if (!shopId) return

    let email = userEmail
    let userId: string | null = null

    if (isSupabaseClientConfigured()) {
      try {
        const { data } = await supabaseClient.auth.getUser()
        if (data?.user) {
          userId = data.user.id
          if (!email) email = data.user.email
        }
      } catch {
        // Mode hors-ligne ou session expirée
      }

      await supabaseClient.from('audit_logs').insert({
        shop_id: shopId,
        user_id: userId,
        user_email: email || null,
        action,
        target_id: targetId || null,
        details,
        created_at: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.warn('[AuditLogger] Impossible d’enregistrer le log d’audit:', err)
  }
}
