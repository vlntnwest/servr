# Theming Migration — Token Kit

**Date:** 2026-04-28  
**Branch:** feat/useOrders  
**Scope:** `mobile/tailwind.config.js`, `mobile/global.css`

---

## Contexte

Le Token Kit "My Spots" (Tokens Kit.html) est la source de vérité pour le design system. Le theming actuel dans `tailwind.config.js` et `global.css` est partiellement aligné — les couleurs brand sont correctes, mais l'échelle typographique et les border radius divergent.

## Objectif

Aligner `tailwind.config.js` sur le Token Kit sans modifier les composants existants. Les changements de valeur (display, card-label) sont intentionnels et s'appliquent automatiquement via les classes CSS existantes.

---

## Fichiers modifiés

### `mobile/tailwind.config.js`

#### Typographie — `theme.extend.fontSize`

| Clé | Avant | Après | Type |
|-----|-------|-------|------|
| `display` | `"40px"` | `"56px"` | modifié |
| `card-label` | `"22px"` | `"32px"` | modifié |
| `display-sm` | `"32px"` | `"32px"` | conservé (utilisé dans login.tsx) |
| `logo` | absent | `"52px"` | ajouté |
| `logo-sm` | absent | `"28px"` | ajouté |
| `principle` | absent | `"18px"` | ajouté |
| `card-name` | absent | `"20px"` | ajouté |
| `micro` | absent | `"10px"` | ajouté |
| `nano` | absent | `"9px"` | ajouté |
| `caption`, `action`, `body-sm`, `body`, `heading` | inchangés | inchangés | — |

Token kit reference:
- `display` (56px) — Archivo Black, tracking -1px, app titles
- `logo` (52px) — Archivo Black, tracking -2px, lh 0.95, logomark
- `logo-sm` (28px) — Archivo Black, tracking -1px
- `card-label` (32px) — Archivo Black italic, food card overlay names
- `card-name` (20px) — Archivo Black italic, inline card names
- `principle` (18px) — Archivo Black, section principles
- `micro` (10px) — DM Sans 500, uppercase 0.06em tracking
- `nano` (9px) — DM Sans 500, uppercase

#### Border radius — `theme.extend.borderRadius`

Tous les tokens sont additifs ; aucun composant existant ne casse.

| Clé | Valeur | Usage Token Kit |
|-----|--------|-----------------|
| `swatch` | `"14px"` | Color swatches |
| `card` | `"16px"` | Standard cards (alias de `rounded-2xl`) |
| `note` | `"10px"` | Clearspace note |
| `icon` | `"20px"` | App icon mark |
| `pill` | `"100px"` | Boutons, tags (alias de `rounded-full`) |

#### Couleurs — `theme.extend.colors.brand`

| Clé | Valeur | Statut |
|-----|--------|--------|
| `bgCard` | `"#F0EAD8"` | ajouté (Card BG du token kit) |

### `mobile/global.css`

Aucun changement — les variables HSL existantes sont déjà correctement mappées sur les neutrals et surfaces du token kit.

---

## Ce qui ne change pas

- Variables HSL (`--background`, `--foreground`, `--primary`, etc.) — déjà alignées
- Polices (`font-sans`, `font-display`, etc.) — déjà déclarées
- Couleurs `brand.*` existantes — déjà conformes au token kit
- Espacement (`spacing.13`) — conservé
- `borderWidth.hairline` — conservé
- Tout composant `.tsx` — aucune modification nécessaire

## Impact visuel

- `<Text variant="display">` : 40px → 56px (plus grand, intentionnel)
- `<Text variant="cardLabel">` : 22px → 32px (plus grand, intentionnel)
- Tous les autres composants : inchangés
