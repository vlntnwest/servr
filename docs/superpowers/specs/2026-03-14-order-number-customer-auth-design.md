# Design — Numéro de commande & Inscription client

**Date :** 2026-03-14
**Statut :** Approuvé

---

## Contexte

Servr est une plateforme de commande en ligne pour restaurants. Deux fonctionnalités manquantes prioritaires ont été identifiées :
1. Les commandes n'ont pas de numéro lisible humainement
2. Les clients n'ont pas de compte (historique, profil, pré-remplissage)

Le guest checkout reste disponible dans les deux cas.

---

## 1. Numéro de commande

### Objectif

Chaque commande doit avoir un identifiant court, lisible, et unique — affiché sur la confirmation client et visible du staff restaurant.

### Décision

**Format :** 6 caractères alphanumériques — lettres majuscules + chiffres, sans caractères ambigus (O, 0, I, 1).
**Exemple :** `A4X9K2`
**Portée :** Globale (unique sur toute la plateforme, pas par restaurant).
**Génération :** Aléatoire côté applicatif, avec retry en cas de collision (max 5 tentatives, erreur propre au-delà).

### Changements DB

```prisma
model Order {
  // champ ajouté
  orderNumber String @unique
  // ... champs existants
}
```

### Changements API

- Fonction utilitaire `generateOrderNumber()` : génère un code 6 chars, vérifie l'unicité en DB, retry jusqu'à 5 fois.
- Appelée dans la transaction Prisma à la création de commande (webhook Stripe + on-site payment).
- `orderNumber` inclus dans la réponse de création et passé en `metadata` Stripe.

### Affichage frontend

- Page confirmation commande : affiche `Commande #A4X9K2`
- Reçu Stripe : `orderNumber` passé en metadata, visible dans le reçu auto-envoyé par Stripe

---

## 2. Inscription & authentification client

### Objectif

Les clients peuvent créer un compte pour accéder à leur historique de commandes, pré-remplir leurs infos, et suivre leurs commandes. Le guest checkout reste disponible.

### Architecture

**Auth :** Supabase Auth existant — même système que le staff.
**Distinction client/staff :** Un user sans `RestaurantMember` est traité comme client. Un staff peut commander en tant que client avec le même compte.
**Pas de champ `role`** — la présence d'un `RestaurantMember` suffit.

### Changements DB

```prisma
model User {
  // champs ajoutés
  address  String?
  city     String?
  zipCode  String?
  // ... champs existants (fullName, phone déjà présents)
}
```

### Méthodes d'inscription

- Email + mot de passe
- Google OAuth
- Apple OAuth

Les providers OAuth sont activés dans le dashboard Supabase (aucun changement de code backend requis).

### Pages frontend (nouvelles)

| Route | Description |
|-------|-------------|
| `/register` | Inscription client (email/password ou social) |
| `/account` | Profil client — modifier nom, téléphone, adresse |
| `/account/orders` | Historique des commandes du client connecté |

### Redirect post-login

| Contexte | Redirect |
|----------|---------|
| Login client (`/login`) | `/` ou page d'origine (paramètre `redirect`) |
| Login staff (page dédiée) | `/admin` |
| Staff passant par `/login` client | Traité comme client → `/` |

### API — nouveaux endpoints

- `GET /api/user/me/orders` — liste les commandes de l'utilisateur connecté
- `PUT /api/user/me` — déjà existant, étendu avec `address`, `city`, `zipCode`

### Guest checkout

Inchangé. Le champ `email` sur `Order` continue de servir d'identifiant pour les guests. Aucune authentification requise pour commander.

---

## Ordre d'implémentation suggéré

1. **Numéro de commande** — changement DB + logique API + affichage frontend
2. **Inscription client** — Supabase OAuth config + pages register/account + redirect post-login + endpoint orders

---

## Hors scope (à traiter séparément)

- Inscription restaurant (onboarding Stripe Connect inclus)
- Checkout branché (Direct Charges Stripe)
- Design shadcn
- Landing page
- App mobile
