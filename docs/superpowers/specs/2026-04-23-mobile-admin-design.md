# App admin mobile — Design Spec

**Date :** 2026-04-23
**Scope :** v1 — app restaurateur iOS + Android

---

## Contexte

Ajout d'un dossier `mobile/` dans le monorepo `servr/`. L'app permet aux restaurateurs de gérer leurs opérations depuis un téléphone : réception des commandes, ouverture/fermeture du restaurant, impression des tickets et gestion de la disponibilité des articles.

Base : migration du `printer-app` existant (Expo 54, expo-dev-client, `react-native-esc-pos-printer` fonctionnel) dans `servr/mobile/`.

---

## Architecture

Monorepo `servr/`, nouveau dossier `mobile/` :

```
servr/
├── api/
├── frontend/
└── mobile/          ← nouveau
    ├── app/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── ios/
    ├── android/
    └── package.json
```

**Stack :**
- Expo 54 + Expo Router (file-based navigation)
- expo-dev-client (obligatoire pour les modules natifs d'impression)
- React Native 0.81, TypeScript
- Supabase JS (`@supabase/supabase-js`) — auth + realtime
- NativeWind + `react-native-reusables` (rnr) — design system shadcn-like pour les composants UI (drawer content, cards, toggles, etc.)
- `@react-navigation/drawer` (via Expo Router) — tiroir latéral natif avec header et bouton hamburger
- `react-native-esc-pos-printer` — impression réseau (TCP) et Bluetooth (BT)
- Expo Notifications — push notifications en background

---

## Navigation

```
(auth)/
  login.tsx                  — connexion Supabase, sélection restaurant si plusieurs

(app)/
  _layout.tsx                — drawer navigator (header + menu hamburger), restaurant actif en contexte
  orders/
    index.tsx                — liste commandes en cours (temps réel)
    [id].tsx                 — détail commande + actions (accept/reject/ready/complete)
  menu/
    index.tsx                — liste articles avec toggle disponibilité
  settings/
    index.tsx                — statut restaurant (ouvert/fermé), config imprimante, impression auto
```

**Navigation principale :** Drawer (tiroir latéral) déclenché par un bouton hamburger dans le header, basé sur `@react-navigation/drawer` via Expo Router (comportement natif : gestures, header intégré, animation). Le contenu du drawer (items, séparateurs, avatar resto, bouton logout) est stylisé avec **react-native-reusables (rnr)** par-dessus NativeWind pour rester cohérent avec le design system shadcn. Le header affiche le titre de l'écran courant et le nom du restaurant actif. Le drawer liste les sections (Commandes, Menu, Paramètres) et permet de changer de restaurant si l'utilisateur en gère plusieurs.

Accès protégé : redirect vers `(auth)/login` si pas de session Supabase.

---

## Authentification

- Supabase Auth — même système que le frontend Next.js
- JWT stocké via `expo-secure-store`
- Si l'utilisateur gère plusieurs restaurants, sélection au login (même logique que `user.restaurants` côté frontend)
- Le `restaurantId` actif est conservé dans un contexte React global

---

## Données & temps réel

### Commandes
- **Lecture initiale :** `GET /orders?restaurantId=…&status=pending,accepted,ready` via l'API Express
- **Temps réel :** Supabase Realtime, subscription sur la table `orders` filtrée par `restaurant_id` — nouvelles commandes et changements de statut arrivent sans polling
- **Actions :** `PATCH /orders/:id/status` — toute la logique métier reste dans l'API

### Statuts de commande
`pending` → `accepted` → `ready` → `completed`
`pending` → `rejected`

### Disponibilité articles
- `GET /menu-items?restaurantId=…` pour la liste
- `PATCH /menu-items/:id` avec `{ available: boolean }` pour le toggle

### Statut restaurant
- `PATCH /restaurants/:id` avec `{ isOpen: boolean }`

---

## Notifications push

- **Expo Notifications** pour les alertes en background (nouvelle commande)
- Token push enregistré sur le serveur à la connexion
- Déclenchement : Supabase Edge Function ou webhook sur insert dans `orders` → appel Expo Push API
- En foreground : Supabase Realtime suffit, pas de notif affichée

---

## Impression

### Bibliothèque
`react-native-esc-pos-printer` — déjà intégré et fonctionnel dans `printer-app`.

### Protocoles supportés
- **Réseau (TCP) :** imprimantes WiFi/Ethernet type Epson TM, Star Micronics
- **Bluetooth :** même lib, target préfixé `BT:`

### Hook `usePrinter`
Migré depuis `printer-app`, enrichi avec :
- `printOrder(order)` — formate et imprime un ticket de commande
- Toggle "impression automatique" (nouvelle commande → impression immédiate)
- Persistance de l'imprimante sélectionnée via `AsyncStorage`

### Format ticket
Ticket ESC/POS : nom du restaurant, numéro et heure de commande, liste des articles (quantité + nom + options), total. Format 80mm.

---

## Gestion des erreurs

- Perte réseau : Supabase Realtime se reconnecte automatiquement, indicateur visuel dans l'app
- Erreur impression : toast d'erreur + possibilité de relancer manuellement
- Session expirée : redirect automatique vers login

---

## Ce qui est hors scope (v1)

- Statistiques et analytics
- Gestion du menu (ajout/suppression d'articles) — uniquement toggle disponibilité
- Chat ou messagerie avec le client
- Multi-langue
- Support tablette (iPad)
