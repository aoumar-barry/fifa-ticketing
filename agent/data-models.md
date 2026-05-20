# Data Models — FIFA Ticketing Hub 2026

> Référence : `CLAUDE.md` section 5.
> Tous les schémas Mongoose ci-dessous sont la source de vérité.
> Cosmos DB API MongoDB est compatible Mongoose, à condition de respecter les limites :
> - clé de partition à définir explicitement par collection
> - éviter les transactions multi-collections (non supportées sur les niveaux gratuits)

---

## 1. User

```javascript
{
  email:        { type: String,  required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String,  required: true },
  firstName:    { type: String,  required: true },
  lastName:     { type: String,  required: true },
  phone:        { type: String },
  otpCode:      { type: String },
  otpExpiresAt: { type: Date },
  isVerified:   { type: Boolean, default: false },
  role:         { type: String,  enum: ['user', 'admin'], default: 'user' },
  createdAt:    { type: Date,    default: Date.now }
}
```
Index : `{ email: 1 }` unique.

---

## 2. Stadium

```javascript
{
  name:     { type: String, required: true },
  city:     { type: String, required: true },
  country:  { type: String, required: true },
  capacity: { type: Number, required: true }
}
```
Index : `{ city: 1 }`.

---

## 3. Match

```javascript
{
  teamA:          { type: String, required: true },
  teamB:          { type: String, required: true },
  round:          { type: String, enum: ['group', 'round16', 'quarter', 'semi', 'final'] },
  group:          { type: String },
  date:           { type: Date,   required: true },
  stadiumId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  totalSeats:     { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  isActive:       { type: Boolean, default: true }
}
```
Index : `{ date: 1 }`, `{ stadiumId: 1 }`.

---

## 4. Seat

```javascript
{
  stadiumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stadium' },
  section:   { type: String, required: true },
  row:       { type: String, required: true },
  number:    { type: Number, required: true },
  category:  { type: String, enum: ['A', 'B', 'C'] },
  price:     { type: Number, required: true },
  status:    { type: String, enum: ['available', 'locked', 'sold'], default: 'available' }
}
```
Index composé : `{ stadiumId: 1, section: 1, row: 1, number: 1 }` unique.

> **Important** : le statut `locked` en DB n'est PAS la source de vérité du lock. Le lock court terme reste dans Redis (`seat:{seatId}` TTL 600s). La DB ne passe à `sold` qu'après confirmation paiement.

---

## 5. Cart (TTL Cosmos)

```javascript
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
```
Index TTL : `{ expiresAt: 1 }` avec `expireAfterSeconds: 0`.
**Durée** : `expiresAt = Date.now() + 600_000` (10 minutes).

---

## 6. Order

```javascript
{
  userId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  totalAmount:            { type: Number, required: true },
  status:                 { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  stripePaymentIntentId:  { type: String },
  createdAt:              { type: Date, default: Date.now }
}
```
Index : `{ userId: 1, createdAt: -1 }`.

---

## 7. Ticket

```javascript
{
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  matchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  seatId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode:    { type: String, unique: true },      // uuid v4
  pdfUrl:    { type: String },                    // URL Blob Storage
  status:    { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
  createdAt: { type: Date, default: Date.now }
}
```
Index : `{ qrCode: 1 }` unique, `{ userId: 1 }`.

---

## 8. Payment

```javascript
{
  orderId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'usd' },
  method:        { type: String, enum: ['STRIPE'], default: 'STRIPE' },
  status:        { type: String, enum: ['pending', 'succeeded', 'failed'] },
  transactionId: { type: String },                // PaymentIntent ID Stripe
  createdAt:     { type: Date, default: Date.now }
}
```
Index : `{ orderId: 1 }`, `{ transactionId: 1 }`.

---

## 9. Relations

```
User 1 ─── N Cart
User 1 ─── N Order
Order 1 ── N Ticket
Order 1 ── 1 Payment
Match 1 ── N Seat (via Stadium)
Match 1 ── N Ticket
Seat 1 ─── 0..1 Ticket (siège vendu une fois)
Stadium 1 ─ N Match
Stadium 1 ─ N Seat
```

---

## 10. Clés de partition Cosmos DB (recommandation)

| Collection | Partition Key |
|---|---|
| users      | `/email` |
| stadiums   | `/city` |
| matches    | `/round` (ou `/date` si volume) |
| seats      | `/stadiumId` |
| carts      | `/userId` |
| orders     | `/userId` |
| tickets    | `/userId` |
| payments   | `/orderId` |
