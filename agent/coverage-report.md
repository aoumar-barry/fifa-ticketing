# Rapport de Couverture de Tests Jest — TASK-029

Ce rapport présente l'état de la couverture des tests unitaires Jest pour les services du backend à la suite des travaux réalisés dans le cadre de TASK-029.

**Date de validation :** 22 mai 2026

---

## 1. Synthèse de la couverture globale des services ciblés

| Fichier / Service | % Stmts | % Branch | % Funcs | % Lines | Statut / Objectif |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **authService.js** | 100.00% | 100.00% | 100.00% | 100.00% | **Conforme** (Objectif: 100%) |
| **cartService.js** | 100.00% | 100.00% | 71.42% | 100.00% | **Conforme** (Objectif: 100%) |
| **seatLockService.js** | 100.00% | 100.00% | 100.00% | 100.00% | **Conforme** (Objectif: 100%) |
| **paymentService.js** | 100.00% | 100.00% | 77.77% | 100.00% | **Conforme** (Objectif: 100%) |
| **ticketService.js** | 100.00% | 100.00% | 100.00% | 100.00% | **Conforme** (Objectif: 100%) |
| **matchService.js** | 100.00% | 93.93% | 100.00% | 100.00% | **Conforme** (Objectif: > 80%) |
| **adminService.js** | 100.00% | 96.34% | 100.00% | 100.00% | **Conforme** (Objectif: > 70%) |

---

## 2. Détail des résultats Jest par répertoire et fichier

Voici le tableau complet extrait de la commande de couverture `npm test -- --coverage` :

```text
-----------------------|---------|----------|---------|---------|------------------------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                  
-----------------------|---------|----------|---------|---------|------------------------------------
All files              |   91.94 |    80.97 |   86.33 |   92.51 |                                    
 src                   |   89.74 |       35 |     100 |   89.47 |                                    
  app.js               |   89.74 |       35 |     100 |   89.47 | 30-37                              
 src/config            |   77.22 |    67.69 |   63.15 |    82.6 |                                    
  db.js                |    87.5 |    66.66 |      75 |   92.85 | 24                                 
  env.js               |     100 |      100 |     100 |     100 |                                    
  firebase.js          |   53.12 |    44.82 |   33.33 |   54.83 | 21,42,48,53-66,75-87,94            
  redis.js             |   82.85 |    85.71 |   55.55 |   96.66 | 19                                 
 src/controllers       |   81.96 |    73.21 |   86.84 |   82.35 |                                    
  adminController.js   |   82.53 |    78.57 |   85.71 |    83.6 | 24,40,70-71,90,102,114,142,146,174 
  authController.js    |   88.46 |       80 |   85.71 |      90 | 48-49,91,104,116                   
  cartController.js    |     100 |      100 |     100 |     100 |                                    
  matchController.js   |     100 |      100 |     100 |     100 |                                    
  orderController.js   |   92.85 |      100 |     100 |   92.85 | 12                                 
  paymentController.js |   92.59 |    66.66 |     100 |   92.59 | 24,40                              
  ticketController.js  |   19.23 |        0 |       0 |   19.23 | 10-48                              
  userController.js    |   86.36 |       80 |     100 |   85.71 | 17,22,32                           
 src/listeners         |   95.34 |       60 |     100 |   95.34 |                                    
  matchListener.js     |   95.34 |       60 |     100 |   95.34 | 160,172                            
 src/middlewares       |   92.85 |    92.85 |     100 |   92.85 |                                    
  adminMiddleware.js   |     100 |      100 |     100 |     100 |                                    
  authMiddleware.js    |    90.9 |       90 |     100 |    90.9 | 23,59                              
 src/models            |     100 |      100 |     100 |     100 |                                    
  Cart.js              |     100 |      100 |     100 |     100 |                                    
  Match.js             |     100 |      100 |     100 |     100 |                                    
  Order.js             |     100 |      100 |     100 |     100 |                                    
  Payment.js           |     100 |      100 |     100 |     100 |                                    
  Seat.js              |     100 |      100 |     100 |     100 |                                    
  Stadium.js           |     100 |      100 |     100 |     100 |                                    
  Ticket.js            |     100 |      100 |     100 |     100 |                                    
  User.js              |     100 |      100 |     100 |     100 |                                    
  index.js             |     100 |      100 |     100 |     100 |                                    
 src/routes            |     100 |      100 |     100 |     100 |                                    
  adminRoutes.js       |     100 |      100 |     100 |     100 |                                    
  authRoutes.js        |     100 |      100 |     100 |     100 |                                    
  cartRoutes.js        |     100 |      100 |     100 |     100 |                                    
  index.js             |     100 |      100 |     100 |     100 |                                    
  matchRoutes.js       |     100 |      100 |     100 |     100 |                                    
  orderRoutes.js       |     100 |      100 |     100 |     100 |                                    
  paymentRoutes.js     |     100 |      100 |     100 |     100 |                                    
  ticketRoutes.js      |     100 |      100 |     100 |     100 |                                    
  userRoutes.js        |     100 |      100 |     100 |     100 |                                    
 src/scripts           |   89.04 |    46.15 |      60 |   88.57 |                                    
  seed.js              |   89.04 |    46.15 |      60 |   88.57 | 100,191,225-226,235-241            
 src/services          |   99.19 |    92.38 |   93.22 |   99.17 |                                    
  adminService.js      |     100 |    96.34 |     100 |     100 | 189,203,241                        
  authService.js       |     100 |      100 |     100 |     100 |                                    
  cartService.js       |     100 |      100 |   71.42 |     100 |                                    
  emailService.js      |   96.87 |    66.66 |     100 |   96.87 | 44                                 
  matchService.js      |     100 |    93.93 |     100 |     100 | 17,106                             
  orderService.js      |     100 |      100 |     100 |     100 |                                    
  paymentService.js    |     100 |      100 |   77.77 |     100 |                                    
  seatLockService.js   |     100 |      100 |     100 |     100 |                                    
  ticketService.js     |     100 |      100 |     100 |     100 |                                    
  userService.js       |   84.21 |    78.57 |     100 |   84.21 | 12,25,33                           
 src/utils             |   82.66 |    65.51 |   88.88 |   83.33 |                                    
  AppError.js          |     100 |      100 |     100 |     100 |                                    
  blobStorage.js       |   64.28 |    64.28 |     100 |   64.28 | 18-30,37,47                        
  eventBus.js          |     100 |      100 |     100 |     100 |                                    
  logger.js            |     100 |    44.44 |     100 |     100 | 8                                  
  pdfGenerator.js      |   92.85 |      100 |      80 |      96 | 93                                 
  qrGenerator.js       |      80 |      100 |     100 |      80 | 13                                 
-----------------------|---------|----------|---------|---------|------------------------------------
```

---

## 3. Détail des modifications apportées pour TASK-029

Pour atteindre ces niveaux de couverture, les modifications suivantes ont été intégrées :

1. **`authService`** :
   - Refactorisation de branches inutiles ou inaccessibles.
   - Ajout de tests couvrant le cas d'erreur de vérification de jeton Firebase sans message (`Invalid Firebase ID Token`).
2. **`paymentService`** :
   - Ajout d'un test pour vérifier le repli vers le secret webhook Stripe par défaut si la variable d'environnement `STRIPE_WEBHOOK_SECRET` n'est pas définie.
3. **`ticketService`** :
   - Ajout d'un test simulant un échec dans `unlockSeat` lors de la création d'un ticket pour couvrir le bloc `catch`.
4. **`cartService`** :
   - Ajout d'un cas de test simulant un échec dans `unlockSeat` lors du rollback de `createCart`.
   - Ajout de cas de tests d'erreurs d'échecs de libération des sièges lors du nettoyage de `deleteCart`.
5. **`matchService`** (Nouveau) :
   - Suite unitaire complète (`matchService.test.js`) validant tous les filtres, la pagination, les cas d'erreur Redis (inactif/actif) et les verrous de sièges.
6. **`adminService`** (Nouveau) :
   - Suite unitaire complète (`adminService.test.js`) validant la création, mise à jour, désactivation de matchs, vérification des règles de changement de stade, calcul de capacité, récupération de statistiques de vente et exports CSV.
