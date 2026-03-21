# Blindage Production — Servr

**Date :** 2026-03-21
**Objectif :** Rendre la plateforme fiable et résiliente avant le lancement SaaS auprès de restaurateurs locaux.
**Contexte :** La plateforme est fonctionnellement complète (commande, paiement Stripe Connect, dashboard admin, notifications email, gestion d'équipe). Les tests unitaires mockés couvrent déjà les controllers, middleware, validators et utilitaires. Ce qui manque : les cas limites, la résilience aux pannes, le monitoring, et la robustesse frontend.

---

## Section 1 : Tests des cas limites critiques

**Stack :** Vitest + mocks existants (pas de changement d'infra).

### 1.1 Idempotence webhook Stripe
- Simuler la réception du même événement `checkout.session.completed` deux fois.
- Vérifier : la commande ne passe en PENDING qu'une seule fois, un seul email est envoyé.

### 1.2 Produit indisponible au checkout
- Créer une commande avec un produit dont `isAvailable` est passé à `false` entre-temps.
- Vérifier : l'API retourne une erreur 400 avec le nom du produit indisponible.

### 1.3 Restaurant fermé
- Tester une commande envoyée hors horaires réguliers : refusée.
- Tester une commande envoyée pendant un horaire exceptionnel fermé : refusée.
- Tester une commande envoyée pendant un horaire exceptionnel ouvert (horaires modifiés) : acceptée si dans le créneau.

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

---

## Section 2 : Gestion des erreurs et résilience backend

### 2.1 Stripe down / timeout
- Wrapper les appels Stripe dans un try/catch dédié.
- Retourner un 503 avec message "Service de paiement temporairement indisponible" au lieu d'un 500 générique.
- Logger l'erreur Stripe complète (code, message, request ID).

### 2.2 Echec d'envoi d'email
- Confirmer que l'envoi d'email est fire-and-forget : l'échec ne doit jamais bloquer la réponse HTTP.
- Auditer chaque appel à `sendEmail` pour s'assurer qu'il est dans un try/catch qui logge mais ne throw pas.

### 2.3 Webhook Stripe idempotent
- Avant de modifier une commande DRAFT -> PENDING, vérifier le statut actuel.
- Si la commande est déjà PENDING ou au-delà, retourner 200 sans action (log info).
- Empêcher les effets de bord en double (email, socket broadcast).

### 2.4 Race conditions sur les statuts
- Lors d'un `updateOrderStatus`, vérifier le statut actuel dans la même transaction Prisma (WHERE clause sur le statut attendu).
- Si le statut a changé entre-temps, retourner 409 Conflict avec le statut actuel.

### 2.5 Validation metadata webhook
- Vérifier que `session.metadata.orderId` correspond à une commande existante.
- Si la commande n'existe pas, logger un warning et retourner 200 (ne pas retenter).

---

## Section 3 : Monitoring et health checks

### 3.1 Route GET /health (publique)
- Vérifier la connexion Postgres via `prisma.$queryRaw('SELECT 1')`.
- Vérifier la connexion Supabase Auth via un appel simple.
- Retourner 200 `{ status: "ok", db: "ok", auth: "ok" }` ou 503 avec le détail de ce qui échoue.
- Temps de réponse cible : < 500ms.

### 3.2 Route GET /health/stripe (protégée, OWNER)
- Vérifier que l'API Stripe répond via `stripe.accounts.list({ limit: 1 })`.
- Retourner 200 ou 503.

### 3.3 Logs structurés avec contexte
- Auditer les logs existants (Pino) pour s'assurer que chaque erreur contient :
  - `restaurantId` (si applicable)
  - `orderId` (si applicable)
  - `userId` (si applicable)
  - Code d'erreur et message
- Ajouter le contexte manquant là où nécessaire.

### 3.4 Métriques de temps de réponse
- Ajouter un middleware Pino qui logge le temps de réponse de chaque requête.
- Focus sur les routes critiques : `/checkout`, `/orders`, `/webhook`.

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
- Avant d'envoyer au checkout, appeler l'API pour vérifier :
  - Disponibilité des produits du panier
  - Restaurant ouvert
- Afficher les produits indisponibles et proposer de les retirer du panier.

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
- Stack de monitoring externe (Datadog, Sentry)
- Nouvelles fonctionnalités (stats avancées, multi-restaurant, personnalisation)
- Notifications SMS / push
- Onboarding self-service guidé

---

## Ordre d'implémentation suggéré

1. Section 2 (résilience backend) — corriger les failles avant de les tester
2. Section 1 (tests) — valider les corrections + couvrir les cas limites
3. Section 3 (monitoring) — pouvoir observer en prod
4. Section 4 (frontend) — polish final avant lancement
