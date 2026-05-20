# FIFA Ticketing Hub 2026 — Agent Constitution
> Lis ce fichier intégralement avant d'écrire la moindre ligne de code.
> Toutes les décisions techniques ont été validées. Ne les remplace pas par tes propres préférences.

---

## 0. Contexte du projet

Plateforme web de billetterie pour la Coupe du Monde FIFA 2026.
Développée dans un cadre scolaire (Master 2 ALM) avec des outils gratuits.
L'application doit être **déployée et fonctionnelle** en production.

---

## 1. Stack technique (non négociable)

| Composant | Technologie | Détail |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | SPA mobile-first |
| Backend | Node.js + Express | API REST versionnée /api/v1/ |
| Base de données | Azure Cosmos DB (API MongoDB) | Compatible Mongoose |
| Cache / Lock | Upstash Redis | Verrou sièges + sessions |
| Auth | JWT + bcrypt + OTP email | Pas de SMS, pas de Google OAuth |
| Paiement | Stripe (sandbox uniquement) | Pas de PayPal |
| Déploiement Frontend | Azure Static Web Apps | CDN intégré, CI/CD GitHub natif |
| Déploiement Backend | Azure Container Apps | Containerisé, auto-scaling |
| Monitoring | Azure Application Insights | Observabilité production |
| Email | Nodemailer | OTP + confirmation + billet PDF |
| PDF | PDFKit | Génération billet téléchargeable |
| QR Code | npm qrcode | Identifiant unique par billet |
| Stockage fichiers | Azure Blob Storage | PDFs des billets |
| Tests | Jest + React Testing Library | Couverture cible > 70% |
| CI/CD | GitHub Actions → Azure | Pipeline automatisé |

---

## 2. Architecture (non négociable)

- **Monolithe modulaire** — pas de microservices, pas de message broker
- **REST API versionnée** — tous les endpoints sous `/api/v1/`
- **Event-Driven interne** — Node.js EventEmitter pour les notifications
- **Séparation stricte** frontend / backend — jamais de logique métier dans React
- **Containerisation** — Dockerfile obligatoire pour le backend

### Structure des dossiers (respecte-la exactement)

```
fifa-ticketing/
├── CLAUDE.md
├── README.md
├── .env.example
├── .cursorrules
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── agent/                        ← fichiers de contexte agent uniquement
│   ├── tasks-sprint1.md
│   ├── tasks-sprint2.md
│   ├── tasks-sprint3.md
│   ├── api-contracts.md
│   ├── data-models.md
│   ├── design-system.md
│   ├── architecture.md
│   └── assets/                   ← screenshots et ressources agent
│       └── monitoring-screenshot.png
├── docs/                         ← LIVRABLES TP UNIQUEMENT — NE PAS TOUCHER
│   └── (géré par l'équipe, pas par l'agent)
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       ├── utils/
│       └── styles/
│           └── tokens.css
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── models/
│       ├── middlewares/
│       ├── utils/
│       ├── listeners/
│       ├── scripts/
│       └── __tests__/
│           ├── unit/
│           └── integration/
└── frontend/
    └── src/
        └── __tests__/
            ├── components/
            └── pages/
```

---

## 3. Règles métier critiques

### 3.1 Verrou de siège (anti-double-booking)
```javascript
// TOUJOURS utiliser ce pattern pour verrouiller un siège
const lockKey = `seat:${seatId}`;
const locked = await redis.set(lockKey, userId, 'NX', 'EX', 600);
if (!locked) throw new AppError(409, 'Siège déjà réservé');
```

### 3.2 Expiration du panier
- TTL géré par le champ `expiresAt` dans Cosmos DB
- Index TTL sur le champ `expiresAt` du document Cart
- Durée : **600 secondes (10 minutes) exactement**
- Libération du verrou Redis si panier annulé manuellement

### 3.3 Authentification 2FA
- OTP : **6 chiffres**, généré avec `crypto.randomInt(100000, 999999)`
- Expiration : **10 minutes** (`otpExpiresAt = Date.now() + 600000`)
- Envoi : **email uniquement** via Nodemailer
- Flux : login → tempToken (5min) → verify-otp → accessToken + refreshToken
- JWT access token : **15 minutes**
- JWT refresh token : **7 jours**
- Stockage JWT : **httpOnly cookie** (jamais localStorage)

### 3.4 Paiement Stripe
- Mode **sandbox uniquement** (clés test `sk_test_...`)
- Flux : createPaymentIntent → clientSecret → confirmPayment → webhook
- Webhook : toujours valider la signature `stripe.webhooks.constructEvent`
- Après `charge.succeeded` : INSERT Order + Ticket + generateQR + sendEmail

### 3.5 Génération billet
```javascript
// Ordre strict des opérations après paiement confirmé
1. INSERT Order (status: confirmed)
2. INSERT Ticket avec qrCode = uuid unique
3. generateQR(ticket.id) → image base64
4. generatePDF(ticket, qrCode) → buffer
5. uploadToBlobStorage(pdf) → url
6. sendEmail(user.email, url)
7. DEL seat:{seatId} de Redis (statut devient sold en DB)
```

---

## 4. API Contracts complets

### Auth
```
POST /api/v1/auth/register     body: {email, password, firstName, lastName, phone}
POST /api/v1/auth/login        body: {email, password} → {tempToken}
POST /api/v1/auth/verify-otp   body: {tempToken, code} → {accessToken} + cookie refreshToken
POST /api/v1/auth/refresh      cookie: refreshToken → {accessToken}
POST /api/v1/auth/logout       → clear cookies
```

### Matches
```
GET  /api/v1/matches                    → [{id, teamA, teamB, date, stadium, availableSeats}]
GET  /api/v1/matches/:id                → Match complet
GET  /api/v1/matches/:id/seats          → [{id, section, row, number, status}]
```

### Cart
```
POST   /api/v1/cart              body: {matchId, seatId} → {cartId, expiresAt}
GET    /api/v1/cart/:id          → Cart + CartItems
DELETE /api/v1/cart/:id          → libère verrou Redis + supprime Cart
```

### Payment
```
POST /api/v1/payment/intent    body: {cartId} → {clientSecret}
POST /api/v1/payment/confirm   body: {cartId, paymentIntentId} → {orderId}
POST /api/v1/payment/webhook   Stripe webhook (raw body requis)
```

### Orders
```
GET /api/v1/orders         → historique utilisateur connecté
GET /api/v1/orders/:id     → Order + Tickets associés
```

### Tickets
```
GET /api/v1/tickets/:id/pdf   → PDF blob (stream)
GET /api/v1/tickets/:id/qr    → QR code image (base64)
```

### Admin (role: admin requis)
```
GET    /api/v1/admin/matches        → tous les matchs
POST   /api/v1/admin/matches        → créer match
PUT    /api/v1/admin/matches/:id    → modifier match
DELETE /api/v1/admin/matches/:id    → désactiver match
GET    /api/v1/admin/stats          → statistiques ventes globales
GET    /api/v1/admin/export         → CSV des ventes
```

---

## 5. Schémas Mongoose (Cosmos DB)

```javascript
// User
{
  email:         { type: String, required: true, unique: true, lowercase: true },
  passwordHash:  { type: String, required: true },
  firstName:     { type: String, required: true },
  lastName:      { type: String, required: true },
  phone:         { type: String },
  otpCode:       { type: String },
  otpExpiresAt:  { type: Date },
  isVerified:    { type: Boolean, default: false },
  role:          { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt:     { type: Date, default: Date.now }
}

// Stadium
{
  name:     { type: String, required: true },
  city:     { type: String, required: true },
  country:  { type: String, required: true },
  capacity: { type: Number, required: true }
}

// Match
{
  teamA:          { type: String, required: true },
  teamB:          { type: String, required: true },
  round:          { type: String, enum: ['group', 'round16', 'quarter', 'semi', 'final'] },
  group:          { type: String },
  date:           { type: Date, required: true },
  stadiumId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  totalSeats:     { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  isActive:       { type: Boolean, default: true }
}

// Seat
{
  stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  section:   { type: String, required: true },
  row:       { type: String, required: true },
  number:    { type: Number, required: true },
  category:  { type: String, enum: ['A', 'B', 'C'] },
  price:     { type: Number, required: true },
  status:    { type: String, enum: ['available', 'locked', 'sold'], default: 'available' }
}

// Cart (TTL index sur expiresAt)
{
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  status:    { type: String, enum: ['active', 'expired', 'confirmed'], default: 'active' },
  items: [{
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    seatId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
    price:   { type: Number, required: true }
  }]
}

// Order
{
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalAmount: { type: Number, required: true },
  status:      { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  createdAt:   { type: Date, default: Date.now }
}

// Ticket
{
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  matchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  seatId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode:    { type: String, unique: true },
  pdfUrl:    { type: String },
  status:    { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
  createdAt: { type: Date, default: Date.now }
}

// Payment
{
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'usd' },
  method:        { type: String, enum: ['STRIPE'], default: 'STRIPE' },
  status:        { type: String, enum: ['pending', 'succeeded', 'failed'] },
  transactionId: { type: String },
  createdAt:     { type: Date, default: Date.now }
}
```

---

## 6. Design System

### Mode par défaut : Dark
### Switch : `data-theme="dark"` / `data-theme="light"` sur `<html>`
### Persistance : localStorage key `theme`

### CSS Variables (tokens.css)
```css
[data-theme="dark"] {
  --bg-primary:    #0A0A0F;
  --bg-secondary:  #111118;
  --bg-tertiary:   #1A1A24;
  --bg-elevated:   #22222F;
  --text-primary:  #FFFFFF;
  --text-secondary:#A0A0B8;
  --text-muted:    #5A5A72;
  --border-subtle: rgba(255,255,255,0.06);
  --border-light:  rgba(255,255,255,0.12);
  --shadow-card:   0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4);
  --shadow-modal:  0 24px 64px rgba(0,0,0,0.8);
}

[data-theme="light"] {
  --bg-primary:    #F8F8FC;
  --bg-secondary:  #FFFFFF;
  --bg-tertiary:   #F0F0F5;
  --bg-elevated:   #E8E8F0;
  --text-primary:  #0A0A0F;
  --text-secondary:#5A5A72;
  --text-muted:    #A0A0B8;
  --border-subtle: rgba(0,0,0,0.06);
  --border-light:  rgba(0,0,0,0.12);
  --shadow-card:   0 0 0 1px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.08);
  --shadow-modal:  0 24px 64px rgba(0,0,0,0.15);
}

:root {
  --brand-gold:       #F5A623;
  --brand-gold-light: #FFD080;
  --brand-gold-dark:  #C47D0E;
  --brand-green:      #00D97E;
  --brand-red:        #FF4D4D;
  --brand-blue:       #4D9FFF;
  --border-focus:     #F5A623;
  --shadow-glow:      0 0 20px rgba(245,166,35,0.3);
  --transition-fast:  150ms ease;
  --transition-base:  250ms ease;
  --transition-slow:  400ms ease;
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full:9999px;
}
```

### Typographie
```
Inter (400/500/600/700/900) → UI général
JetBrains Mono (400/700)   → codes, QR ref
```

### Tailwind config étendue
```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary:  'var(--bg-tertiary)',
          elevated:  'var(--bg-elevated)',
        },
        brand: {
          gold:  '#F5A623',
          green: '#00D97E',
          red:   '#FF4D4D',
          blue:  '#4D9FFF',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        glow:  'var(--shadow-glow)',
        modal: 'var(--shadow-modal)',
      },
      borderRadius: {
        sm: '6px', md: '10px', lg: '16px', xl: '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
      }
    }
  }
}
```

### Composants — règles de style
```
MatchCard     → bg-secondary, border-subtle, hover:-translate-y-0.5
SeatMap       → SVG, section A=gold, B=blue, C=green, pris=opacity-30
CartTimer     → text-secondary → brand-red sous 2min, pulse sous 1min
Bouton CTA    → bg-brand-gold, text-black, rounded-full, shadow-glow
Badge dispo   → pill vert animé si stock > 0, rouge si complet
TicketCard    → gradient noir diagonal, border gold, QR fond blanc
PaymentForm   → Stripe Elements, bg-tertiary, border-light
ThemeToggle   → switch smooth 250ms, icône soleil/lune
```

### Inspirations par page
```
Landing/Hero      → Linear.app
Catalogue matchs  → Event tickets dark UI
Détail match      → Apple product page
Checkout          → Stripe checkout
Dashboard admin   → Vercel dashboard
```

---

## 7. Conventions de code

### Commits (Conventional Commits — obligatoire)
```
feat(auth): add OTP email verification endpoint
fix(cart): release Redis lock on cart expiration
feat(payment): integrate Stripe webhook handler
test(ticket): add unit tests for QR generation
chore(ci): add Azure deployment to GitHub Actions pipeline
docs(api): update API contracts with /payment/webhook
refactor(seat): extract seat locking logic to service layer
style(matchcard): apply dark/light mode CSS variables
feat(admin): add CSV export endpoint for sales data
fix(seat): handle concurrent lock race condition
```

### Branches Git
```
main        ← production uniquement, protégée
develop     ← intégration, base des features
feature/*   ← ex: feature/auth-otp
hotfix/*    ← ex: hotfix/cart-redis-leak
```

### Variables d'environnement (.env.example)
```env
# Azure Cosmos DB
COSMOS_CONNECTION_STRING=
COSMOS_DB_NAME=fifa-ticketing

# Upstash Redis
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=
AZURE_CONTAINER_NAME=tickets

# Azure Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

---

## 8. Ce qu'il ne faut JAMAIS faire

```
❌ Créer ou modifier des fichiers dans /docs
   → /docs est réservé aux livrables TP pour l'enseignant
   → Tous les fichiers de contexte agent sont dans /agent

❌ Stocker données bancaires dans Cosmos DB
❌ Utiliser localStorage pour JWT → httpOnly cookie obligatoire
❌ Exposer variables .env côté frontend
❌ Committer des clés API dans le code
❌ Utiliser PayPal (retiré du périmètre)
❌ Envoyer OTP par SMS (email uniquement)
❌ Utiliser setTimeout Node.js pour expirer les paniers
❌ Mettre de la logique métier dans les routes Express
❌ Créer des microservices séparés (monolithe modulaire uniquement)
❌ Utiliser Bootstrap, Material UI, ou Chakra UI
❌ Utiliser des couleurs hardcodées dans les composants
```

---

## 9. Template de prompt pour coder avec l'agent

```
Contexte : [nom du fichier/module concerné]
Réf : CLAUDE.md section [X] + agent/tasks-sprint[N].md

Implémente [NOM_FEATURE] en respectant :
- Stack : [technologie concernée]
- Règle métier : [règle de la section 3]
- Endpoint : [endpoint de la section 4]
- Schéma : [schéma de la section 5]

Tests Jest obligatoires pour :
- Cas nominal
- Cas d'erreur [décrire]
- Cas limite [décrire]

Ne touche pas au dossier /docs.
```

---

*Dernière mise à jour : Mai 2026 — FIFA Ticketing Hub 2026 — ESN AST*
