# FIFA Ticketing Hub 2026

Plateforme web de billetterie pour la Coupe du Monde FIFA 2026 — Projet Master 2 ALM (ESN AST).

> **Avant toute contribution** : lire intégralement [`CLAUDE.md`](./CLAUDE.md).
> Toutes les décisions techniques y sont figées (stack, architecture, règles métier, design system).

---

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express (API REST `/api/v1/`) |
| Base de données | Azure Cosmos DB (API MongoDB) via Mongoose |
| Cache / Lock | Upstash Redis |
| Auth | JWT + bcrypt + OTP email |
| Paiement | Stripe (sandbox) |
| Stockage | Azure Blob Storage (PDFs billets) |
| Déploiement | Azure Static Web Apps (front) + Azure Container Apps (back) |
| Monitoring | Azure Application Insights |
| CI/CD | GitHub Actions |

---

## Structure

```
fifa-ticketing/
├── CLAUDE.md            # Constitution agent (lecture obligatoire)
├── README.md
├── .env.example
├── .cursorrules
├── .github/workflows/   # Pipelines CI/CD
├── agent/               # Contexte agent (tâches, contrats, modèles)
├── docs/                # Livrables TP — NE PAS MODIFIER
├── frontend/            # SPA React + Vite
└── backend/             # API Express + Mongoose
```

---

## Démarrage rapide

### Prérequis
- Node.js 20+
- Docker (optionnel, pour build container)
- Compte Azure (Cosmos DB, Blob Storage, App Insights)
- Compte Upstash Redis
- Compte Stripe (clés `sk_test_...`)

### Installation

```bash
# Backend
cd backend
npm install
cp ../.env.example .env   # puis remplir les variables
npm run dev               # http://localhost:3000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

## Conventions

- **Commits** : Conventional Commits (`feat(scope): ...`, `fix(scope): ...`)
- **Branches** : `main` (prod), `develop` (intégration), `feature/*`, `hotfix/*`
- **JWT** : stocké en cookie `httpOnly` uniquement (jamais en `localStorage`)
- **Logique métier** : strictement côté backend (services), jamais dans React

---

## Documentation détaillée

- [`CLAUDE.md`](./CLAUDE.md) — Constitution du projet
- [`agent/architecture.md`](./agent/architecture.md) — Architecture détaillée
- [`agent/api-contracts.md`](./agent/api-contracts.md) — Contrats API
- [`agent/data-models.md`](./agent/data-models.md) — Schémas Mongoose
- [`agent/design-system.md`](./agent/design-system.md) — Design system
- [`agent/tasks-sprint1.md`](./agent/tasks-sprint1.md) — Sprint 1
- [`agent/tasks-sprint2.md`](./agent/tasks-sprint2.md) — Sprint 2
- [`agent/tasks-sprint3.md`](./agent/tasks-sprint3.md) — Sprint 3
