# API Contracts — FIFA Ticketing Hub 2026

> Référence : `CLAUDE.md` section 4.
> Toutes les routes sont préfixées par `/api/v1/`.
> Toutes les réponses d'erreur suivent le format unifié décrit en section 7.

---

## 1. Auth — `/api/v1/auth`

### `POST /auth/register`
**Body**
```json
{
  "email": "john@test.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678"
}
```

**Réponse 201**
```json
{
  "user": { "id": "...", "email": "john@test.com", "firstName": "John", "lastName": "Doe", "role": "user" },
  "accessToken": "ey..."
}
```
Set-Cookie: `refreshToken=ey...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` (Refresh Token JWT valide pour 7 jours)

**Erreurs** : 400 (champs requis manquants), 409 (email déjà existant)

### `POST /auth/login`
**Body**
```json
{
  "email": "john@test.com",
  "password": "securepassword"
}
```

**Réponse 200**
```json
{
  "user": { "id": "...", "email": "john@test.com", "firstName": "John", "lastName": "Doe", "role": "user" },
  "accessToken": "ey..."
}
```
Set-Cookie: `refreshToken=ey...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` (Refresh Token JWT valide pour 7 jours)

**Erreurs** : 400 (email/password requis), 401 (identifiants incorrects)

### `POST /auth/firebase`
**Headers**
`Authorization: Bearer <idToken>` (Token d'ID Firebase obtenu après authentification Google/GitHub sur le client)

**Réponse 200** (ou 201 si création)
```json
{
  "user": { "id": "...", "email": "john@test.com", "firstName": "John", "lastName": "Doe", "role": "user" },
  "accessToken": "ey..."
}
```
Set-Cookie: `refreshToken=ey...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` (Refresh Token JWT local valide pour 7 jours)

**Erreurs** : 400 (token manquant), 401 (token Firebase invalide ou expiré)

### `POST /auth/refresh`
**Cookies**
`refreshToken=<token>`

**Réponse 200**
```json
{
  "accessToken": "ey..."
}
```
Set-Cookie: `refreshToken=ey...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` (Nouveau Refresh Token local)

**Erreurs** : 401 (refresh token invalide, expiré ou manquant)

### `POST /auth/logout`
**Réponse 204** + clear cookie `refreshToken`

---

## 2. Matches — `/api/v1/matches`

### `GET /matches`
Query : `?round=group|round16|...&date=YYYY-MM-DD&stadiumId=...`
**Réponse 200**
```json
[
  { "id": "...", "teamA": "France", "teamB": "Brésil", "date": "2026-06-12T18:00:00Z",
    "stadium": { "id": "...", "name": "MetLife", "city": "New York" },
    "availableSeats": 42000, "totalSeats": 82500 }
]
```

### `GET /matches/:id`
**Réponse 200** Match complet (mêmes champs + `round`, `group`, `isActive`)
**Erreurs** : 404

### `GET /matches/:id/seats`
**Réponse 200**
```json
[ { "id": "...", "section": "A", "row": "12", "number": 7, "category": "A", "price": 280, "status": "available" } ]
```
> `status` ∈ `available | locked | sold`

---

## 3. Cart — `/api/v1/cart` (auth requis)

### `POST /cart`
**Body** `{ "matchId": "string", "seatId": "string" }`
**Effet** : `SET NX EX 600` sur `seat:{seatId}` dans Redis, INSERT Cart si absent.
**Réponse 201** `{ "cartId": "string", "expiresAt": "ISO date", "items": [...] }`
**Erreurs** : 404 (match ou siège), 409 (siège déjà verrouillé)

### `GET /cart/:id`
**Réponse 200** Cart + items
**Erreurs** : 403 (pas propriétaire), 404, 410 (expiré)

### `DELETE /cart/:id`
**Effet** : `DEL seat:{seatId}` pour chaque item, marque Cart `expired`.
**Réponse 204**

---

## 4. Payment — `/api/v1/payment` (auth requis)

### `POST /payment/intent`
**Body** `{ "cartId": "string" }`
**Réponse 200** `{ "clientSecret": "string", "amount": 280, "currency": "usd" }`
**Erreurs** : 410 (cart expiré), 404

### `POST /payment/confirm`
**Body** `{ "cartId": "string", "paymentIntentId": "string" }`
**Réponse 200** `{ "orderId": "string", "status": "confirmed" }`

### `POST /payment/webhook` (Stripe → backend)
**Header** : `Stripe-Signature`
**Body** : raw (pas de JSON parser)
**Effet** : sur `charge.succeeded`, lance le flux post-paiement (voir CLAUDE.md §3.5).
**Réponse 200** `{ "received": true }`

---

## 5. Orders — `/api/v1/orders` (auth requis)

### `GET /orders`
**Réponse 200** Liste des commandes de l'utilisateur connecté
```json
[ { "id": "...", "totalAmount": 280, "status": "confirmed", "createdAt": "...", "ticketsCount": 1 } ]
```

### `GET /orders/:id`
**Réponse 200** Order + tickets associés (avec urls PDF / QR)

---

## 6. Tickets — `/api/v1/tickets` (auth requis)

### `GET /tickets/:id/pdf`
**Réponse 200** stream `application/pdf`
**Erreurs** : 403 (pas propriétaire), 404

### `GET /tickets/:id/qr`
**Réponse 200** `{ "qrCode": "data:image/png;base64,..." }`

---

## 7. Admin — `/api/v1/admin` (role: admin requis)

| Méthode | Endpoint | Effet |
|---|---|---|
| GET  | `/admin/matches`     | Liste tous matchs (incl. inactifs) |
| POST | `/admin/matches`     | Crée un match |
| PUT  | `/admin/matches/:id` | Modifie un match |
| DEL  | `/admin/matches/:id` | Désactive (`isActive=false`) |
| GET  | `/admin/stats`       | Stats ventes globales |
| GET  | `/admin/export`      | Export CSV ventes |

---

## 8. Format d'erreur unifié

```json
{
  "error": {
    "code": "SEAT_ALREADY_LOCKED",
    "message": "Ce siège est déjà réservé par un autre utilisateur.",
    "status": 409,
    "details": { "seatId": "..." }
  }
}
```

| Code HTTP | Cas |
|---|---|
| 400 | Validation body / query |
| 401 | Non authentifié / token invalide |
| 403 | Authentifié mais pas autorisé |
| 404 | Ressource introuvable |
| 409 | Conflit (siège locké, email dupliqué) |
| 410 | Ressource expirée (cart) |
| 429 | Rate limit |
| 500 | Erreur serveur (loggée App Insights) |

---

## 9. Authentification — résumé des headers

| Endpoint | Header requis | Cookie requis |
|---|---|---|
| `/auth/register` | — | — |
| `/auth/login` | — | — |
| `/auth/firebase` | `Authorization: Bearer <idToken>` | — |
| `/auth/refresh` | — | `refreshToken` |
| `/auth/logout` | — | — |
| Toute autre route protégée | `Authorization: Bearer <accessToken>` | — |
| Routes admin | `Authorization: Bearer <accessToken>` | — (role=admin requis) |
| Stripe webhook | `Stripe-Signature` | — |
