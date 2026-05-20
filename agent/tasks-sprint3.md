# Sprint 3 — Finalisation
> Durée : 2 semaines
> Objectif : Must Have restants + Should Have + Tests + Monitoring + Optimisation
> Must Have couverts : US-07
> Should Have couverts : US-08, US-09, US-11, US-12
> Could Have couverts : ThemeToggle, Notifications
> Réf: CLAUDE.md sections 4 (Admin), 6 (Dashboard)

---

## ── MUST HAVE EN PREMIER ──

## TASK-022 — Interface admin backend
**Status:** TODO
**Priorité:** CRITIQUE — premier du sprint 3
**MoSCoW:** MUST HAVE — US-07
**Dépend de:** TASK-007, TASK-008
**Réf:** CLAUDE.md section 4 (Admin endpoints)

### Ce que l'agent doit faire
- Créer backend/src/services/adminService.js
- GET /api/v1/admin/matches → tous les matchs
- POST /api/v1/admin/matches → créer match
- PUT /api/v1/admin/matches/:id → modifier match
- DELETE /api/v1/admin/matches/:id → désactiver
- Protéger toutes les routes avec adminMiddleware

### Tests intégration
- Route admin accessible avec role admin
- Route admin bloquée avec role user → 403
- CRUD matchs fonctionne correctement

### Commit message
```
feat(admin): add admin CRUD matches endpoints with role protection
```

---

## TASK-023 — Dashboard admin frontend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-07
**Dépend de:** TASK-022
**Réf:** CLAUDE.md section 6 (inspiration Vercel dashboard)

### Ce que l'agent doit faire
- Créer src/pages/admin/MatchManagementPage.jsx
  - Table des matchs avec actions Edit/Delete
  - Formulaire création/édition match
  - Style data-dense inspiration Vercel

### Tests composant
- Table matchs affiche tous les matchs
- Formulaire validation avant soumission
- Edit/Delete fonctionnent

### Commit message
```
feat(ui): add admin match management page with CRUD interface
```

---

## ── SHOULD HAVE ──

## TASK-024 — Filtres catalogue + profil utilisateur
**Status:** TODO
**Priorité:** MOYENNE
**MoSCoW:** SHOULD HAVE — US-08, US-11
**Dépend de:** TASK-011, TASK-007

### Ce que l'agent doit faire
- Améliorer CataloguePage avec filtres avancés (US-08)
  - Filtre date, équipe, stade combinés
  - Pagination des résultats
- Créer src/pages/ProfilePage.jsx (US-11)
  - Afficher/modifier nom, prénom, téléphone
  - Appel PUT /api/v1/users/profile
- Créer backend endpoint PUT /api/v1/users/profile

### Tests
- Filtres combinés retournent bons résultats
- Profil modifié correctement en base

### Commit message
```
feat(ui): add advanced catalogue filters and user profile management
```

---

## TASK-025 — Email confirmation paiement
**Status:** TODO
**Priorité:** MOYENNE
**MoSCoW:** SHOULD HAVE — US-09
**Dépend de:** TASK-015

### Ce que l'agent doit faire
- Améliorer ticketService.js
  - Email de confirmation avec récapitulatif commande
  - Template HTML propre avec infos match + siège + montant
  - Lien vers téléchargement billet PDF

### Tests
- Email envoyé après paiement confirmé
- Template contient toutes les infos

### Commit message
```
feat(notifications): add payment confirmation email with order summary
```

---

## TASK-026 — Stats ventes admin
**Status:** TODO
**Priorité:** MOYENNE
**MoSCoW:** SHOULD HAVE — US-12
**Dépend de:** TASK-022

### Ce que l'agent doit faire
- Ajouter dans adminService.js :
  - GET /api/v1/admin/stats → totalRevenue + ticketsSold + par match
  - GET /api/v1/admin/export → CSV (json2csv)
- Créer src/pages/admin/DashboardPage.jsx
  - KPI cards : total ventes, billets vendus, matchs actifs
  - Graphique ventes par match (recharts)
  - Bouton export CSV

### Tests
- Stats retournent les bonnes valeurs
- Export CSV contient les bonnes colonnes

### Commit message
```
feat(admin): add sales stats dashboard and CSV export endpoint
```

---

## ── COULD HAVE ──

## TASK-027 — ThemeToggle Dark/Light
**Status:** TODO
**Priorité:** BASSE
**MoSCoW:** COULD HAVE
**Dépend de:** TASK-001

### Ce que l'agent doit faire
- Créer src/hooks/useTheme.js
  - Lire localStorage key 'theme'
  - Appliquer data-theme sur html
  - Respecter prefers-color-scheme
- Créer src/components/ThemeToggle.jsx
  - Icône soleil/lune, transition 250ms

### Tests composant
- Toggle dark → light → dark
- Persistance localStorage
- prefers-color-scheme respecté

### Commit message
```
feat(ui): add dark/light theme toggle with localStorage persistence
```

---

## TASK-028 — Notifications match modifié
**Status:** TODO
**Priorité:** BASSE
**MoSCoW:** COULD HAVE — US-17
**Dépend de:** TASK-022
**Réf:** CLAUDE.md section 2 (Event-Driven interne)

### Ce que l'agent doit faire
- Créer backend/src/utils/eventBus.js (Node EventEmitter)
- Créer backend/src/listeners/matchListener.js
  - Écouter 'match:updated'
  - Envoyer email à tous les acheteurs
- Déclencher dans adminService lors modification match

### Tests unitaires
- EventBus émet et reçoit correctement
- matchListener envoie email aux acheteurs

### Commit message
```
feat(notifications): add Event-Driven match update notifications via Nodemailer
```

---

## ── MODULES TP ──

## TASK-029 — Tests Jest couverture complète
**Status:** TODO
**Priorité:** CRITIQUE pour module 5
**Dépend de:** TASK-004 à TASK-028

### Ce que l'agent doit faire
- Compléter tous les tests manquants
- Générer rapport Jest --coverage
- Sauvegarder dans agent/coverage-report.md
- Documenter zones non couvertes

### Zones à couvrir obligatoirement
- authService : 100%
- cartService + seatLockService : 100%
- paymentService + ticketService : 100%
- matchService : > 80%
- adminService : > 70%

### Commit message
```
test(coverage): add complete Jest test suite targeting 70%+ coverage on critical modules
```

---

## TASK-030 — Monitoring Azure Application Insights
**Status:** TODO
**Priorité:** HAUTE — module 6
**Dépend de:** TASK-012

### Ce que l'agent doit faire
- Configurer @azure/monitor-opentelemetry
- Tracker : temps réponse API, taux erreur, disponibilité
- Alerte sur taux erreur > 1%
- Screenshot dans agent/assets/monitoring-screenshot.png
  ⚠️ Ne pas mettre dans /docs

### Commit message
```
feat(monitoring): add Azure Application Insights with error rate alert
```

---

## TASK-031 — Pipeline CI/CD complet Azure
**Status:** TODO
**Priorité:** CRITIQUE — module 6
**Dépend de:** TASK-012, TASK-030

### Ce que l'agent doit faire
- Étendre .github/workflows/ci-cd.yml
  - Build + push Docker → Azure Container Registry
  - Deploy → Azure Container Apps (canary 5%)
  - Deploy frontend → Azure Static Web Apps
- Documenter rollback dans agent/architecture.md

### Commit message
```
chore(ci): extend pipeline with Azure Container Apps canary deployment strategy
```

---

## TASK-032 — Dependabot
**Status:** TODO
**Priorité:** MOYENNE — module 7
**Dépend de:** TASK-001

### Ce que l'agent doit faire
- Créer .github/dependabot.yml
  - Vérification hebdomadaire npm backend + frontend
  - Auto-merge patches sécurité
- Documenter dans agent/maintenance.md
  ⚠️ Ne pas mettre dans /docs

### Commit message
```
chore(deps): add Dependabot configuration for automated dependency updates
```

---

## TASK-033 — Optimisation performances
**Status:** TODO
**Priorité:** MOYENNE
**Dépend de:** TASK-008

### Ce que l'agent doit faire
- Cache node-cache sur GET /matches (TTL 60s)
- Index Mongoose sur Match.date + Match.teamA
- Compression middleware Express
- Lazy loading images CataloguePage

### Commit message
```
perf(api): add node-cache, pagination and Mongoose indexes for catalogue performance
```

---

## TASK-034 — README.md complet
**Status:** TODO
**Priorité:** HAUTE — module 4
**Dépend de:** toutes les tasks

### Ce que l'agent doit faire
- Créer README.md à la racine :
  - Description du projet
  - Prérequis (Node.js, Docker, Azure)
  - Installation + configuration .env
  - Lancer tests : `npm test -- --coverage`
  - Démarrer local : `npm run dev`
  - Déploiement Azure
  - Usage IA : Claude Code + Antigravity 2.0

### Commit message
```
docs(readme): add complete setup, test and deployment instructions
```

---

## Récapitulatif Sprint 3

| Task | MoSCoW | US | Commit |
|---|---|---|---|
| TASK-022 | MUST | US-07 | feat(admin) |
| TASK-023 | MUST | US-07 | feat(ui) |
| TASK-024 | SHOULD | US-08/11 | feat(ui) |
| TASK-025 | SHOULD | US-09 | feat(notifications) |
| TASK-026 | SHOULD | US-12 | feat(admin) |
| TASK-027 | COULD | - | feat(ui) |
| TASK-028 | COULD | US-17 | feat(notifications) |
| TASK-029 | Module 5 | - | test(coverage) |
| TASK-030 | Module 6 | - | feat(monitoring) |
| TASK-031 | Module 6 | - | chore(ci) |
| TASK-032 | Module 7 | - | chore(deps) |
| TASK-033 | Bonus | - | perf(api) |
| TASK-034 | Module 4 | - | docs(readme) |

## Modules TP couverts
- ✅ Module 4 — README, CI, conventions
- ✅ Module 5 — Tests Jest > 70%
- ✅ Module 6 — Azure CI/CD, monitoring, canary
- ✅ Module 7 — Dependabot, optimisation

## Règle critique
- ✅ Fichiers agent → /agent/
- ❌ Ne jamais toucher → /docs/
