# Analyse — Bite App (Behance)

Source : [Behance — Bite AI Curated Food Planner](https://www.behance.net/gallery/217557791/Bite-AI-Curated-Food-Planner-UIUX-Design)

---

## Palette de couleurs

| Token | Valeur | Usage |
|---|---|---|
| Cream | `#FCF3EC` | Fond app — identique à Servr |
| Orange | `#FF5E29` | Primary, CTA — proche de `#E8521C` |
| Maroon | `#4E080C` | Profondeur, savory |
| Vert forêt | `#00804A` | Frais, végétal |
| Jaune | `#FFD12E` | Boissons, accent |
| Lavande | `#FFB6EF` | Fun, highlight |
| Noir | `#000000` | Surfaces sombres, texte |
| Blanc | `#FFFFFF` | Surfaces claires |

> Le fond cream `#FCF3EC` est identique à celui de Servr — cohérence confirmée.

---

## Food Cards — pattern clé

Format **carré** avec grands coins arrondis.

**Structure :**
- Fond coloré (noir, orange, lavande, jaune) = couleur dominante
- Nom de catégorie en très gros bold en haut à gauche (`Cocktail`, `Hot dog`, `Nuggets`)
- Nom du restaurant en petit sous le titre
- Badge de temps (pill) en haut à droite
- Photo food remplit le bas de la carte
- Texte blanc sur fonds sombres, noir sur fonds clairs

**Différence avec le design system Servr :** les cards Bite sont carrées, pas portrait 3/4. Le principe est identique — couleur brand dominante + bold label + photo.

---

## Typographie

- Titres sur les cards : très gros, weight 700–900, éditorial
- Le mot compte autant que la photo — le label EST le visuel
- Corps : sans-serif propre (DM Sans-like)
- Mélange de casse : titres en sentence case, labels catégorie en Title Case

---

## Pills / Tags

Système de filtres catégorie multicolore :
- Chaque catégorie a sa couleur propre (Sushi = vert, Desserts = maroon, Hamburger = jaune…)
- Pills arrondis (`border-radius: 100px`)
- Emoji intégrés au label
- Fond uni coloré ou outlined selon le niveau de sélection

---

## Stats blocks

Cards de statistiques : fond uni couleur + grand chiffre blanc centré. Pattern intéressant pour le back-office Servr (commandes, revenus, affluence).

---

## Ce qui est transposable pour Servr

| Pattern Bite | Application Servr |
|---|---|
| Food card carrée couleur + label bold | Popular cards (section menu storefront) |
| Pills multicolores par catégorie | Category nav (`CategoryNav`) |
| Stats blocks colorés | Stats tab back-office |
| Cream `#FCF3EC` comme fond | Déjà en place |
