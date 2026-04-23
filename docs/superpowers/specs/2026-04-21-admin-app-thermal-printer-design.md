# Design — App Admin Servr (Expo) & Impression Thermique Bluetooth

> Date : 2026-04-21 · Auteur : brainstorm collaboratif
> Branche de travail : `feat/admin-app-mvp` (à créer)

## 1. Contexte

Servr est un SaaS de commande pour restaurants (backend Node/Express/Prisma/Supabase en `api/`, frontend Next.js pour les clients en `frontend/`). Aujourd'hui l'opérateur du restaurant n'a pas d'interface mobile dédiée pour gérer le flux des commandes entrantes — il s'appuie sur le web, mal adapté à un usage au comptoir et incapable d'imprimer un ticket.

Ce document spécifie la **première version** (MVP) d'une app mobile admin en Expo, destinée à être utilisée au comptoir (principalement iPad), avec comme fonctionnalité clé **l'impression Bluetooth d'un ticket de commande** vers une imprimante thermique Epson TM-m30III.

## 2. Objectifs

- Permettre au staff du restaurant de recevoir les commandes en temps réel (alerte sonore + notification).
- Permettre de valider (accepter) une commande d'un tap et **déclencher l'impression** d'un ticket unique regroupant les infos cuisine et le récap client.
- Permettre de réimprimer un ticket à la demande.
- Permettre de gérer la progression d'une commande (PENDING → IN_PROGRESS → COMPLETED → DELIVERED) et d'annuler.
- Fiable en conditions réelles : gérer la déconnexion réseau, la déconnexion imprimante, le rouleau de papier vide, sans bloquer le service.

## 3. Hors scope (MVP)

- Gestion du menu, des catégories, des produits, des options.
- Gestion des horaires d'ouverture, des horaires exceptionnels.
- Gestion de l'équipe, des rôles, des invitations.
- Statistiques et reporting.
- Codes promo (gestion — la prise en compte à l'impression est couverte).
- Impression multi-exemplaires (cuisine + caisse séparés).
- QR code sur le ticket.
- Internationalisation — FR uniquement.
- Mode kiosque / auto-lock.
- Switch de restaurant en cours de session.
- Tests E2E automatisés (Detox / Maestro).
- Publication sur App Store / Play Store (au MVP on utilise EAS internal distribution).

## 4. Décisions produit

| Sujet | Décision |
|---|---|
| Portée MVP | Gestion des commandes + impression uniquement (scope A) |
| Plateformes | iOS + Android |
| Modèle imprimante de référence | Epson TM-m30III (BLE, MFi) |
| Stack d'impression | Wrapper `react-native-esc-pos-printer` (ePOS SDK Epson) |
| Signal à la réception | Son in-app + vibration + push notification (selon état app) |
| Déclenchement impression | Manuel, à l'acceptation de la commande par le staff (PENDING → IN_PROGRESS) |
| Contenu du ticket | 1 seul ticket regroupant infos cuisine + récap client + total |
| Échec d'impression | Non bloquant : la commande avance quand même, bannière "⚠️ Non imprimé [Réimprimer]" |
| Retry automatique | Non — le staff réimprime manuellement si échec |
| Rôle requis pour utiliser l'app | Être membre admin du resto (via `RestaurantMember`) — un seul rôle dans le modèle, pas de hiérarchie |
| Multi-restaurants | 1 device = 1 session = 1 resto. Switcher = se déconnecter/reconnecter |
| Distribution | EAS internal (TestFlight + APK direct) pour MVP |

## 5. Architecture globale

### 5.1 Organisation du repo

```
servr/
├── api/           (existant)
├── frontend/      (existant)
└── admin-app/     (NOUVEAU)
```

Pas de monorepo pnpm/Turborepo au MVP. Les trois packages restent indépendants côté tooling. Peut évoluer plus tard si des types partagés apparaissent.

### 5.2 Structure interne de `admin-app/`

```
admin-app/
├── app/                          # Expo Router (file-based)
│   ├── _layout.tsx               # Root (providers, fonts, safe area)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (app)/
│   │   ├── _layout.tsx           # Guard auth + session resto
│   │   ├── orders/
│   │   │   ├── index.tsx         # Liste temps réel (écran principal)
│   │   │   └── [id].tsx          # Détail commande
│   │   └── settings/
│   │       ├── index.tsx
│   │       ├── printer.tsx       # Pairing + test
│   │       ├── notifications.tsx
│   │       └── account.tsx
│   ├── onboarding/
│   │   ├── pick-restaurant.tsx   # Sélecteur au 1er login (si >1 resto)
│   │   └── printer.tsx           # Pairing au 1er lancement (skippable)
│   └── +not-found.tsx
├── src/
│   ├── api/                      # Client HTTP
│   │   ├── client.ts             # fetch wrappé, injecte JWT
│   │   ├── orders.ts             # CRUD orders
│   │   └── devices.ts            # register / delete push token
│   ├── realtime/
│   │   └── socket.ts             # socket.io-client + reconnexion
│   ├── printer/
│   │   ├── connection.ts         # Singleton, lifecycle BT
│   │   ├── discovery.ts          # Scan / pairing
│   │   ├── render.ts             # renderTicket(order, lineWidth)
│   │   ├── queue.ts              # Queue in-memory, no retry
│   │   ├── types.ts
│   │   └── __tests__/
│   ├── notifications/
│   │   ├── push.ts               # expo-notifications
│   │   └── sound.ts              # expo-av (new-order.mp3)
│   ├── contexts/
│   │   ├── SessionContext.tsx    # user + restaurant (immuable par session)
│   │   └── PrinterContext.tsx    # Expose status + méthodes printer
│   ├── hooks/
│   │   ├── useOrders.ts          # React Query + WS updates
│   │   ├── useAcceptOrder.ts     # Orchestre update + print
│   │   └── useNewOrderAlert.ts   # Son + vibration à l'arrivée
│   └── lib/
│       ├── supabase.ts           # Client @supabase/supabase-js
│       ├── format.ts             # Prix, heures, numéros de commande
│       └── constants.ts
├── assets/
│   └── sounds/new-order.mp3
├── app.json
├── eas.json
└── package.json
```

### 5.3 Flux de données — de la commande au ticket

```
Client (frontend Next.js)
   │ POST /api/orders (Stripe payé)
   ▼
Backend (api/)
   ├─ Insert DB (status=PENDING)
   ├─ io.to(`restaurant:${id}`).emit("order:new", order)
   └─ expoPush.send(tokens, { title, body, data })
                │
                ▼
Admin app (iPad au comptoir)
   │
   ├─[WS order:new] → useOrders cache update + son + vibration
   ├─[push]        → OS notif si app en background
   │
   ▼ Staff tape "Accepter & imprimer"
   │
   ├─ PATCH /api/orders/:id/status { status: "IN_PROGRESS" }  (optimistic)
   ├─ renderTicket(order, lineWidth) → commands
   └─ printer.enqueue(commands)
          │
          ├─ success → retire le job
          └─ failure → marque job failed → bannière "Non imprimé"
```

## 6. Stack technique

### 6.1 Dépendances principales

```jsonc
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "expo-dev-client": "~5.0.0",
  "react": "18.3.1",
  "react-native": "0.76.x",

  "@supabase/supabase-js": "^2.x",
  "@tanstack/react-query": "^5.x",
  "socket.io-client": "^4.8.3",
  "expo-secure-store": "*",
  "@react-native-async-storage/async-storage": "*",

  "react-native-esc-pos-printer": "^4.x",
  "expo-notifications": "*",
  "expo-av": "*",
  "expo-device": "*",
  "expo-haptics": "*",

  "nativewind": "^4.x",
  "lucide-react-native": "*",
  "react-native-safe-area-context": "*",
  "react-native-screens": "*",
  "react-native-gesture-handler": "*",
  "react-native-reanimated": "*",

  "@sentry/react-native": "^5.x"
}
```

### 6.2 Choix et justifications

- **Expo Router v4** : file-based, cohérent avec le App Router Next.js utilisé côté frontend.
- **NativeWind** : Tailwind en RN, mental model identique au `frontend/` qui utilise Tailwind 4.
- **React Query** : cache + refetch + optimistic updates pour l'acceptation de commande.
- **socket.io-client** : même version que le backend pour éviter les soucis de handshake.
- **expo-secure-store** : token Supabase (sensible). **AsyncStorage** : préférences non sensibles (MAC imprimante, restaurant actif persisté post-logout, etc.).
- **expo-av** : son in-app qui peut ignorer le silent mode iOS (catégorie `playback`).
- **Sentry React Native** : ajouté en Phase 1, projet partagé avec le backend existant.

### 6.3 Configuration Expo (`app.json`)

Points critiques :

```json
{
  "expo": {
    "name": "Servr Admin",
    "slug": "servr-admin",
    "scheme": "servr-admin",
    "ios": {
      "bundleIdentifier": "com.servr.admin",
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "Servr Admin se connecte à votre imprimante thermique pour imprimer les commandes.",
        "NSBluetoothPeripheralUsageDescription": "Servr Admin se connecte à votre imprimante thermique pour imprimer les commandes.",
        "UISupportedExternalAccessoryProtocols": ["com.epson.escpos"]
      }
    },
    "android": {
      "package": "com.servr.admin",
      "permissions": [
        "BLUETOOTH", "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT", "BLUETOOTH_SCAN",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "react-native-esc-pos-printer",
        { "iosBluetooth": true, "iosUsb": false }
      ]
    ]
  }
}
```

**Pièges à éviter :**

- `UISupportedExternalAccessoryProtocols = ["com.epson.escpos"]` est **obligatoire** pour que l'iPad détecte une imprimante Epson MFi. Sans cette clé, l'app ne la verra jamais.
- Les permissions Android 12+ (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) remplacent les anciennes. Il faut les deux pour supporter les devices plus anciens.

### 6.4 Variables d'environnement

```
EXPO_PUBLIC_API_URL=https://api.servr.app
EXPO_PUBLIC_WS_URL=wss://api.servr.app
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Côté backend, nouvelle variable : `EXPO_ACCESS_TOKEN` (facultative au strict sens technique, recommandée pour le monitoring des receipts Expo).

### 6.5 Profils EAS Build

- `development` : dev build + dev client (hot reload).
- `preview` : internal distribution (APK direct + TestFlight internal) — utilisé pour le client pilote.
- `production` : stores publics (hors MVP).

## 7. Temps réel, son et notifications

### 7.1 Trois canaux complémentaires

1. **WebSocket** (`socket.io-client`) — canal primaire, app au premier plan.
2. **Push notifications** (`expo-notifications` + `expo-server-sdk` côté backend) — fallback si app en arrière-plan / écran verrouillé.
3. **Polling de rattrapage** — à chaque (re)connexion WS, `GET /api/orders?since=<ts>` pour combler le trou.

### 7.2 WebSocket

- Ouvert dès que la `SessionContext` expose `{ userId, restaurantId }`.
- Handshake JWT Supabase (réutilise l'authentification WS de Phase 1.5).
- Évents consommés : `order:new`, `order:update` (patch uniquement, pas de son).
- Reconnexion auto : `reconnectionAttempts: Infinity`, `reconnectionDelayMax: 10_000`.
- Indicateur de statut (🟢 connecté / 🟠 reconnexion / 🔴 offline) visible dans le header.

### 7.3 Push notifications

- Au login (et au refresh de session), l'app :
  1. Demande la permission.
  2. Récupère son **Expo Push Token**.
  3. Appelle `POST /api/devices/register` avec `{ token, platform, restaurantId }`.
- Au logout explicite : `DELETE /api/devices/:token`.
- Côté backend, `sendNewOrderPush(restaurantId, order)` s'exécute **juste après** le `io.emit` dans `createOrder`.
- Son de notification custom (iOS `.caf`, Android `.mp3`). Au MVP on peut commencer par `default` et ajouter le son custom en Phase 1 si le timing le permet.
- Badge iOS = nombre de commandes PENDING.
- Data payload : `{ type: "order:new", orderId, restaurantId }` pour deep link à l'ouverture.

### 7.4 Polling de rattrapage

- Déclenché automatiquement à chaque connexion/reconnexion WS réussie.
- `GET /api/orders?since=<last_seen_timestamp>` (endpoint existant à étendre si nécessaire).
- Limité à 100 résultats, tri par `createdAt` DESC.
- Si les commandes récupérées contiennent du nouveau (non présent en cache), on déclenche le son/vibration **une seule fois** pour éviter le spam.

### 7.5 Son in-app

- Fichier `assets/sounds/new-order.mp3` (~1.5s, son de cloche distinct).
- Lecture via `expo-av`, catégorie `playback` (ignore silent mode iOS).
- Joué uniquement sur `order:new`, jamais sur `order:update`.
- Couplage systématique avec `expo-haptics` (vibration + tap haptique).

## 8. Module d'impression

### 8.1 Principe

Module `src/printer/` isolé en 4 sous-fichiers à responsabilité unique. `render` et `queue` sont des fonctions pures testables sans matériel. `connection` et `discovery` sont les seuls à toucher au SDK natif.

### 8.2 `discovery.ts`

```ts
export type DiscoveredPrinter = {
  name: string;
  identifier: string;   // BT MAC (Android) ou UUID (iOS)
  target: string;       // "BT:00:01:90:..." pour le SDK
};

export async function scanPrinters(timeoutMs?: number): Promise<DiscoveredPrinter[]>;
export async function stopScan(): Promise<void>;
```

Utilise `Discovery.start({ portType: 'Bluetooth' })` du wrapper. Résultats accumulés en stream avec timeout par défaut de 10s. L'UI affiche un spinner et liste au fil de l'eau.

### 8.3 `connection.ts`

Singleton exposé via `PrinterContext`, maintient une connexion **persistante** (choix produit Q6.1).

```ts
type PrinterStatus =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; lineWidth: number; model: string }
  | { kind: 'error'; reason: string };

export interface PrinterConnection {
  status: PrinterStatus;                       // observable / Context
  connect(target: string): Promise<void>;
  disconnect(): Promise<void>;
  print(commands: PrintCommands): Promise<void>;
  getStatus(): Promise<{ online: boolean; paperOk: boolean; coverOk: boolean }>;
}
```

**Comportements :**

- **Auto-reconnect** avec backoff 1s → 2s → 5s → 10s (plafond 10s, jamais d'abandon).
- **Détection de capacités** : à la connexion, on lit `paperWidth` via le SDK et on en déduit `lineWidth` (42 pour 80mm, 32 pour 58mm).
- **Heartbeat** toutes les 30s pour rafraîchir l'indicateur 🟢/🟠/🔴 du header.
- Méthode `print` rejette proprement si hors ligne — c'est `queue.ts` qui gère la suite.

### 8.4 `render.ts` — Fonction pure

```ts
export type TicketInput = {
  restaurant: { name: string };
  order: Order;
};

export type PrintCommands = Array<
  | { type: 'text'; value: string; style?: TextStyle }
  | { type: 'feed'; lines: number }
  | { type: 'cut' }
>;

export function renderTicket(input: TicketInput, lineWidth: number): PrintCommands;
```

**Règles de layout :**

- Nom du resto : centré, gras, taille x2.
- Ligne `=` pleine largeur.
- Numéro de commande (ex: `#A4F9`), date/heure de réception, heure prévue (`ASAP` ou `HH:mm`).
- Client : prénom + initiale nom + téléphone.
- Séparateur `-` pleine largeur.
- Liste produits : saut de ligne entre chaque produit (pas de séparateur visuel lourd), options en retrait avec `  - `, note produit précédée de `> ` pour la visibilité.
- Séparateur `-` pleine largeur.
- Totaux (sous-total, promos, total payé) alignés à droite.
- Moyen de paiement (`💳 Stripe ✓`).
- `feed(3)` puis `cut()` pour finaliser.

Tests : snapshots pour `lineWidth = 42` et `lineWidth = 32` avec plusieurs jeux de données (commande minimale, commande avec note, avec promo, avec options, avec nom produit très long).

### 8.5 `queue.ts`

```ts
interface PrintJob {
  id: string;
  orderId: string;
  commands: PrintCommands;
  status: 'pending' | 'printing' | 'printed' | 'failed';
  attempts: number;
  createdAt: number;
  lastError?: string;
}
```

**Comportement (décision Q6 + "pas de retry") :**

- Queue **en mémoire uniquement** (pas de persistance au MVP).
- Consommation **séquentielle** (un seul job à la fois pour éviter de mélanger des tickets).
- **Aucun retry automatique** : si l'impression échoue, le job reste en `failed`, la carte de la commande affiche `⚠️ Non imprimé [Réimprimer]`. Le staff décide.
- Méthode `retry(jobId)` explicite appelée par le bouton "Réimprimer".
- Job `printed` retiré de la queue après succès.

### 8.6 Intégration côté UI — `useAcceptOrder`

```ts
async function acceptOrder(order: Order) {
  // 1. Optimistic update (UI instantanée)
  queryClient.setQueryData(
    ['orders'],
    patchOrderStatus(order.id, 'IN_PROGRESS')
  );

  try {
    // 2. Appel API
    await api.orders.updateStatus(order.id, 'IN_PROGRESS');

    // 3. Rendu et enqueue (non bloquant)
    const lineWidth =
      printer.status.kind === 'connected' ? printer.status.lineWidth : 42;
    const commands = renderTicket({ restaurant, order }, lineWidth);
    printer.enqueue({ orderId: order.id, commands });
  } catch (err) {
    // Rollback optimistic
    queryClient.invalidateQueries(['orders']);
    showError("Impossible d'accepter la commande");
  }
}
```

L'erreur d'impression n'est jamais remontée via throw. Le job `failed` est observé via le state exposé par `PrinterContext`, et la carte de commande affiche la bannière correspondante.

### 8.7 Bouton "Tester l'impression"

Écran `settings/printer.tsx`. Génère un ticket de démo à partir d'une commande fixture et l'envoie. Indispensable pour :

- Vérifier le pairing avant un service.
- Valider le rendu (centrage, largeur, coupe).
- Diagnostiquer (papier vide, rouleau, couvercle ouvert).

## 9. Écrans

### 9.1 Liste des écrans

| Route | Rôle |
|---|---|
| `/login` | Auth Supabase |
| `/onboarding/pick-restaurant` | Sélecteur au 1er login si `restaurantMembers.length > 1` |
| `/onboarding/printer` | Pairing obligatoire (skippable) au 1er lancement |
| `/orders` | **Liste temps réel — écran principal** |
| `/orders/[id]` | Détail + actions |
| `/settings` | Menu réglages |
| `/settings/printer` | Pairing, test, status |
| `/settings/notifications` | Permissions, sons, vibration |
| `/settings/account` | Affichage user + resto actif, logout |

### 9.2 Écran liste (orders/index) — spécification

- Header persistant : nom resto actif, pastille statut WS, pastille statut imprimante (🖨️🟢/🟠/🔴), accès réglages, accès compte.
- Deux onglets : **En cours** (PENDING + IN_PROGRESS + COMPLETED) / **Terminées** (DELIVERED + CANCELLED, 7 derniers jours).
- Tri : nouvelles en tête (par `createdAt` DESC pour ASAP, par `scheduledFor` ASC pour les planifiées — à arbitrer en implémentation).
- Chaque carte : numéro, type (ASAP / Prévue HH:mm), temps écoulé depuis réception, nom client, nombre de produits, total, bouton principal contextuel, bouton "Voir détails".
- Bouton principal change selon statut :
  - PENDING → `[ Accepter & imprimer ]`
  - IN_PROGRESS → `[ Marquer prête ]`
  - COMPLETED → `[ Marquer livrée ]`
- Surlignage 10s des nouvelles commandes avec animation d'entrée.
- Bannière `⚠️ Non imprimé [Réimprimer]` visible sur les cartes dont le job est en statut `failed` dans la queue.

### 9.3 Écran détail

- En-tête : numéro, statut, bouton Annuler (confirme + déclenche le refund automatique existant en backend).
- Infos client : nom, téléphone (cliquable : `tel:`).
- Infos commande : mode de consommation, type de timing (ASAP/planifié), heure de réception, heure prévue.
- Liste produits : quantité, nom, options, note produit.
- Totaux : sous-total, promos, total payé.
- Moyen de paiement avec `stripePaymentIntentId`.
- Actions : `Accepter & imprimer` ou `Réimprimer`, selon statut.

### 9.4 Écran pairing imprimante

- Zone "Imprimante actuelle" avec nom, adresse MAC, statut, largeur papier détectée.
- Boutons : `Tester l'impression`, `Changer d'imprimante`, `Oublier`.
- Options : toggle "Bip à l'impression".
- Vue de scan : liste live des devices BT détectés avec bouton `Lier` par ligne.

## 10. Modifications backend

### 10.1 Prérequis de migration (schéma actuel insuffisant)

Deux champs mentionnés dans la discussion produit **n'existent pas** dans le `schema.prisma` actuel et doivent être ajoutés :

1. **`OrderProduct.note` (String?)** — note par produit, rendue sur le ticket (ex: "sans sésame").
2. **`Order.consumptionMode` (enum `ON_SITE` | `TAKEAWAY`)** — visible sur le ticket et dans le détail.

Ces deux migrations sont **prérequises** à la phase d'implémentation. Si le produit veut faire sans l'une des deux au MVP, adapter le rendu ticket en conséquence (n'afficher que ce qui existe).

### 10.2 Nouveau modèle `DeviceToken`

```prisma
model DeviceToken {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  restaurantId String   @map("restaurant_id") @db.Uuid
  token        String   @unique
  platform     String
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  lastSeenAt   DateTime @default(now()) @map("last_seen_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@index([restaurantId])
  @@map("device_tokens")
  @@schema("public")
}
```

### 10.3 Nouveaux endpoints

```
POST   /api/devices/register        auth: checkAuth + isRestaurantMember(restaurantId)
DELETE /api/devices/:token          auth: checkAuth
```

Le middleware `isRestaurantMember` vérifie que `req.user.id` apparaît dans la table `RestaurantMember` pour le `restaurantId` fourni dans le body. Un user qui n'est membre d'aucun resto est traité comme non autorisé (403).

Comportement de `register` : upsert par `token`, mise à jour de `userId`, `restaurantId`, `platform`, `lastSeenAt`. Idempotent.

Comportement de `DELETE /api/devices/:token` : vérifie que le `userId` de la DeviceToken correspond à `req.user.id` avant de supprimer. Retourne 404 si le token est inconnu ou appartient à un autre user.

### 10.4 Service `lib/push.js`

Wrapper `expo-server-sdk`. Expose `sendNewOrderPush(restaurantId, order)`. Appelé dans `createOrder` **après** la DB write et **après** `io.emit('order:new')`. Jamais bloquant : erreurs catchées et loggées.

Cleanup des tokens invalides (`DeviceNotRegistered`) en fire-and-forget après chaque envoi.

### 10.5 Endpoint `GET /api/orders?since=<ts>`

À vérifier/étendre au moment de l'implémentation. Objectif : polling de rattrapage à la reconnexion WS. Filtre implicite par resto via auth/role. Tri DESC sur `createdAt`. Limite 100.

### 10.6 Variable d'environnement

Ajout au `.env` backend : `EXPO_ACCESS_TOKEN` (optionnelle mais recommandée pour le monitoring des receipts).

### 10.7 Tests backend

- Intégration : `POST /api/devices/register` (création + update, auth, scope restaurant).
- Unitaire : `sendNewOrderPush` avec `expo-server-sdk` mocké (chunks 100, filtre tokens invalides, cleanup).
- Pas de changement sur les tests existants.

## 11. Authentification et rôles

- Login via Supabase Auth (mêmes comptes que le web).
- **Un seul rôle** dans le modèle (admin), porté par `RestaurantMember`. Toute personne listée comme membre d'un resto peut utiliser l'app pour ce resto.
- Un user peut être membre admin de **plusieurs restos** — il choisit lequel utiliser **au login**.
- Un device = une session = un resto. Pour changer de resto : logout + login.
- Le token Supabase est stocké en `expo-secure-store`.
- Le contexte de session (`{ userId, restaurantId }`) est **immuable** pour la durée de la session.
- Si un user perd son accès au resto pendant qu'il est loggé (retrait de `RestaurantMember`), le prochain appel API retourne 403 → on déconnecte et redirige vers le login.

## 12. Observabilité

- `@sentry/react-native` côté app, projet partagé avec le backend.
- Logs du module printer : chaque job logge `{ orderId, attemptAt, result, durationMs, error? }`.
- Event Sentry custom `printer.print_failed` avec le détail (`paperOut`, `coverOpen`, `disconnected`, `timeout`).
- Event Sentry custom `websocket.disconnected` si >5s, pour détecter les restos avec mauvaise connectivité.

## 13. Tests

### 13.1 Couverture

| Niveau | Ce qu'on teste |
|---|---|
| Unitaire (app) | `renderTicket` (snapshots 42/32 char), reducers queue, hooks critiques |
| Unitaire (backend) | `sendNewOrderPush` avec mock Expo |
| Intégration (backend) | `/api/devices/*` (création, update, scope) |
| Manuel sur device | Tout ce qui touche au matériel : pairing, impression, connexion BT, push notifs |

Pas de tests E2E automatisés au MVP.

### 13.2 Scénarios manuels obligatoires avant livraison au client pilote

1. Pairing TM-m30III sur iPad réel.
2. Commande test de bout en bout (frontend → backend → app → impression).
3. Impression d'un ticket de démo via bouton "Tester".
4. Arrêter l'imprimante au milieu d'un service (rouleau vide simulé) → bannière "Non imprimé" + réimpression après recharge.
5. Couper le WiFi pendant 30s → reconnexion WS + polling de rattrapage.
6. Mettre l'app en arrière-plan → vérifier réception push notif.
7. Verrouiller l'iPad → vérifier push notif sonore + vibration.
8. Réception de 3 commandes en 10s → vérifier que le son ne se superpose pas bizarrement et que toutes sont visibles.
9. Annulation d'une commande côté admin → vérifier refund Stripe déclenché.

## 14. Livraison par phases

### Phase 1 — Développement (estimation : 2-3 semaines plein temps)

1. Scaffold Expo + Expo Router + deps + dev build iOS/Android.
2. Migrations backend (`OrderProduct.note`, `Order.consumptionMode`, `DeviceToken`) + endpoints `/api/devices/*` + service push.
3. Auth + session + liste commandes temps réel (sans impression).
4. Module printer complet (discovery, connection, render, queue) + intégration écran liste.
5. Push notifications + son + vibration + polling de rattrapage.
6. Écrans réglages et détail + annulation.
7. QA manuelle sur TM-m30III réelle, scénarios §13.2.

### Phase 2 — Pilote

- Build EAS internal.
- Installation sur iPad du premier client, session d'accompagnement.
- Itérations rapides sur retours UX.

### Phase 3 — Public (hors MVP)

- Build EAS production.
- Soumission App Store + Play Store.
- CI/CD (GitHub Actions → EAS).

## 15. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Imprimante MFi iOS non détectée | Bloquant | `UISupportedExternalAccessoryProtocols` correct ; test TM-m30III sur iPad **dès le début** du dev |
| WS qui drop pendant un rush | Commandes loupées | Polling de rattrapage + push en parallèle |
| Son in-app ignoré par silent mode | Commandes loupées | Catégorie `playback` + vibration + push |
| Fuite mémoire sur connexion BT persistante | Crash | Heartbeat + logs ; fallback connexion à la demande si problème |
| Latence/bug wrapper `react-native-esc-pos-printer` sur Android spécifique | Dégradation | Alternative possible : module natif custom, non bloquant au MVP |
| Tokens push invalides accumulés en base | Coût cleanup | Cleanup fire-and-forget sur receipts `DeviceNotRegistered` |

## 16. Décisions explicitement écartées

- **Retry automatique en cas d'échec d'impression** — rejeté pour éviter les comportements "imprimante qui sort 50 copies d'un coup quand on remet le papier". Le staff reprend la main manuellement.
- **Persistance disque de la queue d'impression** — pas au MVP. La DB reste source de vérité et le staff voit les commandes à l'écran.
- **Switch de restaurant en cours de session** — un device = un resto, pour simplicité produit et modèle mental clair.
- **Impression 2 exemplaires** — rejeté ; 1 seul ticket regroupe tout.
- **React Navigation classique** — remplacé par Expo Router v4.
- **Bibliothèque BLE brute (`react-native-ble-plx`) + ESC/POS maison** — rejetée ; le wrapper ePOS SDK Epson est plus fiable et plus court à mettre en œuvre.

## 17. Questions ouvertes à trancher à l'implémentation

1. **`GET /api/orders?since=<ts>`** existe-t-il déjà, ou faut-il l'étendre ? À vérifier dans le code.
2. **Son custom de push** (iOS `.caf` + Android `.mp3`) fourni au MVP ou on part sur `default` puis on ajoute en Phase 1 si le timing le permet ?
3. **Tri des commandes planifiées** : en tête de liste par heure prévue, ou mélangées avec les ASAP ? Décision d'UX à valider avec le client pilote.
4. **Badge iOS** : nombre de commandes PENDING total, ou uniquement les nouvelles non vues ?

Ces points ne bloquent pas le spec mais doivent être tranchés lors de l'implémentation.
