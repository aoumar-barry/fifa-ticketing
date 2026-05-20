# Architecture — FIFA Ticketing Hub 2026

> Référence : `CLAUDE.md` sections 1, 2, 3.
> Ce document détaille l'architecture cible. Toute décision doit s'y conformer.

---

## 1. Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────┐
│                         Utilisateur                            │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS
                ┌────────▼────────┐
                │ Azure Static    │   React + Vite SPA
                │ Web Apps (CDN)  │   Dark mode by default
                └────────┬────────┘
                         │ /api/v1/* (fetch, cookies httpOnly)
                ┌────────▼────────┐
                │ Azure Container │   Node.js + Express monolithe modulaire
                │ Apps            │   EventEmitter interne
                └───┬────┬────┬───┘
                    │    │    │
        ┌───────────┘    │    └─────────────┐
        │                │                  │
┌───────▼──────┐  ┌──────▼──────┐   ┌───────▼──────────┐
│ Cosmos DB    │  │ Upstash     │   │ Azure Blob       │
│ (Mongo API)  │  │ Redis       │   │ Storage (PDFs)   │
│ TTL carts    │  │ Seat locks  │   │                  │
└──────────────┘  └─────────────┘   └──────────────────┘

        Stripe (sandbox)  ─── webhook ──▶  Backend
        Nodemailer (SMTP) ◀── email  ───  Backend
        App Insights      ◀── logs   ───  Backend + Front
```

---

## 2. Principes architecturaux

| Principe | Justification |
|---|---|
| Monolithe modulaire | Simplicité, déploiement unique, suffisant pour le périmètre TP |
| REST versionnée `/api/v1/` | Évolutivité contractuelle, compat client mobile future |
| Event-Driven interne (EventEmitter) | Découplage notifications sans broker externe |
| Séparation front/back stricte | Pas de logique métier dans React |
| Containerisation backend | Portabilité, reproductibilité, Azure Container Apps |
| TTL Cosmos pour les paniers | Pas de cron, pas de `setTimeout` Node |
| Lock Redis pour les sièges | Atomicité multi-instance via `SET NX EX` |

---

## 3. Couches backend

```
src/
├── server.js          ← bootstrap (listen, signaux POSIX)
├── app.js             ← instanciation Express, middlewares globaux
├── config/            ← chargement env, connexion DB/Redis/Stripe/Blob
├── routes/            ← définition des endpoints REST (thin layer)
├── controllers/       ← orchestration request/response, validation
├── services/          ← logique métier (TOUT le business est ici)
├── models/            ← schémas Mongoose
├── middlewares/       ← auth JWT, errors, rate limit, logging
├── utils/             ← helpers (AppError, logger, crypto)
├── listeners/         ← handlers EventEmitter (email, log, etc.)
├── scripts/           ← seeders, migrations one-shot
└── __tests__/         ← unit + integration
```

**Flux d'une requête type** :
`route → middleware (auth) → controller (validation) → service (métier) → model (DB) → response`

---

## 4. Couches frontend

```
src/
├── main.jsx           ← bootstrap React
├── App.jsx            ← router + thème
├── pages/             ← une page = une route
├── components/        ← composants réutilisables (MatchCard, SeatMap…)
├── hooks/             ← hooks custom (useAuth, useCart, useTheme)
├── services/          ← clients HTTP (fetch vers /api/v1/)
├── store/             ← état global (auth, cart, theme)
├── utils/             ← helpers UI (formatPrice, formatDate)
└── styles/
    └── tokens.css     ← variables CSS dark/light
```

**Règle d'or** : un composant ne fait JAMAIS d'appel direct à `fetch`. Il passe par un hook qui appelle un service.

---

## 5. Évènements internes (EventEmitter)

| Évènement | Émetteur | Listener(s) |
|---|---|---|
| `user.registered` | AuthService | EmailService (bienvenue) |
| `otp.requested` | AuthService | EmailService (envoi code) |
| `order.confirmed` | PaymentService | TicketService (génération), EmailService (confirmation) |
| `ticket.created` | TicketService | EmailService (PDF en pièce jointe) |
| `cart.expired` | CartService (TTL) | SeatService (libération lock) |

---

## 6. Sécurité

- JWT access (15 min) en header `Authorization: Bearer` OU cookie httpOnly
- JWT refresh (7 jours) en cookie httpOnly + Secure + SameSite=strict
- Bcrypt cost 12 minimum
- Rate limit `/auth/login` et `/auth/verify-otp` (5 req/min/IP)
- Helmet + CORS strict (`FRONTEND_URL` only)
- Stripe webhook : signature `stripe.webhooks.constructEvent` obligatoire
- Aucune donnée bancaire en DB (Stripe garde tout)

---

## 7. Observabilité

- Logs structurés JSON (pino) envoyés vers App Insights via SDK
- Tracing automatique `applicationinsights` Node SDK
- Métriques custom : `cart.created`, `payment.succeeded`, `ticket.generated`
- Front : `@microsoft/applicationinsights-web` pour erreurs JS et perf

---

## 8. Stratégie de tests

| Niveau | Outil | Cible |
|---|---|---|
| Unit backend | Jest | services/, utils/ (coverage > 80%) |
| Integration backend | Jest + supertest | routes/ avec DB en mémoire (mongodb-memory-server) |
| Unit frontend | Jest + RTL | components/, hooks/ |
| E2E (optionnel) | Playwright | Parcours achat complet (Sprint 3 si temps) |

**Cible globale : couverture > 70%**.

---

## 9. Pipeline CI/CD (GitHub Actions)

```
push/pr → install → lint → test → build
                                    ↓
                         (main only) deploy
                                    ├── frontend → Azure Static Web Apps
                                    └── backend  → Azure Container Apps
```
