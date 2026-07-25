/**
 * roleUtils.ts — Contrôle des autorisations et rôles utilisateurs
 */

export type UserRole = 'owner' | 'admin' | 'employee' | string

/**
 * Vérifie si l'utilisateur actuel est un employé (caissier).
 */
export function isEmployeeRole(role?: UserRole): boolean {
  if (!role) return false
  return role.toLowerCase() === 'employee'
}

/**
 * Détermine si le rôle autorise la consultation des prix d'achat grossiste et des marges bénéficiaires.
 */
export function canViewFinancialMargins(role?: UserRole): boolean {
  return !isEmployeeRole(role)
}

/**
 * Détermine si le rôle autorise la suppression définitive d'un produit du catalogue.
 */
export function canDeleteCatalogProduct(role?: UserRole): boolean {
  return !isEmployeeRole(role)
}

/**
 * Détermine si le rôle autorise l'accès à la configuration administrative et aux clés de sécurité.
 */
export function canAccessAdminSettings(role?: UserRole): boolean {
  return !isEmployeeRole(role)
}
