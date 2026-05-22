# Module 8 — Décommission

## 1. Inventaire des données

Notre système traite les catégories de données personnelles suivantes :

- Données d'identité (nom, prénom, email, téléphone) — stockées dans MongoDB Atlas — conservation 30 jours après clôture du compte
- Données d'authentification (hash mot de passe, tokens Firebase, refresh tokens JWT) — stockées dans MongoDB Atlas et Firebase — suppression immédiate à la clôture
- Données de transactions (historique commandes, montants, identifiants Stripe) — stockées dans MongoDB Atlas — conservation 10 ans (obligation légale comptable)
- Billets PDF et QR codes — stockés sur Render Disk — archivage 5 ans après l'événement
- Logs applicatifs — stockés sur Render — conservation 30 jours (politique Render)

---

## 2. Procédure de suppression et d'anonymisation

### Droit à l'effacement

Lors d'une demande de suppression, nous appliquons les opérations suivantes dans un délai maximum de 30 jours :

- Suppression du document User dans MongoDB Atlas
- Anonymisation des documents Order et Ticket associés (remplacement des champs personnels par `utilisateur_supprime`, conservation des données financières pour obligations légales)
- Révocation des tokens Firebase via la console Firebase Authentication
- Suppression des billets PDF sur Render Disk pour les événements passés
- Envoi d'un email de confirmation à l'utilisateur

### Droit à la portabilité

Sur demande, nous générons un export JSON contenant les données personnelles, l'historique de commandes et les billets de l'utilisateur, transmis par email sécurisé sous 30 jours.

---

## 3. Révocation des accès

Lors de la décommission, nous procédons dans l'ordre suivant :

- Désactivation de tous les comptes via le flag `isActive: false` dans MongoDB Atlas
- Révocation de tous les utilisateurs Firebase via l'API d'administration Firebase
- Désactivation des clés Stripe et suppression des endpoints webhook depuis le dashboard Stripe
- Désactivation du projet Firebase depuis la console Google Cloud
- Fermeture du cluster MongoDB Atlas et révocation des utilisateurs de base de données
- Suppression des variables d'environnement et des services depuis le dashboard Render
- Les certificats SSL/TLS sont révoqués automatiquement par Render à la suppression des services

---

## 4. Archivage légal

Les données financières (commandes, montants, identifiants Stripe) sont conservées 10 ans conformément à l'article L123-22 du Code de commerce. Avant la suppression du cluster MongoDB Atlas, ces données sont exportées au format JSON, chiffrées et archivées sur un support sécurisé externe. Stripe assure de son côté la conservation des preuves de paiement conformément aux obligations PCI-DSS. Les logs de sécurité sont archivés pendant 1 an conformément aux recommandations de la CNIL.

---

## 5. Communication

La décommission est communiquée en trois temps :

- 3 mois avant : email à tous les utilisateurs informant de la fermeture, de la date limite de téléchargement des billets et des modalités d'export des données
- 1 mois avant : rappel aux utilisateurs n'ayant pas encore agi, message sur la page d'accueil de l'application
- À la date de décommission : email de confirmation de fermeture avec les coordonnées du responsable de traitement pour toute demande ultérieure

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
