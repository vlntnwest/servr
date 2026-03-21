# Blindage Production — Servr

**Date :** 2026-03-21
**Objectif :** Rendre la plateforme fiable et résiliente avant le lancement SaaS auprès de restaurateurs locaux.
**Contexte :** La plateforme est fonctionnellement complète (commande, paiement Stripe Connect, dashboard admin, notifications email, gestion d'équipe). Les tests unitaires mockés couvrent déjà les controllers, middleware, validators et utilitaires. Ce qui manque : les cas limites, la résilience aux pannes, le monitoring, et la robustesse frontend. Sentry est déjà partiellement intégré (`@sentry/node` dans `lib/sentry.js`, `captureException` dans le middleware d'erreur).

---

## Section 1 : Tests des cas limites critiques

**Stack :** Vitest + mocks existants (pas de changement d'infra).

### 1.1 Idempotence webhook Stripe
- Simuler la réception du même événement `checkout.session.completed` deux fois.
- Vérifier : la commande ne passe en PENDING qu'une seule fois, un seul email est envoyé.
- **Bug existant à corriger d'abord (Section 2.3) :** Le guard actuel dans `checkout.controllers.js` (ligne ~226) skip quand le statut est PENDING ou CANCELLED, mais **procède** pour IN_PROGRESS, COMPLETED, DELIVERED — un webhook rejoué pourrait régresser une commande complétée. Le test doit vérifier que seul le statut DRAFT permet la transition.

### 1.2 Produit indisponible au checkout
- Créer une commande avec un produit dont `isAvailable` est passé à `false` entre-temps.
- Vérifier : l'API retourne une erreur 400 avec le nom du produit indisponible.

### 1.3 Restaurant fermé
- Tester une commande envoyée hors horaires réguliers : refusée.
- Tester une commande envoyée pendant un horaire exceptionnel fermé : refusée.
- Tester une commande envoyée pendant un horaire exceptionnel ouvert (horaires modifiés) : acceptée si dans le créneau.
- Tester le cas "aucun horaire configuré" : actuellement traité comme "toujours ouvert" — ajouter un test explicite pour documenter ce comportement.

### 1.4 Codes promo edge cases
- Code expiré : refusé avec message "Code expiré".
- Limite d'usage atteinte (`currentUses >= maxUses`) : refusé.
- Montant minimum non atteint : refusé avec le montant minimum affiché.
- Code valide : réduction correctement calculée (pourcentage et fixe).

### 1.5 Transitions de statut invalides
- Tester chaque transition illégale de la state machine :
  - DELIVERED -> IN_PROGRESS : refusé
  - CANCELLED -> PENDING : refusé
  - PENDING -> DELIVERED : refusé (doit passer par IN_PROGRESS puis COMPLETED)
- Vérifier que le message d'erreur indique les transitions autorisées.
- **Dépendance :** Le fix race condition (Section 2.4) doit être implémenté d'abord. Les tests doivent vérifier que le guard atomique fonctionne (ex : `updateMany` retourne count 0 quand le statut a déjà changé).

---

## Section 2 : Gestion des erreurs et résilience backend

### 2.1 Stripe down / timeout — avec distinction des types d'erreur
- Wrapper les appels Stripe dans un try/catch dédié.
- **Distinguer trois cas :**
  - **Erreur réseau / timeout Stripe** → 503 "Service de paiement temporairement indisponible"
  - **Erreur compte Connect** (compte non onboardé, charges non activées, `StripePermissionError`) → 400 avec message spécifique "Le compte de paiement du restaurant n'est pas configuré"
  - **Erreur de paramètres** (`StripeInvalidRequestError` non liée au compte) → 500, logger comme bug
- Logger l'erreur Stripe complète (code, message, request ID).

### 2.2 Echec d'envoi d'email
- Confirmer que l'envoi d'email est fire-and-forget : l'échec ne doit jamais bloquer la réponse HTTP.
- Auditer chaque appel à `sendEmail` / `sendOrderConfirmation` pour s'assurer qu'il est dans un try/catch qui logge mais ne throw pas.
- **Bug identifié :** `sendOrderConfirmation` est appelé hors try/catch dans le chemin paiement sur place (`checkout.controllers.js` ~ligne 110) et dans `order.controllers.js` ~ligne 152. Un throw synchrone crasherait la requête. À wrapper.

### 2.3 Webhook Stripe idempotent
- **Fix du bug existant :** Modifier le guard pour ne permettre la transition que si `existing.status === "DRAFT"`. Tout autre statut = webhook déjà traité ou commande avancée → retourner 200 sans action (log info).
- Empêcher les effets de bord en double (email, socket broadcast).

### 2.4 Race conditions sur les statuts
- **Stratégie d'implémentation :** Utiliser `prisma.$transaction` avec un `findUnique` suivi d'un `update` avec une clause WHERE sur le statut attendu. Concrètement, deux options :
  - **Option A (recommandée) :** `prisma.$queryRaw` avec `UPDATE orders SET status = $1 WHERE id = $2 AND status = $3 RETURNING *` — atomique, retourne le record mis à jour pour le broadcast Socket.IO.
  - **Option B :** `prisma.$transaction` avec `findUnique` + vérification du statut + `update` en isolation sérialisable.
- Si le statut a changé entre-temps (0 rows updated), retourner 409 Conflict avec le statut actuel.

### 2.5 Validation metadata webhook
- Vérifier que `session.metadata.orderId` correspond à une commande existante.
- Si la commande n'existe pas, logger un warning et retourner 200 (ne pas retenter).

### 2.6 Nettoyage des commandes DRAFT orphelines
- Les commandes DRAFT créées lors du checkout mais jamais finalisées (paiement abandonné, webhook `checkout.session.expired` manqué) s'accumulent en base.
- Ajouter une tâche de nettoyage : supprimer les commandes DRAFT de plus de 24h.
- Implémentation : endpoint admin `DELETE /api/admin/cleanup/draft-orders` ou cron job simple.

### 2.7 Limite de taille body webhook
- Ajouter une limite de taille sur la route webhook : `express.raw({ type: "application/json", limit: "1mb" })`.

---

## Section 3 : Monitoring et health checks

### 3.1 Route GET /health (modifier l'existante)
- **Note :** La route `/health` existe déjà dans `app.js` (~ligne 96) et retourne un `{ status: "ok" }` statique. La modifier pour ajouter les vérifications.
- Vérifier la connexion Postgres via `prisma.$queryRaw('SELECT 1')`.
- Vérifier la connexion Supabase Auth via un appel simple.
- Retourner 200 `{ status: "ok", db: "ok", auth: "ok" }` ou 503 avec le détail de ce qui échoue.
- Temps de réponse cible : < 500ms.

### 3.2 Route GET /health/stripe (protégée, OWNER)
- Vérifier que l'API Stripe répond via `stripe.balance.retrieve()` (plus conventionnel que `accounts.list`).
- **Note :** Vérifie uniquement la clé plateforme, pas les comptes Connect individuels.
- Retourner 200 ou 503.

### 3.3 Sentry — consolider l'intégration existante
- Sentry est déjà partiellement intégré. Vérifier que :
  - Les routes critiques (checkout, webhook, order status) remontent bien les erreurs.
  - Le `release` et `environment` sont configurés pour distinguer staging/prod.
  - Les erreurs attendues (validation, 404) ne sont pas remontées.

### 3.4 Logs structurés avec contexte
- Auditer les logs existants (Pino) pour s'assurer que chaque erreur contient :
  - `restaurantId` (si applicable)
  - `orderId` (si applicable)
  - `userId` (si applicable)
  - Code d'erreur et message
- Ajouter le contexte manquant là où nécessaire.

### 3.5 Métriques de temps de réponse
- Utiliser `pino-http` (middleware Pino intégré) plutôt qu'un middleware custom — logge automatiquement method, URL, status code et temps de réponse.
- Focus sur les routes critiques : `/checkout`, `/orders`, `/webhook`.

### 3.6 Graceful shutdown
- Gérer SIGTERM proprement : fermer le serveur HTTP, déconnecter les sockets Socket.IO, drainer les requêtes en cours.
- Nécessaire pour des déploiements sans downtime.

---

## Section 4 : Robustesse frontend

### 4.1 Etats de chargement et anti double-clic
- Auditer les boutons d'action critiques : "Commander", "Payer", "Rembourser", "Changer le statut".
- S'assurer que chaque bouton est `disabled` pendant l'appel API.
- Ajouter un loading state visuel (spinner ou texte "En cours...").

### 4.2 Messages d'erreur clairs
- Remplacer les toasts génériques par des messages spécifiques :
  - "Ce produit n'est plus disponible"
  - "Le restaurant est fermé"
  - "Code promo invalide : [raison]"
  - "Service de paiement indisponible, réessayez dans quelques minutes"
- Mapper les codes d'erreur API vers des messages utilisateur en français.

### 4.3 Re-vérification panier avant checkout
- Utiliser le endpoint `createCheckoutSession` existant et parser ses réponses d'erreur côté frontend (pas de nouveau endpoint).
- Si erreur 400 (produit indisponible, restaurant fermé), afficher le message et proposer de mettre à jour le panier.

### 4.4 Gestion session expirée
- Intercepter les réponses 401 côté frontend.
- Tenter un refresh token Supabase.
- Si échec, rediriger vers `/login` avec un message "Session expirée, veuillez vous reconnecter".

### 4.5 Reconnexion WebSocket
- Configurer Socket.IO client avec reconnexion automatique (déjà activé par défaut, vérifier la config).
- Au reconnect, recharger les commandes en cours pour rattraper les événements manqués.
- Afficher un indicateur visuel quand la connexion est perdue ("Connexion perdue, reconnexion...").

---

## Hors scope

- Tests E2E (Playwright/Cypress)
- Tests composants React
- Stack de monitoring externe supplémentaire (Datadog) — Sentry est déjà intégré et sera consolidé
- Nouvelles fonctionnalités (stats avancées, multi-restaurant, personnalisation)
- Notifications SMS / push
- Onboarding self-service guidé
- Tuning connection pool Prisma/PgBouncer (à revoir sous charge)

---

## Ordre d'implémentation suggéré

1. Section 2 (résilience backend) — corriger les bugs et failles avant de les tester
2. Section 1 (tests) — valider les corrections + couvrir les cas limites
3. Section 3 (monitoring) — pouvoir observer en prod
4. Section 4 (frontend) — polish final avant lancement
