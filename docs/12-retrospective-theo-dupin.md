# Analyse Rétrospective — Bilan Critique (Théo Dupin)

Ce document présente l'analyse rétrospective et le bilan critique individuel de l'expérience vécue par **Théo Dupin** lors du cycle de vie du projet **FIFA Ticketing Hub 2026** (Coupe du Monde de la FIFA 2026). Il est structuré autour des trois axes d'analyse exigés.

---

## 1. Ce qui a bien fonctionné

Plusieurs décisions techniques, outils et pratiques de développement ont eu un impact significativement positif sur le projet.

### 1.1 Choix techniques & Architecture
* **Le verrouillage distribué Redis (`NX EX`)** : L'implémentation du verrouillage temporaire des sièges via Render Redis (`SET seat:{id} userId NX EX 600`) a fonctionné de manière impeccable. Ce choix a résolu de manière élégante et performante le problème critique du double-booking. Le TTL natif de 10 minutes a simplifié la gestion de la durée de vie du panier sans nécessiter de mécanisme de nettoyage de type tâche planifiée (cron) ou `setTimeout` côté Node.js, ce qui aurait surchargé le serveur de processus instables.
* **L'Authentification Hybride (JWT local + Firebase OAuth)** : La combinaison d'une connexion locale par mot de passe (haché par bcrypt) et de Google OAuth via Firebase s'est avérée robuste. L'utilisation d'un cookie `refreshToken` en `httpOnly` couplé à un `accessToken` stocké uniquement en mémoire côté frontend a garanti un excellent niveau de sécurité contre les failles XSS et CSRF, tout en offrant une expérience utilisateur fluide (Google Sign-In).

### 1.2 Pratiques de Qualité & DevOps
* **La stratégie de test automatique (Jest & Supertest)** : La mise en place de tests d'intégration backend avec une base MongoDB en mémoire (`mongodb-memory-server`) a agi comme un filet de sécurité indispensable. Atteindre plus de 70% de couverture globale (et 100% sur les modèles et routes stratégiques) nous a permis d'effectuer des refactorings audacieux sans crainte de régression fonctionnelle.
* **L'automatisation du CI/CD et le GitFlow** : L'utilisation de GitHub Actions pour orchestrer l'intégration et le déploiement continus vers Render a éliminé le syndrome classique du "ça marche sur ma machine". La séparation stricte en branches (`main` pour la prod, `preprod` pour la validation, `develop` pour l'intégration, et `feature/*` pour le développement) a rendu les fusions transparentes et fiables.

---

## 2. Ce qui a moins bien fonctionné

L'analyse honnête et critique du projet met en lumière plusieurs difficultés, dettes techniques et erreurs d'estimation.

### 2.1 Difficultés techniques & Dette technique accumulée
* **L'intégration asynchrone des webhooks Stripe** : Si l'intégration du SDK Stripe côté frontend s'est déroulée rapidement, la gestion des webhooks backend a constitué un goulet d'étranglement majeur. La validation des signatures de requêtes Stripe, la capture du corps brut de la requête (`raw body` requis pour reconstruire l'événement) et l'orchestration des actions post-paiement (création de la commande permanente, génération du billet PDF, envoi d'email et libération du verrou Redis) se sont révélées beaucoup plus complexes que prévu. Cela a causé des retards significatifs en fin de Sprint 2.
* **Non-atomicité du flux de réservation (MongoDB)** : Notre implémentation actuelle souffre d'une dette technique critique (décrite dans le module maintenance). La création du document `Cart` et la mise à jour du statut du siège (`Seat`) dans MongoDB Atlas sont des opérations distinctes non transactionnelles. En cas de panne réseau ou de crash du serveur entre ces deux opérations, l'état de la base de données devient incohérent, ce qui nécessite une intervention manuelle d'administration.
* **Absence de protection par Rate Limiting** : Par manque de temps, le middleware `express-rate-limit` n'a pas été déployé en production. Nos routes sensibles (authentification, création de paniers) restent vulnérables à des attaques par force brute ou à du flood de requêtes automatisé par des robots d'achat, un risque inacceptable dans un contexte réel de billetterie FIFA.

### 2.2 Estimations erronées et gestion du scope
* **Planification trop optimiste des fonctionnalités secondaires** : Nous avons gravement sous-estimé l'effort de développement requis pour les écrans d'administration (US-07) et les tableaux de bord statistiques (US-12). En voulant concevoir une interface complexe inspirée de Vercel dès le départ, nous avons manqué de temps pour livrer ces fonctionnalités Must/Should Have du Sprint 3. La focalisation excessive sur le design visuel et le cœur de métier de l'acheteur a relégué l'administration au second plan, la laissant inachevée.

---

## 3. Ce que je ferais différemment

Si je devais recommencer ce projet aujourd'hui, j'adopterais d'autres choix techniques et méthodologiques dès la première semaine.

### 3.1 Choix techniques & Sécurité by Design
* **Transactions MongoDB ACID dès le départ** : J'encapsulerais systématiquement les flux sensibles (réservation, paiement) dans des sessions MongoDB (`startSession()`) dès le premier jour pour garantir que l'écriture du panier et la réservation du siège réussissent ou échouent ensemble, évitant ainsi la dette technique actuelle.
* **Rate Limiting et Sécurité en Sprint 1** : Au lieu de considérer la sécurité (rate limiting, validation stricte des entrées) comme une tâche de fin de projet (Module 7 - Maintenance), je l'intégrerais directement dans le squelette de l'application (Sprint 1) comme un prérequis non négociable.
* **Mocks Stripe locaux immédiats** : J'investirais du temps dès le début du Sprint 2 pour mettre en place un environnement de test local complet avec la Stripe CLI et des mocks de webhooks robustes. Cela nous aurait évité d'effectuer des tests manuels fastidieux sur l'URL de production pour valider les webhooks.

### 3.2 Gestion de projet & Pratiques d'équipe
* **Priorisation MoSCoW plus pragmatique** : Pour l'interface d'administration, j'opterais pour une stratégie MVP beaucoup plus stricte. Au lieu de planifier un dashboard sophistiqué avec des graphiques en frontend, j'implémenterais d'abord des scripts CLI d'administration ou une interface tabulaire ultra-simple, puis j'enrichirais le visuel uniquement en tâche de fond. Cela nous aurait permis de livrer l'US-07 (Must Have) dans les temps.
* **Pair Programming sur les modules complexes** : Nous avons travaillé de manière trop isolée sur nos branches de fonctionnalités respectives. Pour des sujets à forte technicité comme la gestion de la concurrence Redis ou la structure des tokens d'authentification hybrides, des sessions de pair-programming en temps réel auraient facilité le transfert de connaissances et résolu les blocages techniques bien plus rapidement que des revues de code asynchrones sur GitHub.

En conclusion, ce projet a démontré l'efficacité d'une stack moderne (React, Node, Redis) et d'un pipeline DevOps automatisé, tout en nous rappelant que la gestion de la concurrence, les transactions financières et la gestion rigoureuse du périmètre fonctionnel sont les véritables clés de la réussite d'un logiciel de production.

---

## 4. Utilisation de l'IA (Assistant de codage)

Conformément aux recommandations d'outillage, j'ai intégré des outils d'aide au codage assisté par IA (notamment Claude et Gemini) tout au long du cycle de vie du logiciel pour m'épauler dans mes tâches de développement et de documentation.

### 4.1 Modalités d'utilisation
L'usage des assistants de codage s'est articulé autour de quatre axes majeurs :
1. **Génération de code structurel (Boilerplate)** : Écriture rapide des modèles de données Mongoose (MongoDB Atlas), des squelettes de routes/contrôleurs Express et de la configuration des workflows de CI/CD de GitHub Actions pour Render.
2. **Rédaction de la suite de tests** : Conception de cas de tests unitaires et d'intégration Jest/Supertest, y compris pour les cas limites (mauvais mots de passe, tokens Firebase corrompus, verrous Redis expirés), facilitant grandement l'atteinte d'une couverture globale supérieure à 70%.
3. **Résolution de bugs complexes** : Diagnostic des incohérences de concurrence sur les verrous temporaires et assistance au traitement du corps brut (`raw body`) nécessaire à la validation des signatures Stripe.
4. **Rédaction documentaire** : Aide à la mise en forme de la matrice de traçabilité des exigences (RTM) et des plans de maintenance/décommission.

### 4.2 Impact sur le flux de travail
L'intégration de l'IA a profondément transformé mon efficacité opérationnelle :
- **Gain de temps significatif** : Les tâches répétitives ou de configuration (écriture de tests d'intégration similaires, fichiers de configuration YAML) ont été accélérées de plus de 50%, me permettant de me concentrer sur les problèmes complexes d'architecture et de logique métier.
- **Robustesse accrue** : L'IA m'a aidé à imaginer et tester des scénarios d'erreurs et des limites logiques critiques avant le déploiement sur Render, élevant le niveau de qualité globale de l'application.
- **Accélération de la montée en compétences** : Le diagnostic interactif et les explications pédagogiques des concepts complexes (webhooks asynchrones Stripe, cookies sécurisés httpOnly, jetons Firebase) ont éliminé la majorité des points de blocage technique.

En conclusion, l'IA a agi comme un accélérateur d'ingénierie et un assistant de pair-programming virtuel, améliorant ma vélocité de développement tout en assurant une meilleure traçabilité et une conformité plus stricte aux standards de gouvernance ALM du projet.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
