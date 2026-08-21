/**
 * roleUtils.ts — Contrôle des autorisations et rôles utilisateurs
 */

export type UserRole = 'owner' | 'admin' | 'employee' | string | null

/**
 * Vérifie si l'utilisateur actuel est un employé (caissier, vendeur, etc.).
 */
export function isEmployeeRole(role?: UserRole | null): boolean {
  if (!role) return false
  const r = role.toLowerCase().trim()
  return r === 'employee' || r === 'caissier' || r === 'vendeur' || r === 'staff' || r === 'serveur' || r === 'commercial'
}

/**
 * Détermine si le rôle autorise la consultation des prix d'achat grossiste et des marges bénéficiaires.
 */
export function canViewFinancialMargins(role?: UserRole | null): boolean {
  return !isEmployeeRole(role)
}

/**
 * Détermine si le rôle autorise l'exportation des données et rapports comptables.
 */
export function canExportAccountingReports(role?: UserRole | null): boolean {
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

/**
 * Détermine si le rôle autorise la consultation du tableau de bord analytique exécutif.
 */
export function canViewExecutiveDashboard(role?: UserRole): boolean {
  return !isEmployeeRole(role)
}

/**
 * Détermine si le rôle autorise la modification de l'équipe et des employés.
 */
export function canManageTeam(role?: UserRole): boolean {
  return !isEmployeeRole(role)
}

export const DASHBOARD_WIDGET_IDS = {
  REVENUE_SUMMARY: 'revenue_summary',
  NET_MARGINS: 'net_margins',
  TOP_PRODUCTS: 'top_products',
  DEBT_SUMMARY: 'debt_summary',
  SYSCOHADA_SUMMARY: 'syscohada_summary',
  ACTIVITY_WIDGET: 'activity_widget',
  DAILY_CAISSE: 'daily_caisse',
} as const

/**
 * Retourne la liste des IDs de widgets visibles par défaut selon le rôle et l'activité.
 */
export function getDefaultDashboardWidgets(role?: UserRole, _activity: string = 'boutique'): string[] {
  if (isEmployeeRole(role)) {
    return [DASHBOARD_WIDGET_IDS.DAILY_CAISSE, DASHBOARD_WIDGET_IDS.REVENUE_SUMMARY]
  }

  // Pour le Patron / Gérant : tout afficher par défaut
  return [
    DASHBOARD_WIDGET_IDS.REVENUE_SUMMARY,
    DASHBOARD_WIDGET_IDS.NET_MARGINS,
    DASHBOARD_WIDGET_IDS.TOP_PRODUCTS,
    DASHBOARD_WIDGET_IDS.DEBT_SUMMARY,
    DASHBOARD_WIDGET_IDS.SYSCOHADA_SUMMARY,
    DASHBOARD_WIDGET_IDS.ACTIVITY_WIDGET,
  ]
}

