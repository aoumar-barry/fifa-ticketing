# Sprint 2 — Cœur métier
> Durée : 2 semaines
> Objectif : Réservation + Paiement + Billet + Historique
> Must Have couverts : US-03, US-04, US-05, US-06
> Réf: CLAUDE.md sections 3.1, 3.2, 3.4, 3.5, 4

---

## TASK-013 — Service verrou siège Redis
**Status:** TODO
**Priorité:** CRITIQUE — faire en premier du sprint 2
**MoSCoW:** MUST HAVE — US-03
**Dépend de:** TASK-007
**Réf:** CLAUDE.md section 3.1

### Ce que l'agent doit faire
- Créer backend/src/services/seatLockService.js
  - lockSeat(seatId, userId) → SET seat:{id} NX EX 600
  - unlockSeat(seatId) → DEL seat:{id}
  - isLocked(seatId) → GET seat:{id}

### Cas de test (format TP)

**ID:** TC-SEAT-001
**Fonctionnalité:** Verrou siège — cas nominal (fonctionnalité critique 2/3)
**Préconditions:** Siège disponible, Redis connecté
**Étapes:**
1. lockSeat(seatId, userId)
2. Vérifier clé Redis créée avec TTL 600s
**Résultat attendu:** true + clé Redis SET
**Résultat obtenu (simulé):** ✅ true

**ID:** TC-SEAT-002
**Fonctionnalité:** Verrou siège — siège déjà pris
**Préconditions:** Siège déjà verrouillé par un autre user
**Étapes:**
1. lockSeat(seatId, userId2) sur siège déjà locké
**Résultat attendu:** false + AppError 409
**Résultat obtenu (simulé):** ✅ 409

**ID:** TC-SEAT-003
**Fonctionnalité:** Libération verrou
**Préconditions:** Siège verrouillé
**Étapes:**
1. unlockSeat(seatId)
2. Vérifier clé Redis supprimée
**Résultat attendu:** clé DEL de Redis
**Résultat obtenu (simulé):** ✅ clé supprimée

### Commit message
```
feat(seat): add Redis distributed lock service with NX EX 600 pattern
```

---

## TASK-014 — Cart backend
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-03
**Dépend de:** TASK-013
**Réf:** CLAUDE.md sections 3.1, 3.2

### Ce que l'agent doit faire
- Créer backend/src/services/cartService.js
  - createCart(userId, matchId, seatId)
  - getCart(cartId, userId)
  - deleteCart(cartId, userId) → unlock Redis
- POST /api/v1/cart
- GET /api/v1/cart/:id
- DELETE /api/v1/cart/:id

### Cas de test (format TP)

**ID:** TC-CART-001
**Fonctionnalité:** Création panier — cas nominal (fonctionnalité critique 2/3)
**Préconditions:** Utilisateur connecté, siège disponible
**Étapes:**
1. POST /api/v1/cart avec {matchId, seatId}
2. Vérifier verrou Redis créé
3. Vérifier Cart créé avec expiresAt correct
**Résultat attendu:** 201 + {cartId, expiresAt}
**Résultat obtenu (simulé):** ✅ 201

**ID:** TC-CART-002
**Fonctionnalité:** Création panier — siège déjà pris
**Préconditions:** Siège verrouillé par autre user
**Étapes:**
1. POST /api/v1/cart avec seatId déjà locké
**Résultat attendu:** 409 + {error: "Siège déjà réservé"}
**Résultat obtenu (simulé):** ✅ 409

**ID:** TC-CART-003
**Fonctionnalité:** Annulation panier
**Préconditions:** Cart actif existant
**Étapes:**
1. DELETE /api/v1/cart/:id
2. Vérifier verrou Redis libéré
3. Vérifier Cart supprimé
**Résultat attendu:** 200 + verrou libéré
**Résultat obtenu (simulé):** ✅ 200

### Commit message
```
feat(cart): add cart service with Redis seat locking and Cosmos DB TTL expiration
```

---

## TASK-015 — Paiement Stripe backend
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-04
**Dépend de:** TASK-014
**Réf:** CLAUDE.md section 3.4

### Ce que l'agent doit faire
- Créer backend/src/services/paymentService.js
  - createPaymentIntent(cartId)
  - confirmPayment(cartId, paymentIntentId)
- POST /api/v1/payment/intent → {clientSecret}
- POST /api/v1/payment/confirm → {orderId}
- POST /api/v1/payment/webhook (raw body + signature Stripe)

### Cas de test (format TP)

**ID:** TC-PAY-001
**Fonctionnalité:** Paiement Stripe — cas nominal (fonctionnalité critique 3/3)
**Préconditions:** Cart actif, Stripe sandbox configuré
**Étapes:**
1. POST /api/v1/payment/intent avec {cartId}
2. Confirmer avec carte test 4242 4242 4242 4242
3. POST /api/v1/payment/confirm avec {paymentIntentId}
4. Vérifier Order créé en base
**Résultat attendu:** 200 + {orderId}
**Résultat obtenu (simulé):** ✅ 200

**ID:** TC-PAY-002
**Fonctionnalité:** Paiement refusé
**Préconditions:** Cart actif
**Étapes:**
1. Confirmer avec carte test 4000 0000 0000 0002
**Résultat attendu:** 402 + verrou Redis libéré
**Résultat obtenu (simulé):** ✅ 402

**ID:** TC-PAY-003
**Fonctionnalité:** Webhook — signature invalide
**Préconditions:** Stripe configuré
**Étapes:**
1. POST /api/v1/payment/webhook sans signature valide
**Résultat attendu:** 400 + webhook rejeté
**Résultat obtenu (simulé):** ✅ 400

### Commit message
```
feat(payment): add Stripe payment intent, confirmation and webhook handler
```

---

## TASK-016 — Génération ticket + QR + PDF
**Status:** TODO
**Priorité:** CRITIQUE
**MoSCoW:** MUST HAVE — US-05
**Dépend de:** TASK-015
**Réf:** CLAUDE.md section 3.5

### Ce que l'agent doit faire
- Créer backend/src/utils/qrGenerator.js
- Créer backend/src/utils/pdfGenerator.js
- Créer backend/src/utils/blobStorage.js
- Créer backend/src/services/ticketService.js
  - Ordre strict des 7 étapes de CLAUDE.md section 3.5
- GET /api/v1/tickets/:id/pdf
- GET /api/v1/tickets/:id/qr

### Tests unitaires
- qrGenerator retourne string base64 valide
- pdfGenerator retourne buffer non vide
- ticketService suit l'ordre exact des 7 étapes
- Email envoyé après génération PDF

### Commit message
```
feat(ticket): add QR code generation, PDF creation and Azure Blob Storage upload
```

---

## TASK-017 — Historique commandes backend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-06
**Dépend de:** TASK-015

### Ce que l'agent doit faire
- Créer backend/src/services/orderService.js
  - getOrders(userId) → liste des commandes
  - getOrder(orderId, userId) → commande + tickets
- GET /api/v1/orders → historique utilisateur connecté
- GET /api/v1/orders/:id → Order + Tickets associés

### Tests intégration
- GET /orders retourne uniquement les commandes de l'utilisateur connecté
- GET /orders/:id retourne Order + Tickets
- GET /orders/:id d'un autre user → 403

### Commit message
```
feat(orders): add order history endpoints with tickets association
```

---

## TASK-018 — Plan de stade SVG frontend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-03
**Dépend de:** TASK-008
**Réf:** CLAUDE.md section 6 (SeatMap)

### Ce que l'agent doit faire
- Créer src/components/SeatMap.jsx
  - SVG interactif 800x600
  - Section A gold, B blue, C green
  - Siège dispo → cliquable, siège pris → opacity-30
  - Siège sélectionné → ring pulsant animé
  - Clic → appel POST /api/v1/cart
- Polling toutes les 10s pour rafraîchir statuts

### Tests composant
- Siège disponible cliquable
- Siège sold non cliquable
- Sélection déclenche création du panier

### Commit message
```
feat(ui): add interactive SVG seat map with real-time availability polling
```

---

## TASK-019 — CartTimer frontend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-03
**Dépend de:** TASK-014, TASK-018

### Ce que l'agent doit faire
- Créer src/components/CartTimer.jsx
  - Countdown MM:SS depuis expiresAt
  - Rouge sous 2min, pulse sous 1min
  - Expiration → vider store + redirection catalogue

### Tests composant
- Affiche le bon countdown
- Passe en rouge sous 2min
- Redirige à expiration

### Commit message
```
feat(ui): add cart countdown timer with expiration redirect and color warning
```

---

## TASK-020 — CheckoutPage frontend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-04
**Dépend de:** TASK-015, TASK-019
**Réf:** CLAUDE.md section 6 (PaymentForm)

### Ce que l'agent doit faire
- Créer src/pages/CheckoutPage.jsx
  - Récapitulatif commande
  - CartTimer intégré
  - Stripe Elements
  - Bouton CTA gold "Payer maintenant"
  - Redirection vers TicketPage si succès
- Créer src/services/paymentService.js

### Tests composant
- Récapitulatif correct
- CartTimer visible
- Stripe Elements chargé
- Redirection après succès

### Commit message
```
feat(ui): add CheckoutPage with Stripe Elements and cart summary
```

---

## TASK-021 — TicketPage + OrderHistoryPage frontend
**Status:** TODO
**Priorité:** HAUTE
**MoSCoW:** MUST HAVE — US-05, US-06
**Dépend de:** TASK-016, TASK-017, TASK-020
**Réf:** CLAUDE.md section 6 (TicketCard)

### Ce que l'agent doit faire
- Créer src/pages/TicketPage.jsx
  - TicketCard : gradient noir, border gold, QR fond blanc
  - Bouton télécharger PDF
- Créer src/pages/OrderHistoryPage.jsx
  - Liste des commandes avec lien vers TicketPage

### Tests composant
- TicketCard affiche QR code
- Bouton download déclenche téléchargement
- OrderHistory liste les bonnes commandes

### Commit message
```
feat(ui): add TicketPage with QR display, PDF download and OrderHistoryPage
```

---

## Récapitulatif Sprint 2

| Task | MoSCoW | US | Commit |
|---|---|---|---|
| TASK-013 | MUST | US-03 | feat(seat) |
| TASK-014 | MUST | US-03 | feat(cart) |
| TASK-015 | MUST | US-04 | feat(payment) |
| TASK-016 | MUST | US-05 | feat(ticket) |
| TASK-017 | MUST | US-06 | feat(orders) |
| TASK-018 | MUST | US-03 | feat(ui) |
| TASK-019 | MUST | US-03 | feat(ui) |
| TASK-020 | MUST | US-04 | feat(ui) |
| TASK-021 | MUST | US-05/06 | feat(ui) |

## Fonctionnalités critiques couvertes
- ✅ Fonctionnalité critique 2/3 : Réservation + verrou siège (TASK-013, 014)
- ✅ Fonctionnalité critique 3/3 : Paiement Stripe + génération billet (TASK-015, 016)
