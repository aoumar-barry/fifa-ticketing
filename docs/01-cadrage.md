# Module 1 — Cadrage du projet

## 1. Titre et description synthétique

**FIFA Ticketing Hub 2026** est une plateforme web de réservation, d'achat et de gestion sécurisée de billets pour la Coupe du Monde de Football 2026. Développée par l'équipe ESN AST, elle repose sur une architecture modulaire orientée services, conçue selon des principes de scalabilité pour absorber des pics de charge importants lors des phases de vente critiques. La plateforme offre une expérience utilisateur fluide et sécurisée, de la consultation du catalogue des matchs jusqu'à la génération et au téléchargement du billet numérique avec QR code, en passant par la réservation temporaire de sièges et le paiement en ligne.

---

## 2. Problème résolu et valeur apportée

La billetterie sportive internationale souffre de problèmes récurrents lors des ouvertures de ventes massives : surcharge des serveurs, double-booking de sièges, expériences utilisateur dégradées et risques de fraude. FIFA Ticketing Hub 2026 répond à ces enjeux en proposant :

- Un système de **verrou distribué** garantissant l'exclusivité d'un siège pendant 10 minutes
- Une **authentification hybride** combinant connexion locale et OAuth Google via Firebase
- Une intégration d'une **passerelle de paiement sécurisée** (Stripe) gérant les transactions avec des statuts clairs
- Une **génération automatique** de billets numériques avec QR code infalsifiable
- Un **espace d'administration** permettant la gestion en temps réel des matchs et des stocks

---

## 3. Parties prenantes

| Partie prenante | Rôle | Attentes |
|---|---|---|
| **Supporters / Acheteurs** | Utilisateurs finaux de la plateforme | Expérience d'achat fluide, sécurisée et rapide |
| **Administrateurs FIFA** | Gestionnaires des matchs et des stocks | Interface d'administration claire, statistiques en temps réel |
| **Équipe ESN AST** | Équipe de développement (3 ingénieurs) | Livraison fonctionnelle, code maintenable, pipeline CI/CD fiable |
| **Stripe** | Prestataire de paiement | Intégration conforme PCI-DSS, webhooks fiables |
| **Enseignant / Évaluateur** | Évaluateur du projet | Cohérence ALM, rigueur technique, livrables complets |

---

## 4. Périmètre fonctionnel

### 4.1 Fonctionnalités principales (Must Have)

1. **Inscription et connexion sécurisée** via email/password ou OAuth Google (Firebase)
2. **Consultation du catalogue des matchs** avec filtres et affichage des disponibilités
3. **Réservation de billets** avec verrouillage temporaire de siège (10 minutes) via verrou distribué
4. **Paiement en ligne sécurisé** via Stripe (mode sandbox, PCI-DSS par délégation)
5. **Génération et téléchargement du billet numérique** avec QR code unique et export PDF

### 4.2 Hors-périmètre

- Revente de billets entre particuliers (P2P)
- Réservation d'hébergement ou de transport
- Terminaux physiques de vente ou impression de billets
- Gestion multi-devises en production (sandbox uniquement)
- Application mobile native (iOS / Android)
- Plan de stade en 3D

---

## 5. Contraintes

### 5.1 Contraintes techniques

- **Stack** : React + Vite (frontend), Node.js + Express (backend), MongoDB Atlas, Render Redis
- **Déploiement** : Render Web Service (backend), Render Static Sites (frontend), Render Disk (billets PDF)
- **Scalabilité** : Render auto-scaling sur le Web Service, CDN intégré côté Static Sites
- **Observabilité** : Render Dashboard pour le monitoring des performances et des erreurs
- **Sécurité** : HTTPS obligatoire, JWT en httpOnly cookie, bcrypt (saltRounds: 12), Firebase OAuth
- **CI/CD** : Déploiement automatique Render déclenché à chaque push sur la branche main

### 5.2 Contraintes légales et réglementaires

- **RGPD** : Collecte minimale des données personnelles, droit à l'effacement, consentement explicite
- **PCI-DSS** : Conformité assurée par délégation à Stripe — aucune donnée bancaire stockée dans l'infrastructure
- **Droit à la portabilité** : Export des données utilisateur sur demande

### 5.3 Contraintes organisationnelles

- Équipe de 3 ingénieurs, développement en sprints de 2 semaines
- Suivi Agile via GitHub Projects et GitHub Issues
- Conventions de commits : Conventional Commits
- Stratégie de branches : main / develop / feature/* / hotfix/*

---

## 6. Matrice des risques

| Risque | Probabilité | Impact | Stratégie de réponse |
|---|---|---|---|
| Surcharge lors des pics de vente | Élevée | Élevé | Auto-scaling Render Web Service + verrou distribué Render Redis |
| Cyberattaques / tentatives de fraude | Moyenne | Élevé | HTTPS, bcrypt, JWT signés, validation des entrées, rate limiting |
| Bug sur le module de paiement | Moyenne | Élevé | Tests en sandbox Stripe, webhooks validés par signature |
| Timezone non standardisée entre stades | Faible | Élevé | Stockage UTC en base, conversion côté frontend selon pays du stade |
| Retard de livraison d'un sprint | Moyenne | Élevé | Priorisation MoSCoW stricte, suivi GitHub Projects hebdomadaire |
| Absence d'un membre de l'équipe | Moyenne | Élevé | Binômage, documentation continue, compétences fullstack partagées |
| Fuite de données personnelles (RGPD) | Faible | Élevé | Chiffrement, anonymisation, contrôle d'accès strict par rôle |

---

## 7. Indicateurs de succès (KPI)

> Les indicateurs suivants constituent les cibles de conception du système, mesurées via les outils de la stack retenue.

| Indicateur | Cible | Outil de mesure |
|---|---|---|
| Temps de réponse API | < 500 ms | Render Dashboard |
| Temps de chargement catalogue | < 3 secondes | Chrome DevTools / Lighthouse |
| Disponibilité du système | > 99% | Render Dashboard |
| Taux d'erreur sur le paiement | < 1% | Dashboard Stripe |
| Couverture des tests unitaires | > 70% sur modules critiques | Jest --coverage |
| Temps d'expiration panier | 10 minutes exactes | Tests d'intégration Jest |

---

## 8. Stack technologique

| Composant | Technologie | Justification |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | SPA moderne, composants réutilisables, écosystème mature |
| Backend | Node.js + Express | API REST, compatibilité Render native, écosystème riche |
| Base de données | MongoDB Atlas | Service managé, fiable, compatible Mongoose |
| Cache / Verrou | Render Redis (managed) | Verrou distribué anti-double-booking, TTL natif, intégré à Render |
| Hébergement Frontend | Render Static Sites | CDN intégré, déploiement automatique sur push main |
| Hébergement Backend | Render Web Service | Auto-scaling, déploiement automatique sur push main |
| Stockage PDF | Render Disk | Stockage persistant des billets générés |
| Paiement | Stripe (sandbox) | PCI-DSS par délégation, cartes de test, webhooks fiables |
| Authentification | JWT + bcrypt + Firebase OAuth | Connexion locale et Google OAuth, standard production-grade |
| CI/CD | Render auto-deploy | Déploiement automatique déclenché à chaque push sur main |
| Monitoring | Render Dashboard | Logs, métriques, alertes intégrées |
| Tests | Jest + Supertest | Unitaires, intégration, couverture |
| PDF | PDFKit | Génération billet téléchargeable |
| QR Code | npm qrcode | Identifiant unique par billet |
| Gestion de projet | GitHub Projects + Issues | Suivi Agile Scrum |

### ADR-001 — File d'attente virtuelle

**Contexte :** Lors de l'ouverture des ventes, le volume de requêtes simultanées peut dépasser la capacité de traitement de l'API.

**Décision :** Utilisation de Render Redis avec une structure Sorted Sets pour implémenter une file d'attente FIFO. Chaque requête reçoit un token horodaté comme score. Un middleware Express contrôle le débit en n'autorisant qu'un quota fixe de requêtes par seconde à atteindre les routes de réservation. Les autres reçoivent une réponse HTTP 429 avec leur position dans la file.

**Conséquences positives :** Protection de MongoDB Atlas contre la surcharge, expérience utilisateur transparente avec position en file, compatible Render Web Service multi-instances.

**Conséquences négatives :** Render Redis est un composant payant au-delà du free tier — suffisant pour la démonstration, à faire évoluer selon la charge réelle.

### ADR-002 — Stratégie de verrouillage des sièges

**Contexte :** Deux utilisateurs peuvent tenter de réserver le même siège simultanément.

**Décision :** Utilisation d'un verrou distribué via Render Redis (`SET seat:{id} locked NX EX 600`) combiné à une mise à jour atomique du statut du siège dans MongoDB Atlas (`findOneAndUpdate` avec condition `{ status: "available" }`). Le flag `NX` (Not eXists) garantit qu'un seul thread acquiert le verrou. Le TTL de 600 secondes correspond exactement aux 10 minutes du panier.

**Conséquences positives :** Verrou distribué production-grade, compatible Render Web Service multi-instances, expiration automatique sans job de nettoyage.

**Conséquences négatives :** Dépendance à Render Redis comme composant critique — mitigée par la haute disponibilité du service managé Render.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
