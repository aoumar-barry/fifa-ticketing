# Module 2 — Planification du projet

## 1. Backlog produit

> Priorisation selon la méthode MoSCoW. Estimation en story points (suite de Fibonacci : 1, 2, 3, 5, 8, 13).

### Must Have

| ID | User Story | Points |
|---|---|---|
| US-01 | En tant que Supporter, je veux créer un compte et me connecter via email/mot de passe ou via mon compte Google afin de protéger l'accès à mes données personnelles et sécuriser mes transactions futures. | 8 |
| US-02 | En tant que Supporter, je veux consulter le catalogue des matchs de la Coupe du Monde ainsi que la disponibilité globale des places par catégorie afin d'identifier les rencontres disponibles et planifier mes achats de billets. | 5 |
| US-03 | En tant que Supporter, je veux réserver un billet et le bloquer au sein d'un panier temporaire d'une durée stricte de 10 minutes via un verrou distribué afin de garantir l'exclusivité de mon siège le temps de procéder au paiement, sans risque de surréservation. | 13 |
| US-04 | En tant que Supporter, je veux procéder au paiement en ligne sécurisé de mon panier via Stripe afin de valider définitivement ma réservation et acter l'achat de mes places. | 8 |
| US-05 | En tant que Supporter, je veux générer et télécharger mon billet numérique officiel comportant un QR Code unique afin de présenter un titre d'accès valide et infalsifiable lors des contrôles physiques aux portes du stade. | 8 |
| US-06 | En tant que Supporter, je veux accéder à un espace personnel répertoriant l'historique complet de mes commandes passées afin de suivre mes achats, consulter mes factures et retrouver mes billets à tout moment. | 3 |
| US-07 | En tant qu'Administrateur, je veux disposer d'une interface de gestion pour créer et modifier les matchs et ajuster les stocks de billets afin de maintenir à jour les données du catalogue et piloter l'offre de billets en temps réel. | 8 |

### Should Have

| ID | User Story | Points |
|---|---|---|
| US-08 | En tant que Supporter, je veux filtrer la liste des matchs selon des critères précis tels que la date, l'équipe ou le lieu afin de trouver rapidement et efficacement les rencontres spécifiques qui m'intéressent. | 3 |
| US-09 | En tant que Supporter, je veux recevoir un e-mail de confirmation automatique immédiatement après la validation du paiement afin de disposer d'un reçu écrit confirmant le succès de ma transaction. | 3 |
| US-10 | En tant que Supporter, je veux annuler explicitement ma réservation en cours au sein de mon panier avant la fin du compte à rebours afin de libérer instantanément les sièges bloqués pour les remettre à disposition des autres supporters. | 3 |
| US-11 | En tant que Supporter, je veux modifier mes données personnelles de profil afin de garantir l'exactitude des informations associées à mon compte utilisateur. | 2 |
| US-12 | En tant qu'Administrateur, je veux consulter un tableau de bord analytique présentant les statistiques de vente globales et par match afin d'analyser l'état de remplissage des stades et suivre l'évolution des revenus. | 5 |
| US-20 | En tant que Supporter, je veux annuler une commande confirmée dans les 24 heures suivant l'achat afin d'obtenir un remboursement en cas d'erreur ou d'empêchement imprévu. | 5 |

### Could Have

| ID | User Story | Points |
|---|---|---|
| US-13 | En tant que Supporter, je veux sélectionner précisément mon siège de manière visuelle sur un plan de stade interactif en 2D afin de connaître l'emplacement exact et la catégorie de ma place avant de l'ajouter au panier. | 13 |
| US-14 | En tant que Supporter, je veux ajouter simultanément plusieurs billets pour des matchs distincts au sein d'un unique panier d'achat afin d'effectuer une seule transaction financière globale. | 8 |
| US-16 | En tant qu'Administrateur, je veux exporter l'intégralité des données de vente sous un format CSV afin de réaliser des audits comptables et traiter les données sur des outils tiers. | 3 |
| US-17 | En tant que Supporter / Admin, je veux recevoir des notifications par email en cas de modification d'horaire d'un match afin d'être immédiatement informé des changements logistiques. | 5 |

### Won't Have

| ID | User Story | Raison d'exclusion |
|---|---|---|
| US-18 | En tant que Supporter, je veux revendre mon billet acheté à un autre particulier en mode P2P. | Hors périmètre — complexité juridique et technique disproportionnée |
| US-19 | En tant que Supporter, je veux utiliser un espace de discussion en direct avec d'autres acheteurs. | Hors périmètre — sans valeur pour le cœur métier billetterie |
| US-20-old | En tant que Supporter, je veux réserver des hébergements ou des vols depuis la plateforme. | Hors périmètre — intégration tierce non justifiée |

---

## 2. Plan de release — 3 sprints de 2 semaines

### Critères de priorisation
Les user stories sont organisées selon trois critères :
1. **Dépendances techniques** : les fondations avant les fonctionnalités
2. **Priorité MoSCoW** : Must Have avant Should Have avant Could Have
3. **Valeur métier** : les fonctionnalités critiques livrées le plus tôt possible

---

### Sprint 1 — Fondations (Semaines 1-2)
**Objectif :** Mettre en place l'infrastructure, l'authentification et le catalogue

| US | Intitulé | Points | Priorité |
|---|---|---|---|
| US-01 | Inscription / Connexion (local + Google OAuth) | 8 | Must Have |
| US-02 | Consultation catalogue matchs | 5 | Must Have |
| - | Setup infrastructure + déploiement Render | 5 | Infrastructure |
| - | Modèles Mongoose + Seed FIFA 2026 | 3 | Infrastructure |
| **Total** | | **21** | |

**Justification :** L'authentification est le prérequis de toutes les fonctionnalités. Le catalogue permet de valider l'intégration frontend/backend dès le premier sprint. Le déploiement Render est mis en place dès le sprint 1 pour éviter les blocages techniques de dernière minute.

---

### Sprint 2 — Cœur métier (Semaines 3-4)
**Objectif :** Réservation, paiement, génération de billets et historique

| US | Intitulé | Points | Priorité |
|---|---|---|---|
| US-03 | Réservation + verrou siège 10 min | 13 | Must Have |
| US-04 | Paiement Stripe | 8 | Must Have |
| US-05 | Billet numérique + QR code PDF | 8 | Must Have |
| US-06 | Historique des commandes | 3 | Must Have |
| **Total** | | **32** | |

**Justification :** Ce sprint constitue le cœur métier de la plateforme. Les quatre US sont fortement couplées et doivent être livrées ensemble pour former un flux complet de bout en bout.

---

### Sprint 3 — Finalisation (Semaines 5-6)
**Objectif :** Administration, fonctionnalités complémentaires, tests et déploiement

| US | Intitulé | Points | Priorité |
|---|---|---|---|
| US-07 | Interface admin gestion matchs | 8 | Must Have |
| US-08 | Filtres catalogue avancés | 3 | Should Have |
| US-09 | Email confirmation paiement | 3 | Should Have |
| US-10 | Annulation panier | 3 | Should Have |
| US-11 | Modification profil utilisateur | 2 | Should Have |
| US-12 | Dashboard statistiques admin | 5 | Should Have |
| US-16 | Export CSV données ventes | 3 | Could Have |
| US-17 | Notifications modification match | 5 | Could Have |
| US-13 | Plan de stade SVG interactif | 13 | Could Have |
| US-20 | Annulation commande confirmée | 5 | Should Have |
| - | Tests Jest couverture > 70% | 5 | Module 5 |
| - | Pipeline Render auto-deploy complet | 3 | Module 6 |
| - | Monitoring Render Dashboard | 3 | Module 6 |
| - | Dependabot + README | 2 | Module 7 |
| **Total** | | **63** | |

**Justification :** Le sprint 3 finalise les Must Have restants (US-07), intègre les Should Have et Could Have selon la vélocité disponible, et couvre les exigences des modules ALM (tests, déploiement, monitoring).

---

## 3. Vélocité estimée

| Sprint | Points livrés | Vélocité |
|---|---|---|
| Sprint 1 | 21 | 21 pts |
| Sprint 2 | 32 | 32 pts |
| Sprint 3 | 63 (cible partielle selon vélocité) | À mesurer |
| **Total Must Have** | **53** | |

> La vélocité réelle sera calculée à l'issue des deux premiers sprints et ajustée pour le sprint 3.

---

## 4. Matrice des risques

| # | Risque | Probabilité | Impact | Stratégie de réponse |
|---|---|---|---|---|
| R-01 | Surcharge lors des pics de vente | Élevée | Élevé | Auto-scaling Render Web Service + file d'attente Render Redis |
| R-02 | Cyberattaques / tentatives de fraude | Moyenne | Élevé | HTTPS, bcrypt, JWT signés, validation des entrées, rate limiting |
| R-03 | Bug sur le module de paiement | Moyenne | Élevé | Tests exhaustifs en sandbox Stripe, webhooks validés par signature |
| R-04 | Timezone non standardisée entre stades | Faible | Élevé | Stockage UTC en base, conversion côté frontend selon pays du stade |
| R-05 | Retard de livraison d'un sprint | Moyenne | Élevé | Priorisation MoSCoW stricte, revue hebdomadaire GitHub Projects |
| R-06 | Absence d'un membre de l'équipe | Moyenne | Élevé | Binômage, documentation continue, compétences fullstack partagées |
| R-07 | Fuite de données personnelles (RGPD) | Faible | Élevé | Chiffrement, anonymisation, contrôle d'accès strict par rôle |

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
