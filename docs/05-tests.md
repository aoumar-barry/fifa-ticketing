# Module 5 — Tests

## 1. Plan de tests

Pour assurer la qualité de notre application, nous avons défini une stratégie de test centrée sur le backend, qui constitue la partie la plus critique de notre système. Nous avons choisi de combiner des tests unitaires pour valider la logique métier de chaque service, et des tests d'intégration pour vérifier le comportement réel de nos endpoints REST dans des conditions proches de la production.

Nous utilisons **Jest** comme framework principal, accompagné de **Supertest** pour simuler les appels HTTP, et de **mongodb-memory-server** pour disposer d'une base de données isolée pendant les tests. Le rapport de couverture est généré via **Istanbul**, intégré directement à Jest.

Notre cible de couverture est fixée à **70% minimum sur les modules critiques** (services, middlewares, modèles). Cette vérification est intégrée à notre workflow de développement et les résultats sont consultables via les logs de déploiement Render.

---

## 2. Cas de test — 3 fonctionnalités critiques

Nous avons choisi de couvrir formellement trois fonctionnalités que nous considérons comme les plus critiques de notre système : l'authentification, la réservation de sièges avec verrouillage distribué, et le paiement Stripe.

### Fonctionnalité 1 — Authentification

Notre système d'authentification est hybride : il supporte une connexion locale par email/password et une authentification via Firebase OAuth (Google). Nous avons testé les deux chemins ainsi que les cas d'erreur les plus courants.

| ID | Préconditions | Étapes | Résultat attendu | Résultat obtenu |
|---|---|---|---|---|
| TC-AUTH-001 | Aucun compte existant | POST /auth/register avec email + password | 201 + accessToken + cookie refreshToken | Conforme |
| TC-AUTH-002 | Utilisateur inscrit | POST /auth/login avec bonnes credentials | 200 + accessToken | Conforme |
| TC-AUTH-002b | Utilisateur inscrit | POST /auth/login avec mauvais password | 401 — identifiants invalides | Conforme |
| TC-AUTH-003 | Token Firebase valide | POST /auth/firebase | 200 + accessToken + compte lié | Conforme |
| TC-AUTH-004 | Aucune | Appel route protégée sans token JWT | 401 — token manquant | Conforme |
| TC-AUTH-005 | Utilisateur avec role user | Accès route admin | 403 — accès refusé | Conforme |

### Fonctionnalité 2 — Réservation et verrouillage de siège

Le mécanisme de verrouillage distribué via Render Redis est au cœur de notre système de réservation. Nous avons particulièrement soigné ces tests car un bug à ce niveau entraînerait directement du double-booking.

| ID | Préconditions | Étapes | Résultat attendu | Résultat obtenu |
|---|---|---|---|---|
| TC-SEAT-001 | Siège disponible, Redis connecté | lockSeat(seatId, userId) | true — clé Redis créée TTL 600s | Conforme |
| TC-SEAT-002 | Siège déjà verrouillé | lockSeat(seatId, userId2) | 409 — siège déjà pris | Conforme |
| TC-SEAT-003 | Siège verrouillé | unlockSeat(seatId) | Clé Redis supprimée | Conforme |
| TC-CART-001 | Utilisateur connecté, siège disponible | POST /cart {matchId, seatId} | 201 + cartId + expiresAt | Conforme |
| TC-CART-002 | Siège déjà locké par un autre user | POST /cart | 409 — siège indisponible | Conforme |
| TC-CART-003 | Cart actif existant | DELETE /cart/:id | 200 + verrou Redis libéré | Conforme |

### Fonctionnalité 3 — Paiement Stripe

Nous avons intégré Stripe en mode sandbox. Nos tests couvrent le flux complet depuis la création du Payment Intent jusqu'à la confirmation de commande, ainsi que les cas de rejet.

| ID | Préconditions | Étapes | Résultat attendu | Résultat obtenu |
|---|---|---|---|---|
| TC-PAY-001 | Cart actif, Stripe sandbox configuré | POST /payment/intent {cartId} | 200 + clientSecret | Conforme |
| TC-PAY-001b | Cart expiré ou confirmé | POST /payment/intent | 400 — panier inactif | Conforme |
| TC-PAY-001c | Cart appartenant à un autre utilisateur | POST /payment/intent | 403 — accès refusé | Conforme |
| TC-PAY-002 | Paiement confirmé côté Stripe | POST /payment/confirm | 200 + orderId + siège sold + Redis libéré | Conforme |
| TC-PAY-002b | Paiement refusé | Webhook payment_intent.payment_failed | Verrou libéré + Cart annulé | Partiel |
| TC-PAY-003 | Aucune | POST /payment/webhook sans signature Stripe | 400 — webhook rejeté | Conforme |

---

## 3. Rapport de couverture

Nous avons exécuté `npm test -- --coverage` sur notre backend le 22 mai 2026 et obtenons les résultats suivants :

| Module | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| src/models | 100% | 100% | 100% | 100% |
| src/routes | 100% | 100% | 100% | 100% |
| src/middlewares | 92.85% | 92.85% | 100% | 92.85% |
| src/services | 88.49% | 75.55% | 81.81% | 89.35% |
| src/controllers | 81.52% | 66.66% | 85.71% | 81.81% |
| src/utils | 82.08% | 65.21% | 88.88% | 82.81% |
| src/scripts | 89.04% | 46.15% | 60% | 88.57% |
| src/config | 75.55% | 64.15% | 63.15% | 81.48% |

Nous sommes globalement satisfaits de ces résultats. Les modules les plus critiques — modèles et routes — atteignent 100% sur tous les indicateurs. Nos services, qui portent l'essentiel de la logique métier, dépassent les 88% en statements, ce qui valide notre approche test-first sur les fonctionnalités critiques.

Concernant les zones moins bien couvertes, voici nos justifications :

- **src/config (branches 64%)** — certaines branches dépendent de variables d'environnement Render (Redis, MongoDB Atlas) qui ne peuvent pas être instanciées dans un environnement de test local.
- **src/scripts (branches 46%)** — le seed script contient des chemins d'erreur liés à la connexion base de données que nous n'avons pas jugé prioritaire de tester exhaustivement, leur impact sur la logique métier étant nul.
- **src/utils (branches 65%)** — nos utilitaires de génération PDF et d'écriture sur Render Disk font appel à des ressources d'infrastructure que nous avons partiellement mockées.
- **Routes tickets HTTP** — nous couvrons le service ticketService en unitaire mais pas encore les routes HTTP dédiées, qui seront complétées lors de l'implémentation de US-07.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
