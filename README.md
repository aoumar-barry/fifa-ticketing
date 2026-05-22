# FIFA Ticketing Hub 2026

FIFA Ticketing Hub 2026 est une plateforme web moderne et sécurisée de billetterie en ligne conçue pour la Coupe du Monde de la FIFA 2026. Ce projet s'inscrit dans le cadre du module ALM du Master 2 ALM (ESN AST).

---

## 🚀 Stack Technique

| Couche | Technologie | Détail / Rôle |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + TailwindCSS | SPA moderne, fluide et responsive |
| **Backend** | Node.js + Express | API REST accessible sous `/api/v1/` |
| **Base de données** | MongoDB Atlas | Cluster cloud managé via Mongoose |
| **Cache / Verrou** | Render Redis | Verrous de sièges atomiques (10 min) |
| **Auth** | Hybride (Local JWT + Firebase) | Connexion locale sécurisée + Google OAuth |
| **Paiement** | Stripe (sandbox) | Gestion conforme PCI-DSS par délégation |
| **Stockage Fichiers** | Render Disk | Volume persistant pour les billets PDF |

---

## ⚙️ Installation des dépendances

### 1. Prérequis
Assurez-vous d'avoir installé :
* **Node.js** (version 20+)
* Un cluster **MongoDB Atlas**
* Une instance **Render Redis**

### 2. Clonage et Installation

```bash
# Pour le Backend
cd backend
npm install

# Pour le Frontend
cd ../frontend
npm install
```

## 🧪 Lancement des Tests
Le seuil de couverture de code imposé par la gouvernance ALM est de > 70% sur l'ensemble des modules critiques.
```bash
# Pour le Backend
cd backend
npm test

# Pour le Frontend
cd frontend
npm test
```

## 📌 Conventions d'Équipe

Afin de garantir la maintenabilité du code et la rigueur du cycle de vie du logiciel (ALM), l'équipe applique les standards suivants :

* **Messages de Commit :** Respect strict de la spécification **Conventional Commits**.
    * *Exemples :* `feat(auth): ...`, `fix(cart): ...`
* **Gestion des Branches :** Isolation rigoureuse des environnements :
    * `main` : Production uniquement.
    * `develop` : Branche d'intégration.
    * `feature/*` : Développement de nouvelles fonctionnalités.
    * `hotfix/*` : Correctifs urgents en production.
* **Gestion des Sessions :** Sécurisation maximale de l'authentification.
    * Le jeton de rafraîchissement (`refreshToken`) est stocké exclusivement dans un cookie **httpOnly**.
    * Le jeton d'accès (JWT) est maintenu uniquement **en mémoire** côté client.
    * 🚫 *Interdiction stricte d'utiliser le `localStorage` pour les données de session*.
* **Architecture :** Séparation stricte des responsabilités. [cite_start]La logique métier est localisée **uniquement côté backend** (dans la couche services)[cite: 2]. [cite_start]Les composants React ne gèrent que l'affichage et l'état de l'interface utilisateur[cite: 2].

---

## 📖 Documentation Détaillée

Toutes les spécifications, modèles et architectures du projet sont répertoriés au sein du dossier `/agent` :

| Document | Rôle & Contenu |
| :--- | :--- |
| 📜 **`CLAUDE.md`** | **Constitution de l'agent** — Règles d'ingénierie, stack et contraintes immuables du projet. |
| 🏗️ `agent/architecture.md` | **Architecture globale** — Conception modulaire de l'API et cinématiques de communication. |
| 🔌 `agent/api-contracts.md` | [cite_start]**Contrats d'API** — Spécifications complètes des endpoints sous `/api/v1/`[cite: 2, 4]. |
| 🗃️ `agent/data-models.md` | **Modèles de Données** — Schémas d'objets Mongoose pour MongoDB Atlas. |
| 🎨 `agent/design-system.md` | [cite_start]**Charte Graphique** — Jetons CSS (Dark/Light tokens) et configuration Tailwind[cite: 6]. |
| 📅 `agent/tasks-sprint1.md` | **Sprint 1** — Initialisation, authentification locale et catalogue. |
| 📅 `agent/tasks-sprint2.md` | **Sprint 2** — Gestion des paniers, verrous Redis et tunnel Stripe. |
| 📅 `agent/tasks-sprint3.md` | **Sprint 3** — Génération des billets PDF, QR Codes et espace Admin. |
