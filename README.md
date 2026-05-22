# FIFA Ticketing Hub 2026

FIFA Ticketing Hub 2026 est une plateforme web moderne et sécurisée de billetterie en ligne conçue pour la Coupe du Monde de la FIFA 2026. Ce projet s'inscrit dans le cadre du module ALM du Master 2 ALM (ESN AST).

La plateforme offre une expérience premium de sélection visuelle de sièges sur un plan de stade interactif, de réservation temporaire sécurisée (verrous de 10 minutes), de paiement en ligne via Stripe, et de génération instantanée de billets officiels munis de QR codes sécurisés au format PDF.

> [!IMPORTANT]
> **Avant toute contribution** : veuillez lire intégralement le fichier [`CLAUDE.md`](./CLAUDE.md).
> Toutes les décisions d'architecture, de conventions de code, de modèles de données et de règles métier y sont consignées de manière définitive.

---

## 1. Stack Technique & Architecture

L'application est construite sous forme de SPA (Single Page Application) communiquant avec une API REST.

| Couche | Technologie | Description |
|---|---|---|
| **Frontend** | React 18 + Vite | SPA rapide avec routage via `react-router-dom` et gestion d'état Zustand. |
| **Styling** | TailwindCSS | Design moderne, respectant un système de thèmes (dark/light) persistant. |
| **Backend** | Node.js + Express | API REST robuste structurée sous `/api/v1/` avec validation Zod. |
| **Base de Données** | Azure Cosmos DB | Instance MongoDB via l'ODM Mongoose pour la persistance des données. |
| **Cache & Verrous** | Upstash Redis | Verrous distribués de 10 minutes sur les sièges pour éviter la surréservation. |
| **Authentification** | Hybride | JWT local (HttpOnly cookies) combiné avec Firebase Admin SDK (OAuth Google/GitHub). |
| **Paiements** | Stripe API | Sandbox Stripe pour sécuriser les flux de facturation et validation par Webhooks. |
| **Stockage** | Azure Blob Storage | Hébergement et archivage sécurisé des fichiers PDF des billets générés. |
| **CI / CD** | GitHub Actions | Pipelines automatisés exécutant le linting, les tests unitaires et le déploiement continu. |
| **Monitoring** | Azure App Insights | Analyse des performances, tracking des erreurs et tableau de bord analytique. |

---

## 2. Structure du Projet

```
fifa-ticketing/
├── CLAUDE.md             # Guide de développement et de style pour les agents et développeurs
├── README.md             # Présentation générale et guide de démarrage rapide (ce fichier)
├── .env.example          # Exemple complet des variables d'environnement requises
├── .cursorrules          # Règles d'instructions pour l'éditeur de code
├── .github/              # Configuration GitHub
│   ├── dependabot.yml    # Configuration des analyses de dépendances hebdomadaires
│   └── workflows/        # Workflows GitHub Actions (CI/CD, Dependabot Auto-Merge)
├── agent/                # Fichiers de contexte technique internes à l'agent d'IA
│   ├── architecture.md   # Documentation de l'architecture et de la topologie de déploiement
│   ├── api-contracts.md  # Définition des endpoints d'API REST
│   ├── data-models.md    # Description des schémas de la base de données Mongoose
│   ├── design-system.md  # Spécifications de la charte graphique et des tokens CSS
│   ├── maintenance.md    # Règles de maintenance et d'auto-merge Dependabot
│   └── tasks-sprint*.md  # Suivi détaillé des tâches par sprint (Sprint 1, 2 et 3)
├── docs/                 # Documentation académique et livrables de cadrage (NE PAS MODIFIER)
├── backend/              # Code source de l'API Express
└── frontend/             # Code source de l'application React
```

---

## 3. Prérequis Système

Pour exécuter et développer sur ce projet, vous devez disposer des outils suivants installés localement :
* **Node.js** v20.x ou version supérieure.
* **npm** v10.x ou version supérieure.
* **Docker** (optionnel, utile pour containeriser l'application en local).
* Accès aux services Cloud tiers ou instances sandbox :
  * Un compte Azure avec Cosmos DB (API MongoDB), Blob Storage, et Application Insights.
  * Un compte Upstash Redis (ou une instance Redis locale).
  * Un compte développeur Stripe (mode Test).
  * Un compte Firebase (pour configurer le service d'authentification OAuth).

---

## 4. Installation et Configuration

### Étape 1 : Cloner le dépôt
```bash
git clone https://github.com/aoumar-barry/fifa-ticketing.git
cd fifa-ticketing
```

### Étape 2 : Configurer les Variables d'Environnement
Copiez le modèle de configuration dans les dossiers respectifs :

#### Configuration Backend
```bash
cd backend
cp .env.example .env
```
Éditez le fichier `backend/.env` et renseignez les variables requises :
* **Port et Node Env** : `PORT=3000`, `NODE_ENV=development`
* **MongoDB** : `MONGODB_URI=mongodb+srv://...`
* **Redis** : `REDIS_URL=rediss://...`
* **Stripe** : `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`
* **JWT** : `JWT_ACCESS_SECRET=votre_secret_jwt_access`, `JWT_REFRESH_SECRET=votre_secret_jwt_refresh`
* **Firebase Admin** : `FIREBASE_PROJECT_ID=...`, `FIREBASE_CLIENT_EMAIL=...`, `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."`
* **SMTP (Nodemailer)** : `SMTP_HOST=...`, `SMTP_PORT=...`, `SMTP_USER=...`, `SMTP_PASS=...`, `SMTP_FROM=...`
* **Azure Blob Storage** : `AZURE_STORAGE_CONNECTION_STRING=...`

#### Configuration Frontend
```bash
cd ../frontend
cp .env.example .env
```
Éditez le fichier `frontend/.env` et renseignez les variables Firebase client correspondantes :
* `VITE_API_URL=http://localhost:3000`
* `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`
* `VITE_FIREBASE_API_KEY=...`
* `VITE_FIREBASE_AUTH_DOMAIN=...`
* `VITE_FIREBASE_PROJECT_ID=...`
* `VITE_FIREBASE_STORAGE_BUCKET=...`
* `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
* `VITE_FIREBASE_APP_ID=...`

### Étape 3 : Installer les Dépendances
Dans deux terminaux séparés ou successivement à la racine :

```bash
# Pour le backend
cd backend
npm install

# Pour le frontend
cd frontend
npm install
```

---

## 5. Exécution en Local

Démarrez les serveurs de développement locaux :

### Lancer le Backend
```bash
cd backend
npm run dev
# L'API démarre par défaut sur http://localhost:3000
```

### Lancer le Frontend
```bash
cd frontend
npm run dev
# Le serveur Vite démarre par défaut sur http://localhost:5173
```

---

## 6. Lancement des Tests & Couverture (Coverage)

Chaque partie dispose de sa suite de tests unitaires et d'intégration utilisant Jest.

### Tests du Backend
Vous pouvez lancer les tests ou générer des rapports de couverture de code :
```bash
cd backend

# Lancer la suite de tests
npm test

# Lancer les tests et générer le rapport de couverture (Jest Coverage)
npm run test -- --coverage
```
Les rapports HTML de couverture générés sont disponibles dans `backend/coverage/lcov-report/index.html`.

### Tests du Frontend
Pour lancer les tests du catalogue, des pages de profil, d'historique et des composants interactifs :
```bash
cd frontend
npm test
```

---

## 7. Déploiement Cloud (Azure / Render)

Le projet utilise des configurations CI/CD pour automatiser les déploiements :
1. **Frontend** : Déployé sur **Azure Static Web Apps** (ou Render Frontend) via le pipeline d'intégration continue déclenché par GitHub Actions sur les branches cibles (`develop`, `preprod`, `main`).
2. **Backend** : Conteneurisé via Docker et déployé sur **Azure Container Apps** (ou Render Web Services). Le déploiement effectue un redémarrage progressif et applique une stratégie de déploiement sécurisée (canary ou rolling update).
3. Les bases de données de production/preprod sont provisionnées sur **Azure Cosmos DB** avec réplication géographique et l'authentification sécurisée SSL active.

---

## 8. Usage des Agents Autonomes (Claude Code / Antigravity 2.0)

Ce projet est structuré pour maximiser la collaboration homme-machine et l'efficacité des agents de codage :
* **Définition de Buts Globaux** : Vous pouvez utiliser la commande `/goal` au sein d'un agent comme Antigravity pour exécuter des tâches complexes de refactoring ou d'écriture de tests en autonomie complète.
* **Alignement Technique** : L'agent s'appuie sur le document [`CLAUDE.md`](./CLAUDE.md) pour respecter les conventions de nommage des fichiers, la gestion d'état et le typage des API.
* **Suivi de Sprint** : Les agents mettent à jour les fichiers de suivi du dossier `/agent/` (comme les plans d'implémentation et les walkthroughs de sprint) au fur et à mesure de l'avancement.
* **Maintenance automatisée** : Le bot Dependabot analyse le projet de manière autonome et soumet des PRs qui sont fusionnées automatiquement si les tests passent, via le workflow d'auto-merge.
