# Module 7 — Maintenance

## 1. Catalogue des incidents

### Incident 1 — Indisponibilité du service backend

**Description :** Le service backend Node.js hébergé sur Render devient inaccessible, empêchant toute interaction avec l'API.

**Criticité :** Critique

**Procédure de détection :**
- L'alerte Render Dashboard se déclenche lorsque le health check sur `/health` échoue pendant plus de 2 minutes consécutives
- Les logs Render affichent des erreurs de type `Service unavailable` ou `Build failed`

**Procédure de résolution :**
- Vérifier les logs de déploiement sur le Render Dashboard pour identifier la cause
- Si le dernier déploiement est en cause, effectuer un rollback vers la version précédente via la section Events de Render
- Si le problème est lié à MongoDB Atlas ou Render Redis, vérifier l'état des services dans leurs dashboards respectifs
- Redémarrer manuellement le service si nécessaire depuis le Render Dashboard

**RTO cible :** 15 minutes

---

### Incident 2 — Expiration des sièges non libérés

**Description :** Des sièges restent bloqués dans Render Redis après l'expiration du panier, empêchant d'autres utilisateurs de les réserver.

**Criticité :** Élevée

**Procédure de détection :**
- Surveillance des métriques Redis pour détecter une accumulation anormale de clés `seat:*` sans décrémentation
- Remontée d'alertes utilisateurs signalant des sièges indisponibles malgré l'absence de réservation active

**Procédure de résolution :**
- Vérifier les clés Redis via la console Render Redis et identifier les clés orphelines
- Forcer la suppression des clés bloquées via la commande `DEL seat:{id}`
- Vérifier la configuration du TTL (600 secondes) dans le code du `seatLockService`
- Redéployer si le bug est confirmé dans le code

**RTO cible :** 30 minutes

---

### Incident 3 — Échec de génération des billets PDF

**Description :** Après confirmation du paiement, les billets PDF ne sont pas générés ou ne sont pas accessibles via Render Disk.

**Criticité :** Élevée

**Procédure de détection :**
- Les logs applicatifs affichent des erreurs dans `pdfGenerator.js` ou `ticketService.js`
- Les utilisateurs signalent l'absence de lien de téléchargement après paiement

**Procédure de résolution :**
- Vérifier que le Render Disk est correctement monté sur le Web Service
- Vérifier les permissions d'écriture sur le répertoire `/var/data/tickets`
- Rejouer manuellement la génération du billet pour les commandes affectées via un script de récupération
- Notifier les utilisateurs concernés par email

**RTO cible :** 45 minutes

---

### Incident 4 — Défaillance de l'authentification Firebase

**Description :** L'authentification via Google OAuth (Firebase) devient indisponible, empêchant les utilisateurs de se connecter via ce canal.

**Criticité :** Moyenne

**Procédure de détection :**
- Les logs backend affichent des erreurs `Firebase ID token verification failed`
- Les utilisateurs signalent l'impossibilité de se connecter via Google

**Procédure de résolution :**
- Vérifier l'état du service Firebase sur le tableau de bord Google Cloud Console
- Vérifier que les variables d'environnement Firebase sont correctement configurées sur Render
- En cas de panne Firebase prolongée, rediriger les utilisateurs vers la connexion locale email/password
- Monitorer la résolution de l'incident côté Firebase

**RTO cible :** 60 minutes (dépend de Firebase)

---

### Incident 5 — Saturation de MongoDB Atlas

**Description :** La base de données MongoDB Atlas atteint ses limites de connexions ou de stockage, dégradant les performances de l'ensemble du système.

**Criticité :** Critique

**Procédure de détection :**
- Les logs backend affichent des erreurs `MongoNetworkError` ou `connection pool exhausted`
- Le temps de réponse de l'API dépasse le seuil d'alerte de 500ms

**Procédure de résolution :**
- Vérifier les métriques de connexion sur le dashboard MongoDB Atlas
- Identifier les requêtes lentes via le Performance Advisor d'Atlas
- Augmenter le pool de connexions Mongoose si nécessaire
- Ajouter les index manquants identifiés par le Performance Advisor
- En dernier recours, upgrader le cluster Atlas

**RTO cible :** 30 minutes

---

## 2. Gestion de la dette technique

### Dette 1 — Rate limiting absent

**Description :** Les routes sensibles de notre API, notamment les endpoints de connexion et de réservation, ne disposent d'aucune protection contre les attaques par force brute ou le flood de requêtes. Un utilisateur malveillant peut envoyer un nombre illimité de requêtes sans contrainte.

**Impact estimé :** En cas d'attaque, les routes de réservation peuvent être saturées, rendant le service indisponible pour les utilisateurs légitimes lors des pics de vente. Cela représente un risque direct sur la disponibilité du système.

**Plan de remédiation :** Intégrer le middleware `express-rate-limit` sur les routes critiques avec des seuils adaptés à chaque endpoint. Par exemple, limiter les tentatives de connexion à 10 requêtes par minute par IP, et les créations de panier à 5 par minute par utilisateur authentifié.

---

### Dette 2 — Absence de transaction MongoDB atomique sur le flux de réservation

**Description :** Dans notre implémentation actuelle, la création du Cart et la mise à jour du statut du siège sont deux opérations séparées sur MongoDB Atlas. En cas de crash serveur ou de coupure réseau entre ces deux opérations, on peut se retrouver avec un siège verrouillé dans Redis mais dont le statut en base n'a pas été mis à jour, créant une incohérence persistante entre les deux sources de vérité.

**Impact estimé :** Sur un volume important de transactions simultanées, ce risque d'incohérence peut entraîner des sièges définitivement indisponibles sans commande associée, nécessitant une intervention manuelle en base de données.

**Plan de remédiation :** Encapsuler les opérations de création de Cart et de mise à jour du statut du siège dans une session MongoDB avec `startSession()` et `withTransaction()`, garantissant le principe ACID sur l'ensemble du flux de réservation.

---

### Dette 3 — Refresh token non révocable

**Description :** Les refresh tokens JWT sont générés et envoyés en cookie httpOnly mais ne sont pas stockés en base de données. En cas de vol d'un refresh token, il est impossible de l'invalider avant son expiration naturelle fixée à 7 jours, laissant une fenêtre d'attaque ouverte.

**Impact estimé :** Un attaquant ayant obtenu un refresh token valide dispose d'un accès non révocable au compte pendant 7 jours, avec la capacité de générer de nouveaux access tokens à volonté.

**Plan de remédiation :** Implémenter une liste blanche de refresh tokens valides en base de données. Chaque token est stocké avec son userId, sa date d'expiration et un indicateur de révocation. Lors de la vérification d'un refresh token, on vérifie son existence en base avant de générer un nouvel access token. Le logout supprime le token de la liste blanche.

---

## 3. SLO — Service Level Objectives

### SLO 1 — Disponibilité

**Indicateur :** Pourcentage de temps pendant lequel l'application répond correctement aux requêtes HTTP.

**Seuil cible :** Disponibilité supérieure à 99% sur une fenêtre glissante de 30 jours.

**Mesure :** Health check automatique Render sur l'endpoint `/health` toutes les 30 secondes.

**Action en cas de violation :** Alerte immédiate sur le Render Dashboard, investigation des logs, rollback si la cause est un déploiement récent.

---

### SLO 2 — Latence

**Indicateur :** Temps de réponse au 95ème percentile des requêtes API.

**Seuil cible :** Temps de réponse inférieur à 500ms pour 95% des requêtes sur une fenêtre de 5 minutes.

**Mesure :** Métriques de latence du Render Dashboard.

**Action en cas de violation :** Analyse des requêtes lentes via les logs applicatifs, vérification des index MongoDB Atlas via le Performance Advisor, investigation de la charge sur Render Redis.

---

### SLO 3 — Taux d'erreur

**Indicateur :** Pourcentage de requêtes HTTP retournant un code d'erreur 5xx.

**Seuil cible :** Taux d'erreur inférieur à 1% sur une fenêtre de 5 minutes.

**Mesure :** Métriques d'erreur du Render Dashboard.

**Action en cas de violation :** Alerte immédiate, analyse des logs d'erreur, identification du composant défaillant (MongoDB Atlas, Render Redis, Firebase), rollback si la cause est un déploiement récent.

---

## 4. Mises à jour automatiques des dépendances

Nous prévoyons de mettre en place Dependabot sur notre dépôt GitHub pour automatiser la surveillance et la mise à jour de nos dépendances npm côté backend et frontend.

Dependabot analysera hebdomadairement les fichiers `package.json` de chaque service et ouvrira automatiquement des pull requests lorsqu'une nouvelle version d'une dépendance est disponible. Les patches de sécurité seront traités en priorité. Chaque pull request générée par Dependabot déclenchera notre pipeline de tests avant d'être mergée, garantissant qu'aucune mise à jour ne casse le comportement existant.

La configuration sera placée dans le fichier `.github/dependabot.yml` à la racine du dépôt avec une vérification hebdomadaire pour les dépendances npm du backend et du frontend.

Un exemple de pull request générée automatiquement par Dependabot sera ajouté dans ce document dès la configuration effective de l'outil. Il sera disponible dans `/docs/assets/dependabot-pr.png`.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
