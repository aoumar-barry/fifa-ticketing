# Module 10 — Traçabilité des exigences (RTM)

## 1. Matrice de traçabilité complète

La matrice ci-dessous couvre l'ensemble des user stories du backlog et permet de vérifier pour chaque exigence qu'elle est conçue, testée et livrée.

| ID | Intitulé | Composant de conception | Cas de test | Sprint | Statut |
|---|---|---|---|---|---|
| US-01 | Inscription et connexion (local + Google OAuth) | authService, authController, authRoutes, LoginPage, RegisterPage, Firebase | TC-AUTH-001, TC-AUTH-002, TC-AUTH-002b, TC-AUTH-003, TC-AUTH-004, TC-AUTH-005 | Sprint 1 | Livré |
| US-02 | Consultation catalogue matchs | matchService, matchController, matchRoutes, CataloguePage, MatchCard | Intégration match.test.js | Sprint 1 | Livré |
| US-03 | Réservation billet + verrou siège 10 min | cartService, seatLockService, cartController, cartRoutes, SeatMap, CartTimer | TC-SEAT-001, TC-SEAT-002, TC-SEAT-003, TC-CART-001, TC-CART-002, TC-CART-003 | Sprint 2 | Livré |
| US-04 | Paiement en ligne Stripe | paymentService, paymentController, paymentRoutes, CheckoutPage | TC-PAY-001, TC-PAY-001b, TC-PAY-001c, TC-PAY-002, TC-PAY-003 | Sprint 2 | Livré |
| US-05 | Génération et téléchargement billet + QR code | ticketService, qrGenerator, pdfGenerator, Render Disk, TicketPage | ticketService.test.js | Sprint 2 | Livré |
| US-06 | Historique des commandes | orderService, orderController, orderRoutes, OrderHistoryPage | order.test.js | Sprint 2 | Livré |
| US-07 | Interface admin gestion matchs | adminService, adminController, adminRoutes, DashboardPage | Non couvert | Sprint 3 | Non livré |
| US-08 | Filtres catalogue avancés | matchService, CataloguePage | match.test.js (filtres) | Sprint 3 | Livré |
| US-09 | Email confirmation paiement | ticketService, emailSender | Non couvert | Sprint 3 | Partiel |
| US-10 | Annulation panier | cartService, cartRoutes | TC-CART-003 | Sprint 2 | Livré |
| US-11 | Modification profil utilisateur | userService, ProfilePage | Non couvert | Sprint 3 | Non livré |
| US-12 | Dashboard statistiques admin | adminService, DashboardPage | Non couvert | Sprint 3 | Non livré |
| US-13 | Plan de stade SVG interactif | SeatMap (SVG) | SeatMap.test.jsx | Sprint 3 | Livré |
| US-14 | Ajout de plusieurs billets au panier | cartService, cartController | Non couvert | Sprint 3 | Non livré |
| US-16 | Export CSV données ventes | adminService | Non couvert | Sprint 3 | Non livré |
| US-17 | Notifications email modification match | eventBus, matchListener, emailSender | Non couvert | Sprint 3 | Non livré |
| US-18 | Revente billet P2P | Hors périmètre | Hors périmètre | Hors périmètre | Won't Have |
| US-19 | Chat en direct | Hors périmètre | Hors périmètre | Hors périmètre | Won't Have |
| US-20 | Annulation commande confirmée | orderService, orderController | Non couvert | Sprint 3 | Non livré |

---

## 2. Synthèse de la couverture

### Exigences livrées

Parmi les 7 user stories Must Have, 6 ont été livrées et testées à ce stade du projet. US-01 (Authentification), US-02 (Catalogue), US-03 (Réservation), US-04 (Paiement), US-05 (Billet PDF) et US-06 (Historique) sont entièrement couvertes en conception, en test et en livraison. US-03 bénéficie d'une couverture de test particulièrement complète avec 7 cas de test formels couvrant les scénarios nominaux et d'erreur du verrou distribué Redis.

Parmi les Should Have, US-08 (Filtres catalogue) et US-10 (Annulation panier) ont été livrées. US-13 (Plan de stade SVG) classée Could Have a également été implémentée.

### Exigences non couvertes

US-07 (Interface admin) n'a pas encore été implémentée par manque de temps. Elle constitue la dernière Must Have restante et sera livrée en priorité si le temps le permet avant la remise finale.

US-09 (Email confirmation) est partiellement couverte. L'envoi d'email est intégré dans le flux de génération de billet mais le cas de test formel n'a pas encore été rédigé.

US-11 (Profil utilisateur), US-12 (Dashboard stats), US-14 (Multi-billets), US-16 (Export CSV), US-17 (Notifications) et US-20 (Annulation commande) sont des Should Have et Could Have qui n'ont pas été implémentées dans le temps imparti. Ces fonctionnalités ne remettent pas en cause la valeur du système qui reste pleinement fonctionnel sur son cœur métier.

US-18 et US-19 sont explicitement hors périmètre et ne seront pas implémentées.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
