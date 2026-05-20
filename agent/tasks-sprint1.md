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

## TASK-004 — Auth Register
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-002

### Ce que l'agent doit faire
- Créer backend/src/services/authService.js → register()
- Créer backend/src/controllers/authController.js → register()
- Créer backend/src/routes/authRoutes.js → POST /api/v1/auth/register
- Hash password avec bcrypt (saltRounds: 12)
- Envoyer email de bienvenue via Nodemailer
- Valider les inputs avec express-validator

### Cas de test (format TP)

**ID:** TC-AUTH-001
**Fonctionnalité:** Inscription utilisateur
**Préconditions:** Aucun compte existant avec cet email
**Étapes:**
1. POST /api/v1/auth/register avec {email, password, firstName, lastName, phone}
2. Vérifier création User en base
3. Vérifier email de bienvenue envoyé
**Résultat attendu:** 201 + {message: "Compte créé"}
**Résultat obtenu (simulé):** ✅ 201

**ID:** TC-AUTH-002
**Fonctionnalité:** Inscription — email déjà utilisé
**Préconditions:** Compte existant avec test@test.com
**Étapes:**
1. POST /api/v1/auth/register avec email déjà pris
**Résultat attendu:** 409 + {error: "Email déjà utilisé"}
**Résultat obtenu (simulé):** ✅ 409

**ID:** TC-AUTH-003
**Fonctionnalité:** Inscription — données manquantes
**Préconditions:** Aucune
**Étapes:**
1. POST /api/v1/auth/register sans le champ password
**Résultat attendu:** 422 + erreurs de validation
**Résultat obtenu (simulé):** ✅ 422

### Commit message
```
feat(auth): add register endpoint with bcrypt hashing and welcome email
```

---

## TASK-005 — Auth Login + génération OTP
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-004
**Réf:** CLAUDE.md section 3.3

### Ce que l'agent doit faire
- authService.js → login()
  - Vérifier email + bcrypt password
  - Générer OTP 6 chiffres via crypto.randomInt(100000, 999999)
  - Sauvegarder otpCode + otpExpiresAt (now + 10min) dans User
  - Envoyer email OTP via Nodemailer
  - Retourner tempToken JWT signé 5min
- POST /api/v1/auth/login

### Cas de test (format TP)

**ID:** TC-AUTH-004
**Fonctionnalité:** Connexion — cas nominal (fonctionnalité critique 1/3)
**Préconditions:** Utilisateur inscrit et vérifié en base
**Étapes:**
1. POST /api/v1/auth/login avec {email, password} corrects
2. Vérifier que otpCode est sauvegardé en base
3. Vérifier que email OTP est envoyé
**Résultat attendu:** 200 + {tempToken}
**Résultat obtenu (simulé):** ✅ 200 + tempToken

**ID:** TC-AUTH-005
**Fonctionnalité:** Connexion — mauvais mot de passe
**Préconditions:** Utilisateur inscrit
**Étapes:**
1. POST /api/v1/auth/login avec mauvais password
**Résultat attendu:** 401 + {error: "Identifiants invalides"}
**Résultat obtenu (simulé):** ✅ 401

**ID:** TC-AUTH-006
**Fonctionnalité:** Connexion — email inexistant
**Préconditions:** Aucune
**Étapes:**
1. POST /api/v1/auth/login avec email inexistant
**Résultat attendu:** 401 (même message — sécurité)
**Résultat obtenu (simulé):** ✅ 401

### Commit message
```
feat(auth): add login endpoint with OTP generation and email delivery
```

---

## TASK-006 — Auth Verify OTP
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-005
**Réf:** CLAUDE.md section 3.3

### Ce que l'agent doit faire
- authService.js → verifyOTP()
  - Vérifier tempToken JWT
  - Vérifier otpCode + otpExpiresAt
  - Générer accessToken (15min) + refreshToken (7 jours)
  - Stocker refreshToken en httpOnly cookie
  - Nettoyer otpCode + otpExpiresAt en base
- POST /api/v1/auth/verify-otp

### Cas de test (format TP)

**ID:** TC-AUTH-007
**Fonctionnalité:** Vérification OTP — cas nominal (fonctionnalité critique 1/3)
**Préconditions:** Login effectué, tempToken valide, OTP reçu
**Étapes:**
1. POST /api/v1/auth/verify-otp avec {tempToken, code} corrects
2. Vérifier accessToken dans réponse
3. Vérifier refreshToken dans httpOnly cookie
4. Vérifier otpCode supprimé en base
**Résultat attendu:** 200 + {accessToken} + cookie refreshToken
**Résultat obtenu (simulé):** ✅ 200

**ID:** TC-AUTH-008
**Fonctionnalité:** Vérification OTP — code expiré
**Préconditions:** OTP généré il y a plus de 10 minutes
**Étapes:**
1. POST /api/v1/auth/verify-otp avec code expiré
**Résultat attendu:** 401 + {error: "Code OTP expiré"}
**Résultat obtenu (simulé):** ✅ 401

**ID:** TC-AUTH-009
**Fonctionnalité:** Vérification OTP — mauvais code
**Préconditions:** Login effectué, tempToken valide
**Étapes:**
1. POST /api/v1/auth/verify-otp avec mauvais code
**Résultat attendu:** 401 + {error: "Code OTP invalide"}
**Résultat obtenu (simulé):** ✅ 401

### Commit message
```
feat(auth): add OTP verification with JWT access and refresh token generation
```

---

## TASK-007 — Middleware Auth JWT
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-006

### Ce que l'agent doit faire
- Créer backend/src/middlewares/authMiddleware.js
  - Vérifier accessToken dans Authorization header
  - Attacher user au req.user
  - Gérer token expiré → 401
- Créer backend/src/middlewares/adminMiddleware.js
  - Vérifier req.user.role === 'admin'
- POST /api/v1/auth/refresh → nouveau accessToken
- POST /api/v1/auth/logout → clear cookies

### Tests unitaires
- Token valide → req.user attaché
- Token expiré → 401
- Token absent → 401
- Role user sur route admin → 403

### Commit message
```
feat(auth): add JWT middleware with refresh token rotation and logout
```

---

## TASK-008 — Catalogue matchs backend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-02
**Dépend de:** TASK-003, TASK-007

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

### Commit message
```
feat(matches): add catalogue endpoints with filtering and seat availability
```

---

## TASK-009 — Frontend LoginPage + OTPPage
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-006
**Réf:** CLAUDE.md section 6 (design system)

### Ce que l'agent doit faire
- Créer src/pages/LoginPage.jsx
  - Formulaire email + password
  - Style Dark Premium (fond bg-primary, inputs bg-tertiary, CTA gold)
  - Appel POST /api/v1/auth/login via src/services/authService.js
  - Redirection vers OTPPage si succès
- Créer src/pages/OTPPage.jsx
  - Input 6 chiffres (6 cases séparées)
  - Countdown 5min pour le tempToken
  - Appel POST /api/v1/auth/verify-otp
  - Redirection vers catalogue si succès
- Créer src/store/authStore.js (Zustand)
  - Stocker accessToken en mémoire (jamais localStorage)

### Tests composant
- LoginPage affiche erreur si mauvais password
- OTPPage affiche countdown
- Redirection correcte après succès

### Commit message
```
feat(ui): add LoginPage and OTPPage with dark premium design and Zustand store
```

---

## TASK-010 — Frontend RegisterPage
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-01
**Dépend de:** TASK-004, TASK-009

### Ce que l'agent doit faire
- Créer src/pages/RegisterPage.jsx
  - Formulaire complet (email, password, firstName, lastName, phone)
  - Validation côté client
  - Style Dark Premium cohérent avec LoginPage
  - Appel POST /api/v1/auth/register

### Tests composant
- Validation formulaire champs requis
- Erreur si email déjà pris
- Redirection vers LoginPage après succès

### Commit message
```
feat(ui): add RegisterPage with form validation and dark premium design
```

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
| TASK-007 | MUST | US-01 | feat(auth) |
| TASK-008 | MUST | US-02 | feat(matches) |
| TASK-009 | MUST | US-01 | feat(ui) |
| TASK-010 | MUST | US-01 | feat(ui) |
| TASK-011 | MUST | US-02 | feat(ui) |
| TASK-012 | Infrastructure | - | chore(ci) |

## Fonctionnalité critique couverte
- ✅ Fonctionnalité critique 1/3 : Authentification 2FA (TASK-004 à 007)
