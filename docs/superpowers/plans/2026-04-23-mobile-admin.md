# App Admin Mobile — Plan d'implémentation

> **Mode apprentissage :** Ce plan est conçu pour que tu construises l'app toi-même. Claude est là comme **professeur, conseiller et support architecture** — notamment pour tout ce qui touche à la gestion des données, des contextes, et des flux. À chaque étape, tu peux lui demander d'expliquer un concept, de valider ton approche, ou de t'aider à débloquer une situation. Ne pas hésiter à montrer son code à Claude avant de continuer.

**Goal :** Construire l'app mobile admin dans `servr/mobile/` — réception commandes, ouverture/fermeture restaurant, gestion disponibilité articles, impression tickets.

**Architecture :** Monorepo, dossier `mobile/` basé sur le `printer-app` existant. Expo Router pour la navigation, Supabase pour l'auth et le temps réel, API Express existante pour les actions métier.

**Tech Stack :** Expo 54, Expo Router, expo-dev-client, Supabase JS, react-native-esc-pos-printer, Expo Notifications

---

## Comment utiliser ce plan

- Fais une tâche à la fois, dans l'ordre
- **Lance l'app sur ton téléphone/simulateur après chaque tâche** pour vérifier que ça marche
- Si tu bloques sur un concept (contexte React, Realtime, navigation…), demande à Claude de t'expliquer **avant** d'écrire du code
- Montre ton code à Claude à la fin de chaque tâche pour un retour rapide
- Commit à la fin de chaque tâche — ça te donne des points de sauvegarde

---

## Tâche 1 — Mise en place du projet dans le monorepo

**Objectif :** Déplacer `printer-app` dans `servr/mobile/` et vérifier que tout tourne.

**Ce que tu fais :**
- Copie le contenu de `printer-app/` dans `servr/mobile/` (sauf `node_modules/`)
- Mets à jour le `name` dans `package.json` (ex. `servr-mobile`)
- Lance `npm install` dans `mobile/`
- Vérifie que l'app démarre sur ton simulateur (`expo run:ios` ou `expo run:android`)

**Concept clé :** Pourquoi `expo-dev-client` et pas Expo Go ? Demande à Claude si ce n'est pas clair.

**Validation :** L'écran de démarrage du `printer-app` s'affiche dans `servr/mobile/`.

**Commit :** `chore: migrate printer-app to servr/mobile`

---

## Tâche 2 — Nettoyage et structure de navigation

**Objectif :** Supprimer le contenu demo et poser la structure de navigation finale.

**Ce que tu fais :**
- Supprime les écrans demo (tabs, etc.) qui venaient du template Expo
- Crée la structure de dossiers dans `app/` :
  - `(auth)/` — pour les écrans non connectés
  - `(app)/` — pour les écrans connectés (orders, menu, settings)
- Crée des fichiers vides (`index.tsx` + `_layout.tsx`) dans chaque groupe pour commencer

**Concept clé — Expo Router et les groupes de routes :** Les dossiers entre parenthèses `(auth)` et `(app)` sont des "groupes" — ils organisent la navigation sans apparaître dans l'URL. Demande à Claude de t'expliquer comment fonctionnent les layouts imbriqués en Expo Router si c'est flou.

**Concept clé — Tab Navigator :** Le `_layout.tsx` dans `(app)/` sera ton tab navigator (barre d'onglets en bas). Claude peut t'expliquer la différence entre Stack et Tab navigator.

**Validation :** L'app navigue entre des écrans vides sans planter.

**Commit :** `chore: set up navigation structure`

---

## Tâche 3 — Configuration Supabase

**Objectif :** Connecter l'app mobile à Supabase (même projet que l'API).

**Ce que tu fais :**
- Installe `@supabase/supabase-js` et `expo-secure-store`
- Crée `lib/supabase.ts` — initialise le client Supabase avec les variables d'environnement
- Configure le storage Supabase pour utiliser `expo-secure-store` (stockage sécurisé du token sur mobile)
- Crée un fichier `.env` dans `mobile/` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mêmes valeurs que l'API)

**Concept clé — Pourquoi SecureStore ?** Sur mobile, on ne peut pas utiliser `localStorage` comme sur le web. `expo-secure-store` stocke le token JWT de façon chiffrée dans le keychain iOS / keystore Android. Demande à Claude si tu veux comprendre le mécanisme.

**Concept clé — Variables d'env Expo :** Le préfixe `EXPO_PUBLIC_` est obligatoire pour que les variables soient accessibles côté client dans Expo. Claude peut t'expliquer pourquoi.

**Validation :** Tu peux importer `supabase` depuis `lib/supabase.ts` sans erreur.

**Commit :** `feat: configure supabase client`

---

## Tâche 4 — Écran de connexion

**Objectif :** Permettre à un restaurateur de se connecter avec son compte Supabase.

**Ce que tu fais :**
- Crée `app/(auth)/login.tsx`
- Champs : email + mot de passe + bouton "Se connecter"
- Appelle `supabase.auth.signInWithPassword()` à la soumission
- En cas d'erreur, affiche un message
- En cas de succès, navigue vers `(app)/orders`

**Concept clé — Gestion de la session :** Supabase gère automatiquement le refresh du token. Tu n'as pas à t'en occuper manuellement. Claude peut t'expliquer le cycle de vie d'une session Supabase.

**Concept clé — Navigation après login :** Dans Expo Router, `router.replace()` vs `router.push()` — quelle différence ? Demande à Claude.

**Validation :** Tu peux te connecter avec ton compte restaurateur de test. La session persiste si tu fermes et rouvres l'app.

**Commit :** `feat: add login screen`

---

## Tâche 5 — Contexte global : session et restaurant actif

**Objectif :** Rendre la session Supabase et le restaurant actif accessibles partout dans l'app.

**Ce que tu fais :**
- Crée `contexts/auth.tsx` — un Context React qui expose : `session`, `user`, `restaurants`, `loading`
- Au montage, écoute les changements de session avec `supabase.auth.onAuthStateChange()`
- Crée `contexts/restaurant.tsx` — expose `activeRestaurant` et `setActiveRestaurant`
- Si l'utilisateur a plusieurs restaurants, affiche un écran de sélection après le login
- Dans le `_layout.tsx` racine, entoure l'app avec les deux providers

**C'est la tâche la plus importante architecturalement. Demande à Claude de valider ta structure de contexte avant de coder.**

**Concept clé — Context React :** Un Context est un "état global" accessible sans prop-drilling. Claude peut t'expliquer quand utiliser Context vs props, et les pièges courants (re-renders inutiles).

**Concept clé — `onAuthStateChange` :** Cet event Supabase se déclenche à la connexion, déconnexion, et refresh du token. C'est la source de vérité pour savoir si l'utilisateur est connecté.

**Validation :** `useAuth()` et `useRestaurant()` retournent les bonnes valeurs depuis n'importe quel écran.

**Commit :** `feat: add auth and restaurant context`

---

## Tâche 6 — Protection des routes

**Objectif :** Rediriger automatiquement vers le login si l'utilisateur n'est pas connecté.

**Ce que tu fais :**
- Dans le `_layout.tsx` de `(app)/`, vérifie la session depuis le contexte auth
- Si pas de session → `router.replace('/(auth)/login')`
- Si session mais pas de restaurant actif → écran de sélection restaurant
- Gère l'état `loading` (splash screen ou spinner pendant la vérification)

**Concept clé — Layout comme garde-barrière :** En Expo Router, le `_layout.tsx` s'exécute avant tout écran enfant — c'est l'endroit idéal pour les vérifications d'accès. Claude peut t'expliquer ce pattern.

**Validation :** Déconnecte-toi manuellement (via Supabase) → l'app te renvoie au login. Connecte-toi → tu arrives sur les commandes.

**Commit :** `feat: add route protection`

---

## Tâche 7 — Écran commandes (liste)

**Objectif :** Afficher les commandes en cours du restaurant.

**Ce que tu fais :**
- Crée `app/(app)/orders/index.tsx`
- Au montage, récupère les commandes via `GET /orders?restaurantId=…&status=pending,accepted,ready` (API Express)
- Affiche la liste : numéro de commande, heure, statut, nombre d'articles
- Crée `hooks/useOrders.ts` qui encapsule la logique de fetch

**Concept clé — Hooks personnalisés :** Un hook comme `useOrders()` sépare la logique de l'affichage. Claude peut t'expliquer quand extraire un hook vs garder la logique dans le composant.

**Concept clé — `useEffect` et cleanup :** Le fetch au montage se fait dans un `useEffect`. Claude peut t'expliquer les bonnes pratiques (dépendances, cleanup, race conditions).

**Validation :** La liste des commandes s'affiche correctement avec des données de test.

**Commit :** `feat: orders list screen`

---

## Tâche 8 — Temps réel sur les commandes

**Objectif :** Les nouvelles commandes apparaissent instantanément sans recharger.

**Ce que tu fais :**
- Dans `hooks/useOrders.ts`, ajoute une subscription Supabase Realtime sur la table `orders`
- Filtre par `restaurant_id` = restaurant actif
- À chaque événement `INSERT` → ajoute la commande à la liste
- À chaque événement `UPDATE` → met à jour le statut dans la liste
- Cleanup la subscription quand le composant se démonte

**C'est un moment clé — demande à Claude d'expliquer Supabase Realtime avant de coder.**

**Concept clé — Supabase Realtime :** Fonctionne via WebSocket. Tu t'abonnes à des changements sur une table, filtrés par colonne. Claude peut te montrer la structure d'une subscription et t'expliquer les événements (`INSERT`, `UPDATE`, `DELETE`).

**Concept clé — Immutabilité du state React :** Quand tu mets à jour la liste des commandes, tu ne la modifies pas directement — tu crées un nouveau tableau. Claude peut t'expliquer pourquoi.

**Validation :** Crée une commande test depuis le frontend web → elle apparaît dans l'app mobile sans recharger.

**Commit :** `feat: realtime order updates`

---

## Tâche 9 — Écran détail commande + actions

**Objectif :** Voir le détail d'une commande et changer son statut.

**Ce que tu fais :**
- Crée `app/(app)/orders/[id].tsx`
- Affiche : articles commandés (quantité, nom, options), total, heure, infos client
- Boutons d'action selon le statut actuel :
  - `pending` → "Accepter" / "Refuser"
  - `accepted` → "Prêt"
  - `ready` → "Terminé"
- Chaque action appelle `PATCH /orders/:id/status` via l'API

**Concept clé — Routes dynamiques Expo Router :** Le `[id]` dans le nom de fichier est un paramètre de route. Tu y accèdes avec `useLocalSearchParams()`. Claude peut t'expliquer.

**Validation :** Tu peux accepter une commande depuis l'app et voir le statut changer sur le frontend web.

**Commit :** `feat: order detail and status actions`

---

## Tâche 10 — Écran disponibilité articles

**Objectif :** Activer/désactiver rapidement un article du menu.

**Ce que tu fais :**
- Crée `app/(app)/menu/index.tsx`
- Récupère les articles via `GET /menu-items?restaurantId=…`
- Affiche la liste avec un toggle Switch (composant React Native natif) par article
- À chaque toggle → `PATCH /menu-items/:id` avec `{ available: boolean }`
- Feedback optimiste : le toggle change immédiatement, rollback en cas d'erreur

**Concept clé — Mise à jour optimiste :** Tu mets à jour l'UI avant la confirmation du serveur pour que ce soit fluide. Si le serveur échoue, tu annules. Claude peut t'expliquer ce pattern et quand l'utiliser.

**Validation :** Désactiver un article dans l'app le rend indisponible sur le frontend web.

**Commit :** `feat: menu availability screen`

---

## Tâche 11 — Écran paramètres : ouverture/fermeture restaurant

**Objectif :** Permettre au restaurateur d'ouvrir ou fermer son restaurant.

**Ce que tu fais :**
- Crée `app/(app)/settings/index.tsx`
- Affiche le statut actuel (ouvert / fermé) et un toggle Switch
- À chaque toggle → `PATCH /restaurants/:id` avec `{ isOpen: boolean }`
- Bouton de déconnexion → `supabase.auth.signOut()`

**Validation :** Fermer le restaurant depuis l'app le rend indisponible à la commande sur le frontend web.

**Commit :** `feat: settings screen - restaurant open/close`

---

## Tâche 12 — Intégration imprimante

**Objectif :** Migrer le `usePrinter` de `printer-app` et l'intégrer à l'app.

**Ce que tu fais :**
- Copie `hooks/usePrinter.ts` depuis `printer-app` vers `mobile/hooks/`
- Dans les paramètres, ajoute une section "Imprimante" : bouton scan, liste des imprimantes trouvées, bouton de connexion
- Persiste l'imprimante sélectionnée avec `@react-native-async-storage/async-storage` (se reconnecte automatiquement au démarrage)
- Ajoute une fonction `printOrder(order)` au hook pour imprimer un ticket de commande
- Ajoute un toggle "Impression automatique" dans les paramètres

**Concept clé — AsyncStorage :** Équivalent de `localStorage` sur mobile, mais asynchrone. Claude peut t'expliquer comment persister et relire des données simples.

**Validation :** L'imprimante est retrouvée au redémarrage. Un ticket de commande s'imprime correctement.

**Commit :** `feat: printer integration`

---

## Tâche 13 — Impression automatique à la nouvelle commande

**Objectif :** Imprimer automatiquement chaque nouvelle commande si le toggle est activé.

**Ce que tu fais :**
- Dans `hooks/useOrders.ts`, quand un événement Realtime `INSERT` arrive, vérifie si l'impression automatique est activée
- Si oui → appelle `printOrder(order)` depuis `usePrinter`
- Gère l'erreur d'impression silencieusement (log + toast, mais ne bloque pas le flux)

**Concept clé — Communication entre hooks :** Tu vas avoir besoin d'accéder à `usePrinter` depuis `useOrders`. Claude peut t'expliquer comment structurer ça proprement (contexte partagé vs composition).

**Validation :** Une nouvelle commande déclenche l'impression automatiquement.

**Commit :** `feat: auto-print on new order`

---

## Tâche 14 — Notifications push

**Objectif :** Recevoir une notification même quand l'app est en arrière-plan.

**Ce que tu fais :**
- Installe et configure `expo-notifications`
- Au login, demande la permission de notifications et récupère le token push Expo
- Envoie ce token à l'API pour le stocker en base (`PATCH /users/push-token`)
- Côté API : quand une nouvelle commande est créée (`POST /orders`), envoie une notification via l'API Expo Push

**C'est la tâche la plus complexe — demande à Claude de t'expliquer le flux complet avant de commencer.**

**Concept clé — Flux push :** Téléphone → Expo Push Service → Apple/Google → Téléphone. Tu n'envoies pas la notif directement au téléphone, tu passes par Expo. Claude peut dessiner ce flux pour toi.

**Concept clé — Foreground vs Background :** En foreground, Realtime suffit. En background, seules les notifications push passent. Les deux mécanismes coexistent.

**Validation :** Mets l'app en arrière-plan, crée une commande → une notification s'affiche.

**Commit :** `feat: push notifications for new orders`

---

## Tâche 15 — Polish et cas d'erreur

**Objectif :** Rendre l'app robuste pour une utilisation quotidienne.

**Ce que tu fais :**
- Ajoute un indicateur de connexion Realtime (point vert/rouge dans le header)
- Gère la perte réseau : message informatif, retry automatique
- Ajoute des états de chargement (skeletons ou spinners) sur chaque écran
- Teste le scénario : token expiré → l'app redirige vers le login sans planter

**Validation :** Coupe le WiFi pendant 30 secondes puis reconnecte → l'app se rétablit seule.

**Commit :** `feat: error handling and connection indicators`

---

## À chaque étape — Comment travailler avec Claude

| Quand | Quoi demander |
|-------|---------------|
| Avant de coder | "Explique-moi le concept X avant que je commence" |
| Pendant | "Voilà mon code, est-ce que l'architecture est bonne ?" |
| Après | "Voilà ce que j'ai fait, qu'est-ce que tu changerais ?" |
| Si bloqué | "Je suis bloqué sur X, voilà ce que j'ai essayé" |

Claude ne te donnera pas le code directement (sauf si tu le demandes explicitement) — il t'expliquera le concept, te montrera la direction, et validera ton approche.
