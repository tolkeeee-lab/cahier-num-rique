import { z } from 'zod'

/**
 * Schema de validation pour la création d'une vente ou transaction
 */
export const saleInputSchema = z.object({
  text: z.string().min(1, 'Le texte de la transaction ne peut pas être vide'),
  penColor: z.enum(['blue', 'red', 'green', 'purple', 'yellow']).default('blue'),
  shop_id: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  client: z.string().optional(),
  articles: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().min(1),
      unit_price: z.number().min(0),
      category: z.string().optional(),
    })
  ).optional(),
})

/**
 * Schema de validation pour l'ajustement express de stock
 */
export const stockAdjustSchema = z.object({
  productId: z.string().min(1, 'L\'ID du produit est requis'),
  quantity: z.number().positive('La quantité doit être supérieure à 0'),
  type: z.enum(['in', 'out'], {
    required_error: 'Le type doit être "in" (entrée) ou "out" (sortie)',
  }),
  reason: z.string().min(1, 'Le motif de l\'ajustement est requis'),
  notes: z.string().optional(),
})

/**
 * Schema de validation pour la fusion de produits doublons
 */
export const stockMergeSchema = z.object({
  sourceProductId: z.string().min(1, 'L\'ID du produit source est requis'),
  targetProductId: z.string().min(1, 'L\'ID du produit cible est requis'),
})

/**
 * Helper de validation retournant un objet propre d'erreur ou les données typées
 */
export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    return {
      success: false,
      error: `${issue.path.join('.') ? issue.path.join('.') + ': ' : ''}${issue.message}`,
    }
  }
  return { success: true, data: result.data }
}
