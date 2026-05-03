# Servr — Design System (basé sur l'app mobile `core/app`)

> Ce document est la **source de vérité visuelle** pour le frontend web.
> Il a été extrait du dossier `mobile/` de la branche `core/app` afin
> d'aligner l'esthétique web sur celle de l'app mobile native (Expo / NativeWind).
>
> Aucune modification d'architecture — uniquement le visuel (couleurs, typographies,
> rayons, espacements, composants UI, hiérarchie de styles).

---

## 1. Esprit graphique

L'identité visuelle de Servr (côté mobile) repose sur :

- Une **base crème / sable** chaleureuse (papier kraft / lin), pas de blanc pur.
- Un **noir encre profond** comme texte principal.
- Un **orange feu** comme couleur d'accent / CTA / branding.
- Des accents secondaires saturés mais terreux : **bordeaux, lime, jaune ocre,
  rose magenta, vert forêt** — utilisés sur les badges et états.
- Une typographie **éditoriale** : `Archivo Black` pour les displays
  (italique pour les "labels carte"), `DM Sans` pour le texte courant.
- Des **rayons généreux** (cards 16px, pills 9999px) et des **bordures hairline**
  (1.5px) douces, sans shadows agressives.

---

## 2. Couleurs (HSL + brand tokens)

### Tokens sémantiques (clair)

| Token | HSL | Usage |
|---|---|---|
| `--background` | `43 45% 92%` | Fond principal (crème) |
| `--foreground` | `0 0% 10%` | Texte principal (encre) |
| `--card` | `40 39% 86%` | Surfaces secondaires (sable) |
| `--card-foreground` | `0 0% 10%` | Texte sur card |
| `--popover` | `43 45% 92%` | Popovers / sheets |
| `--primary` | `16 82% 51%` | Orange — CTA, accent |
| `--primary-foreground` | `43 45% 92%` | Texte sur orange |
| `--secondary` | `40 39% 86%` | Surface neutre |
| `--secondary-foreground` | `0 0% 10%` | |
| `--muted` | `40 39% 86%` | Surface atténuée |
| `--muted-foreground` | `27 10% 49%` | Texte secondaire (stone) |
| `--accent` | `16 82% 51%` | Accent (≈ primary) |
| `--accent-foreground` | `43 45% 92%` | |
| `--destructive` | `0 61% 26%` | Bordeaux — actions destructives |
| `--destructive-foreground` | `43 45% 92%` | |
| `--border` | `41 30% 82%` | Bordures hairline |
| `--input` | `41 30% 82%` | Bordures input |
| `--ring` | `16 82% 51%` | Anneau focus |

### Tokens sémantiques (sombre)

| Token | HSL |
|---|---|
| `--background` | `0 0% 10%` |
| `--foreground` | `43 45% 92%` |
| `--card` | `0 0% 12%` |
| `--secondary` / `--muted` | `0 0% 16%` |
| `--muted-foreground` | `30 4% 60%` |
| `--destructive` | `0 72% 40%` |
| `--border` / `--input` | `0 0% 16%` |
| `--primary` / `--accent` / `--ring` | `16 82% 51%` |

### Brand palette (couleurs nommées)

| Token | Hex | Usage |
|---|---|---|
| `brand.cream` | `#F5EFE0` | Fond clair |
| `brand.sand` | `#E8E0CE` | Surface card claire |
| `brand.bgCard` | `#F0EAD8` | Variante card |
| `brand.border` | `#DDD5C4` | Bordures |
| `brand.ink` | `#1A1A1A` | Texte / fond sombre |
| `brand.stone` | `#8A7F72` | Texte secondaire |
| `brand.orange` | `#E8521C` | **Accent principal** |
| `brand.maroon` | `#6B1A1A` | Destructif |
| `brand.lime` | `#A8D040` | Statut "prêt / livré" |
| `brand.yellow` | `#F0C030` | Statut "en attente" |
| `brand.pink` | `#E840B0` | Texte sur statut "annulé" |
| `brand.forest` | `#1A4A20` | Texte sur badges clairs |

### Mapping statuts commande

| Statut | Fond | Texte |
|---|---|---|
| `PENDING` / `PENDING_ON_SITE_PAYMENT` | `brand.yellow` | `brand.forest` |
| `IN_PROGRESS` | `brand.orange` | `brand.cream` |
| `COMPLETED` / `DELIVERED` | `brand.lime` | `brand.forest` |
| `CANCELLED` | `brand.maroon` | `brand.pink` |

---

## 3. Typographie

### Familles

| Famille | Police | Usage |
|---|---|---|
| `display` | **Archivo Black** | Titres XL, hero, numéros de commande |
| `display-italic` | **Archivo Black Italic** | "Card labels" (ex : `#A12`) |
| `sans` | **DM Sans 400** | Texte courant |
| `sans-light` | DM Sans 300 | |
| `sans-medium` | DM Sans 500 | Boutons, méta, labels |
| `sans-semibold` | DM Sans 600 | Titres de section, totaux |
| `sans-italic` | DM Sans 400 Italic | Citations, descriptions |
| `sans-bold-italic` | DM Sans 700 Italic | Emphase forte |

### Échelle de tailles

| Token | Taille | Usage |
|---|---|---|
| `nano` | 9px | Filigranes |
| `micro` | 10px | Légendes, lettrages all-caps |
| `caption` | 11px | Labels eyebrow |
| `action` | 12px | Liens secondaires |
| `body-sm` | 13px | Texte secondaire |
| `body` | 15px | Texte courant |
| `principle` | 18px | Sous-titres |
| `card-name` | 20px | Nom dans une card |
| `heading` | 22px | Total, titres section |
| `card-label` | 24px | "Numéro" sur card (display-italic) |
| `logo-sm` | 28px | Numéro de commande détail |
| `display-sm` | 32px | Hero secondaire |
| `display` | 48px | **Titres de page principaux** |
| `logo` | 52px | Logo / wordmark |

### Letter-spacing

| Token | Valeur | Usage |
|---|---|---|
| `cta` | 0.02em | Boutons |
| `pill` | 0.04em | Pills |
| `meta` | 0.06em | Méta uppercase |
| `label` | 0.08em | Labels "EYEBROW" |
| `eyebrow` | 0.1em | Eyebrows |
| `section` | 0.14em | Section titles uppercase |

> Astuce : titres `display` utilisent `tracking-tighter` (resserré, -0.02em).

---

## 4. Rayons & bordures

| Token | Valeur | Usage |
|---|---|---|
| `rounded-note` | 10px | Petits éléments |
| `rounded-swatch` | 14px | Toggles, sélecteurs |
| `rounded-card` | 16px | **Cards** (par défaut) |
| `rounded-icon` | 20px | Conteneurs d'icône |
| `rounded-pill` / `rounded-full` | 100px | Boutons, badges |

| Bordure | Valeur |
|---|---|
| `border-hairline` | 1.5px |
| `border` | 1px |

> Les surfaces n'ont **pas** de shadows lourdes : `shadow-sm shadow-black/5` max.

---

## 5. Espacements clés

- Padding latéral des écrans : `px-5` (20px) sur mobile, `px-7` (28px) sur formulaire login.
- Padding vertical haut d'écran : `pt-12` à `pt-13` (48-52px).
- Gap par défaut entre items : `gap-2` à `gap-4`.
- Spacing custom `13` = `52px`.
- Cards : `px-6 py-5`.

---

## 6. Composants — anatomie

### Button

- **Forme** : `rounded-full` (pill), `gap-2`, alignement centré.
- **Tailles** : `sm` h-9 px-4 / `default` h-12 px-6 py-3 / `lg` h-14 px-8 / `icon` 11x11.
- **Variants** :
  - `default` : `bg-primary` (orange), texte `primary-foreground` (crème).
  - `destructive` : `bg-destructive` (bordeaux), texte blanc.
  - `outline` : bordure `border-border`, fond `background`.
  - `secondary` : `bg-secondary` (sable).
  - `ghost` : transparent, hover `bg-accent`.
  - `link` : souligné.
- **Texte** : `font-sans-medium`, `text-body`, letter-spacing `cta`.
- **Shadow** : `shadow-sm shadow-black/5` (très légère).
- État disabled : `opacity-50`.

### Card

- **Fond** : `bg-card` (sable) ou `bg-white` (cards d'orders).
- **Bordure** : `border border-brand-border`.
- **Rayon** : `rounded-card` (16px).
- **Padding** : `px-6 py-5` (orderCard) ou `py-6` + `px-6` sur header.
- **Shadow** : `shadow-sm shadow-black/5`.
- **Pressed state (mobile)** : `scale 0.97` 100ms.

### Input

- **Forme** : `rounded-md`, `h-10`, `px-3 py-1`.
- **Bordure** : `border border-input`.
- **Fond** : `bg-background` (crème).
- **Focus** : `ring-ring/50`, `ring-[3px]`, bordure `ring`.
- **Login version** : `rounded-xl`, `px-4 py-3.5`, fond `white/50`,
  hairline border, fond plein quand focus.

### Badge

- **Forme** : `rounded-full`, `px-2 py-0.5` (ou `px-3 py-1` sur status).
- **Variants** : `default` (orange), `secondary` (sable), `destructive`,
  `outline` (bordure seule).
- **Texte** : `font-sans-semibold`, `text-caption` (11px), uppercase,
  letter-spacing `meta` à `label`.

### Separator

- Trait `1px` couleur `border-border`, plein largeur.

### Label (form)

- `font-sans-medium`, `text-caption` (11px), uppercase, `tracking-label`,
  couleur `text-muted-foreground`, marge basse `mb-2`.

---

## 7. Patterns écrans clés

### Header de page (orders, menu)

```
┌──────────────────────────────────────────┐
│  Commandes                               │  ← font-display, text-display, tracking-tighter
└──────────────────────────────────────────┘
```
- `pt-12 pb-4 px-5`.

### Order Card

```
┌──────────────────────────────────────────┐
│ #A12        ────────────  [En cours]    │  ← display-italic 24px / badge orange
│ Marie Dupont                             │  ← body
│ 3 ARTICLES · 19:30                       │  ← uppercase, letter-spacing 0.78
│                                       42€ │  ← font-sans-semibold heading 22px
└──────────────────────────────────────────┘
```
- Fond `bg-white`, bordure `brand-border`, rayon `rounded-card`.
- Padding `px-6 py-5`.

### Login

- Logo : `My.` + `Spots` en `font-display`, le `.` en orange.
- Sous-titre : `text-body-sm` muted.
- Inputs : pill arrondi (`rounded-xl`), fond `white/50` au repos / `white` au focus,
  hairline border `foreground` au focus.
- Bouton primaire : `rounded-full bg-foreground` (noir), texte crème, `tracking-cta`.
- Padding écran : `px-7 pt-13`.

### Restaurant card (sélection)

- Fond `bg-brand-orange`, texte `brand.cream`.
- Rayon `rounded-2xl`, padding `py-4 px-5`.
- Chevron right en crème.

---

## 8. Ce qui change côté web (avant → après)

| Avant (web actuel) | Après (mobile aligned) |
|---|---|
| Fond gris/blanc neutre | **Crème `#F5EFE0`** |
| Primary bleu `#1f4493` | **Orange `#E8521C`** |
| Cards `rounded-lg` (8px) blanches | **`rounded-card` (16px)** sable/blanc avec hairline |
| Boutons `rounded-sm` (4px) | **`rounded-full` (pill)** |
| Inputs `rounded-sm` (4px) | **`rounded-md`/`rounded-xl`** |
| Police générique `system-ui` | **Archivo Black + DM Sans** |
| Titres `font-bold` | **`font-display` tracking-tighter** |
| Border `black/5` | **`brand.border` (#DDD5C4)** |
| Texte secondaire `#676767` | **`brand.stone` (#8A7F72)** |
| Pas d'identité de marque | **Wordmark `Servr.`** display |

---

## 9. Conventions de code

- Tailwind v4 avec `@theme` dans `globals.css`.
- Variables HSL exposées en custom properties (`--color-primary`, etc.).
- Helper `cn()` (clsx + tailwind-merge).
- Composants `ui/` reproduisent les variants mobile.
- Pas de styles inline sauf pour les valeurs dynamiques (couleurs de statut).

---

## 10. Checklist de migration

- [x] Analyser dossier `mobile/` (`core/app`).
- [x] Créer `DESIGN_SYSTEM.md`.
- [ ] Réécrire `app/globals.css` (tokens HSL + brand + fontes + rayons).
- [ ] Mettre à jour `app/layout.tsx` (charger Archivo Black + DM Sans).
- [ ] Refondre `components/ui/button.tsx` (pill + variants).
- [ ] Refondre `components/ui/card.tsx` (rounded-card + sable).
- [ ] Refondre `components/ui/input.tsx` (rounded-md, brand colors).
- [ ] Refondre `components/ui/badge.tsx` (status mapping).
- [ ] Refondre `app/page.tsx` (landing crème + orange).
- [ ] Refondre `app/login/page.tsx` (look mobile).
- [ ] Refondre `app/register/page.tsx`.
- [ ] Vérifier `components/layout/header.tsx`.
