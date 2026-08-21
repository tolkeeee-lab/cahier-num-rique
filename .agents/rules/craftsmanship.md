# Professional Software Craftsmanship Rules

## 1. No "AI Slop" Visual Design
- Never use generic purple/cyan gradient overload across entire interfaces.
- Avoid repetitive emojis before every heading and list item. Use clean Lucide SVG icons with consistent 1.5px stroke.
- Ensure high typographic contrast, readable line heights, and deliberate spacing.
- Use exact skeleton loaders instead of giant blocking spinners.

## 2. Authentic Human Copywriting
- Banned AI marketing clichés: "Révolutionnez", "Plongez dans le futur", "Propulsé par des algorithmes révolutionnaires", "Effet wow".
- Use crisp, natural, professional, direct business wording.

## 3. Strict Engineering & Zero-Bug Standard
- Zero `any` in TypeScript. All types must be strictly declared.
- Always provide optimistic UI updates with clean rollbacks on error.
- Defensive error handling: log structured details and provide actionable user recovery.
