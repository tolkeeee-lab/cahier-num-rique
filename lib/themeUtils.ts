/**
 * themeUtils.ts — Gestion du Thème Clair / Mode Sombre Nuit Caisse
 */

export type ThemeMode = 'light' | 'dark'

/**
 * Récupère le thème actuellement configuré.
 */
export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem('cahier_theme_mode') as ThemeMode) || 'light'
}

/**
 * Applique et sauvegarde le thème choisi sur le document HTML.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('cahier_theme_mode', theme)
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
