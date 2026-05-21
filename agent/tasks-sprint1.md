# Sprint 1 — Fondations
> Durée : 2 semaines
> Objectif : Infrastructure + Authentification 2FA + Catalogue matchs
> Must Have couverts : US-01, US-02
> Réf: CLAUDE.md sections 2, 3.3, 4 (Auth + Matches)

---

## TASK-001 — Setup projet et structure
**Status:** TODO
**Priorité:** CRITIQUE — faire en premier absolu
**MoSCoW:** Infrastructure
**Dépend de:** rien

### Ce que l'agent doit faire
- Initialiser monorepo avec structure exacte de CLAUDE.md section 2
- Configurer Vite + React + TailwindCSS (tailwind.config.js depuis CLAUDE.md section 6)
- Configurer Express + Mongoose + connexion Cosmos DB
- Configurer Upstash Redis (ioredis)
- Créer .env.example depuis CLAUDE.md section 7
- Créer tokens.css avec toutes les CSS variables Dark + Light
- Configurer Jest pour backend (jest.config.js + mongodb-memory-server)
- Configurer React Testing Library pour frontend
- Créer Dockerfile backend + Dockerfile frontend

### Tests
- Vérifier que la connexion Cosmos DB s'établit
- Vérifier que Redis répond au ping
- Vérifier que le serveur Express démarre sur le bon port

### Commit message
```
chore(setup): initialize monorepo structure with React, Express, Cosmos DB and Redis
```

---

## TASK-002 — Modèles Mongoose
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** Infrastructure
**Dépend de:** TASK-001

### Ce que l'agent doit faire
- Créer tous les modèles depuis CLAUDE.md section 5
  - User.js, Stadium.js, Match.js, Seat.js
  - Cart.js (index TTL sur expiresAt)
  - Order.js, Ticket.js, Payment.js
- Exporter tous les modèles depuis models/index.js

### Tests unitaires
- Chaque modèle valide les champs requis
- Cart.expiresAt déclenche TTL index
- User.email est unique et lowercase

### Commit message
```
feat(models): add all Mongoose schemas with Cosmos DB TTL index on Cart
```

---

## TASK-003 — Seed script FIFA 2026
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** Infrastructure
**Dépend de:** TASK-002

### Ce que l'agent doit faire
- Créer backend/src/scripts/seed.js
- Insérer les 48 matchs FIFA 2026 réels (dates, équipes, stades)
- Insérer les 16 stades avec capacités réelles
- Générer les sièges par catégorie A / B / C avec prix
- Créer un compte admin par défaut
- Ajouter script npm : `npm run seed`

### Tests
- Vérifier que le seed insère le bon nombre de matchs (48)
- Vérifier que les sièges sont générés correctement
- Vérifier idempotence (seed deux fois = pas de doublons)

### Commit message
```
feat(seed): add FIFA 2026 matches, stadiums and seats seed script
```

---

## TASK-004 — Inscription et Connexion locales (JWT)
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-002

### Ce que l'agent doit faire
- Créer backend/src/services/authService.js
  - registerLocal() : Hacher le mot de passe avec bcrypt, enregistrer l'utilisateur avec `isVerified = true` par défaut, et générer les jetons (Access Token 15m, Refresh Token 7j).
  - loginLocal() : Valider les identifiants locaux, vérifier le mot de passe avec bcrypt, et générer les mêmes jetons JWT.
- Créer backend/src/controllers/authController.js → registerLocal(), loginLocal(), refreshTokens(), logout()
- Créer backend/src/routes/authRoutes.js
  - `POST /api/v1/auth/register` (body: email, password, firstName, lastName, phone)
  - `POST /api/v1/auth/login` (body: email, password)
  - `POST /api/v1/auth/refresh` (cookie: refreshToken)
  - `POST /api/v1/auth/logout`

### Cas de test (format TP)

**ID:** TC-AUTH-001
**Fonctionnalité:** Inscription locale directe
**Préconditions:** Email non utilisé en base
**Étapes:**
1. POST /api/v1/auth/register avec données valides (email, password, etc.)
2. Vérifier création User en base avec son `passwordHash` haché
3. Vérifier que la réponse retourne le `accessToken`
4. Vérifier que le cookie `refreshToken` httpOnly est positionné
**Résultat attendu:** 201 + {user, accessToken} + Cookie refreshToken

**ID:** TC-AUTH-002
**Fonctionnalité:** Connexion locale directe
**Préconditions:** Utilisateur enregistré en base avec mot de passe
**Étapes:**
1. POST /api/v1/auth/login avec email et mot de passe valides
2. Vérifier que la réponse contient l'accessToken
3. Vérifier que le cookie `refreshToken` httpOnly est positionné
**Résultat attendu:** 200 + {user, accessToken} + Cookie refreshToken

---

## TASK-005 — Connexion et Synchronisation Firebase OAuth
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-004

### Ce que l'agent doit faire
- Mettre à jour backend/src/services/authService.js
  - loginOrRegisterFirebase() : Valider le Firebase ID token via `firebase-admin`, chercher l'utilisateur par `firebaseUid`, le créer s'il n'existe pas (sync auto), puis générer les jetons JWT locaux (Access Token et Refresh Token).
- Ajouter au contrôleur backend/src/controllers/authController.js → loginFirebase()
- Ajouter à backend/src/routes/authRoutes.js → `POST /api/v1/auth/firebase` (header: Authorization: Bearer <idToken>)

### Cas de test (format TP)

**ID:** TC-AUTH-003
**Fonctionnalité:** Connexion Firebase avec synchronisation (nouvel utilisateur)
**Préconditions:** ID token Firebase valide fourni
**Étapes:**
1. POST /api/v1/auth/firebase avec token valide d'un utilisateur inexistant en base
2. Vérifier la création de l'utilisateur avec son `firebaseUid` et sans `passwordHash`
3. Vérifier que l'accessToken et le cookie `refreshToken` httpOnly sont retournés
**Résultat attendu:** 200/201 + {user, accessToken} + Cookie refreshToken

---

## TASK-006 — Middlewares JWT local & Autorisations
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-004

### Ce que l'agent doit faire
- Créer backend/src/middlewares/authMiddleware.js
  - Valider l'Access Token JWT extrait du header `Authorization: Bearer <token>`
  - Récupérer l'utilisateur correspondant dans MongoDB et l'attacher à `req.user`
  - Gérer les jetons expirés ou invalides (réponse 401)
- Créer backend/src/middlewares/adminMiddleware.js
  - Valider que `req.user.role === 'admin'` (réponse 403 sinon)

### Tests unitaires
- Token valide → req.user attaché
- Token expiré → 401
- Token absent → 401
- Rôle user sur route admin → 403

---

## TASK-007 — Configuration SDK Firebase Client
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-001

### Ce que l'agent doit faire
- Installer `firebase` sur le frontend
- Créer `frontend/src/config/firebase.js` pour initialiser le SDK
- Configurer les providers Google Auth et GitHub Auth
- Créer les fonctions utilitaires pour appeler la popup Firebase et récupérer l'ID Token

### Tests
- Mocker Firebase Auth pour valider le comportement du service client

---

## TASK-008 — Catalogue matchs backend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-02
**Dépend de:** TASK-003

### Ce que l'agent doit faire
- Créer backend/src/services/matchService.js
- Créer backend/src/controllers/matchController.js
- GET /api/v1/matches → liste avec filtres (date, teamA, teamB, stadiumId)
- GET /api/v1/matches/:id → détail match
- GET /api/v1/matches/:id/seats → sièges avec statut

### Tests intégration
- GET /matches retourne liste paginée
- GET /matches?teamA=France filtre correctement
- GET /matches/:id retourne le bon match
- GET /matches/:id/seats retourne sièges avec statut

---

## TASK-009 — Frontend LoginPage (Double Option)
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-007
**Réf:** CLAUDE.md section 6 (design system)

### Ce que l'agent doit faire
- Créer src/pages/LoginPage.jsx
  - Formulaire de connexion classique (email et mot de passe)
  - Boutons de connexion Google et GitHub premium via Firebase SDK
  - Intégrer l'échange des identifiants (locaux ou Firebase ID Token) contre nos jetons locaux
  - Gérer l'état d'authentification globale dans `authStore.js` (Zustand)
  - Redirection vers le catalogue lors du succès

### Tests composant
- LoginPage affiche les deux options (formulaire local + boutons OAuth)
- L'appel au service approprié est déclenché lors de la soumission

---

## TASK-010 — Frontend RegisterPage (Création de compte locale)
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-009

### Ce que l'agent doit faire
- Créer src/pages/RegisterPage.jsx
  - Formulaire d'inscription (email, mot de passe, prénom, nom, téléphone)
  - Validation basique des champs côté client
  - Soumission vers `POST /api/v1/auth/register`
  - Connexion automatique et redirection vers le catalogue après succès
- Mettre à jour les routes frontend dans `App.jsx`

### Tests composant
- RegisterPage affiche tous les champs requis
- Le clic sur soumission appelle le service d'enregistrement local

---

## TASK-011 — Frontend CataloguePage
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-02
**Dépend de:** TASK-008, TASK-009

### Ce que l'agent doit faire
- Créer src/pages/CataloguePage.jsx
  - Liste de MatchCards
  - Filtres : date, équipe, stade
  - Badge disponibilité animé (vert / rouge)
- Créer src/components/MatchCard.jsx
  - Style : bg-secondary, border-subtle, hover translateY(-2px)
  - Drapeaux équipes, date formatée, stade, badge dispo

### Tests composant
- MatchCard affiche les bonnes infos
- Badge vert si availableSeats > 0
- Badge rouge si availableSeats === 0
- Filtre par équipe fonctionne

### Commit message
```
feat(ui): add CataloguePage with MatchCard component and availability badges
```

---

## TASK-012 — Pipeline CI GitHub Actions
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** Infrastructure
**Dépend de:** TASK-004 à TASK-011

### Ce que l'agent doit faire
- Créer .github/workflows/ci-cd.yml
  - Job test-backend : npm ci + Jest --coverage
  - Job test-frontend : npm ci + lint + build
  - Job deploy : déclenché sur merge main uniquement
- Configurer GitHub Secrets pour Azure

### Commit message
```
chore(ci): add GitHub Actions pipeline with Jest coverage and Azure deployment
```

---

## Récapitulatif Sprint 1

| Task | MoSCoW | US | Commit |
|---|---|---|---|
| TASK-001 | Infrastructure | - | chore(setup) |
| TASK-002 | Infrastructure | - | feat(models) |
| TASK-003 | Infrastructure | - | feat(seed) |
| TASK-004 | MUST | US-01 | feat(auth) |
| TASK-005 | MUST | US-01 | feat(auth) |
| TASK-006 | MUST | US-01 | feat(auth) |
| TASK-007 | MUST | US-01 | chore(firebase) |
| TASK-008 | MUST | US-02 | feat(matches) |
| TASK-009 | MUST | US-01 | feat(ui) |
| TASK-010 | MUST | US-01 | feat(ui) |
| TASK-011 | MUST | US-02 | feat(ui) |
| TASK-012 | Infrastructure | - | chore(ci) |

## Fonctionnalité critique couverte
- ✅ Fonctionnalité critique 1/3 : Authentification Hybride (Local JWT + Firebase OAuth) (TASK-004 à TASK-010)
