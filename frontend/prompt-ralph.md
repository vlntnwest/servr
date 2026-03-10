# Objectif : Finalisation Administrative, UX Homepage et Intégration Paiement Stripe

Agis en tant qu'expert Full-Stack. Tu dois traiter cette liste de tâches critiques pour finaliser l'application. Référe-toi à `api-v2.md` pour les structures de données des commandes et à la "v1" pour la logique métier de l'horaire.

## 1. Administration & Gestion (Back-end & UI)

- **Dashboard Commandes** : Crée un onglet "Commandes" dans la zone admin. Affiche la liste des commandes en temps réel avec leurs statuts (En cours, Terminée, Annulée).
- **Gestion d'Équipe** : Ajoute un bouton "Ajouter un membre" dans la partie admin pour permettre la création de nouveaux comptes administrateurs/modérateurs.

## 2. Refonte UX Homepage (CSS/UI)

<frontend_aesthetics>

- **Product Cards** : Modifie le bouton "+" des cartes produits sur la homepage pour qu'il occupe **toute la hauteur** de la carte (sur le côté ou en superposition selon le design actuel).
- Assure-toi que l'interaction reste fluide et que le clic est précis. Évite les styles génériques "AI slop", privilégie une intégration léchée.
  </frontend_aesthetics>

## 3. Logique de Commande & Planification

- **Système d'Heure de Commande** : Implémente le sélecteur d'heure pour permettre aux clients de commander en avance (Pre-order).
- **Logique** : Reprends les règles de gestion de la "v1" (créneaux disponibles, délais de préparation). Vérifie dans `api-v2.md` comment stocker `scheduled_at` ou l'équivalent.

## 4. Paiement & Sécurité (Stripe)

- **Intégration Stripe** : Branche le tunnel d'achat sur Stripe.
- **Configuration .env** : Utilise les variables d'environnement de `.env.local`. Tu y trouveras toutes les clés nécessaires (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.).
- **Flux** : Création de la Session de Paiement -> Webhook (si nécessaire) -> Confirmation de commande en base.

## 5. Instructions d'Exécution & Fiabilité

<investigate_before_answering>

1. Lis `.env.local` pour valider la présence des clés Stripe avant d'implémenter le SDK.
2. Examine le code de la "v1" pour extraire la logique exacte des créneaux horaires avant de recréer le système.
3. Vérifie les schémas de table "Orders" et "Users" dans `api-v2.md`.
   </investigate_before_answering>

<use_parallel_tool_calls>
Optimise ton temps : lis les fichiers de la homepage (CSS/TSX), les fichiers de l'admin et le dossier API en parallèle pour accélérer l'implémentation.
</use_parallel_tool_calls>

## 6. Suivi d'État

Mets à jour `progress.txt` après chaque module (Admin, CSS, Stripe, Heures). Si tu manques de tokens, enregistre l'état du checkout Stripe avant de rafraîchir le contexte.

Réalise l'ensemble des modifications maintenant.
