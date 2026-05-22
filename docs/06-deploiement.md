# Module 6 — Déploiement & DevOps

## 1. Application en production

Notre application est accessible publiquement à l'adresse suivante : [https://fifa-ticketing.onrender.com](https://fifa-ticketing.onrender.com)

Nous avons choisi Render comme plateforme de déploiement pour sa simplicité de configuration, son intégration native avec GitHub et la qualité de ses services managés (Redis, Disk, Static Sites). L'ensemble de notre infrastructure est hébergé sur Render, à l'exception de la base de données qui repose sur MongoDB Atlas.

---

## 2. Pipeline CI/CD

Nous utilisons le déploiement automatique natif de Render, déclenché à chaque push sur les branches `preprod` et `main` selon l'environnement cible. Notre stratégie de branches est organisée de la manière suivante :

- `main` correspond à l'environnement de production, accessible publiquement
- `preprod` correspond à l'environnement de pré-production, utilisé pour la validation avant mise en prod
- `develop` est la branche d'intégration des fonctionnalités en cours de développement
- `feature/*` regroupe les branches de développement des fonctionnalités individuelles
- `hotfix/*` est réservé aux correctifs urgents à appliquer directement en production

Le flux standard de mise en production que nous suivons est le suivant. Le développeur crée une branche `feature/*` depuis `develop`, code la fonctionnalité, puis ouvre une pull request vers `develop` qui fait l'objet d'une revue par un autre membre de l'équipe. Lorsqu'un ensemble cohérent de fonctionnalités est prêt, nous ouvrons une pull request de `develop` vers `preprod`, ce qui déclenche automatiquement le déploiement sur l'environnement de pré-production. Après validation sur preprod, nous ouvrons une pull request de `preprod` vers `main`, qui déclenche le déploiement en production. En cas de correctif urgent, une branche `hotfix/*` est créée directement depuis `main`, puis mergée sur `main` avant d'être reportée sur `develop` et `preprod` pour maintenir la synchronisation des branches.

Lorsqu'un push est effectué sur `main` ou `preprod`, Render déclenche automatiquement les étapes suivantes :

- Détection du push via webhook GitHub
- Installation des dépendances avec `npm ci`
- Build de l'application
- Health check pour vérifier que le service répond correctement
- Basculement du trafic vers la nouvelle version si le health check est validé
- Maintien de la version précédente en cas d'échec

---

## 3. Stratégie de déploiement

Nous avons retenu la stratégie Rolling Update, nativement supportée par Render.

Le Rolling Update est adapté à notre contexte pour plusieurs raisons. Il ne nécessite pas d'infrastructure supplémentaire contrairement au Blue/Green qui requiert deux environnements complets en parallèle. Il garantit une disponibilité continue pendant le déploiement, sans interruption de service pour les utilisateurs. Enfin, il est entièrement géré par Render sans configuration manuelle de notre part, ce qui correspond bien à notre contrainte de temps.

Lorsque nous mergeons sur `main`, Render détecte le push, lance le build de la nouvelle version, effectue un health check sur notre endpoint `/health`, puis bascule progressivement le trafic si tout est nominal. En cas d'échec du health check, la version précédente est automatiquement maintenue.

En cas d'incident après déploiement, notre procédure de rollback est la suivante :

- Accéder au Render Dashboard
- Naviguer vers la section Events du service concerné
- Sélectionner le déploiement précédent
- Cliquer sur Redeploy

Le rollback est effectif en moins de 2 minutes sur Render.

---

## 4. Monitoring

Nous utilisons le Render Dashboard comme solution de monitoring principal, complété par les logs applicatifs de notre backend Node.js.

Les métriques que nous surveillons sont les suivantes :

- La disponibilité du service, avec un seuil d'alerte en dessous de 99%
- Le temps de réponse de l'API, avec un seuil d'alerte au-dessus de 500ms
- Le taux d'erreur HTTP, avec un seuil d'alerte au-dessus de 1%
- L'utilisation mémoire du Web Service, avec un seuil d'alerte au-dessus de 80%

Le screenshot du Render Dashboard sera ajouté dans ce document après la première mise en production complète. Il sera disponible dans `/docs/assets/render-dashboard.png`.

Nous avons configuré une alerte basée sur l'hypothèse de trafic suivante : lors de l'ouverture des ventes pour un match populaire, nous estimons un pic de 500 requêtes simultanées sur les routes de réservation. L'alerte se déclenche si le temps de réponse moyen dépasse 500ms sur une fenêtre de 5 minutes, ce qui signale une dégradation du service nécessitant une intervention immédiate.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
