# Module 11 — Outillage ALM et Recommandation

Ce document présente une évaluation comparative de trois suites d'outils ALM (Application Lifecycle Management) majeures du marché et formalise la recommandation finale pour la gouvernance et le pilotage du projet **FIFA Ticketing Hub 2026**.

---

## 1. Grille de critères d'évaluation

Pour évaluer la pertinence d'une suite ALM par rapport aux contraintes spécifiques de notre projet, nous avons défini **8 critères d'évaluation clés** :

1. **Agilité & Gestion du Backlog (C-01)** : Capacité à modéliser le backlog produit, planifier les sprints (sprints de 2 semaines), suivre l'avancement via des tableaux Kanban/Scrum, et générer des indicateurs de vélocité ou burndown charts.
2. **Intégration CI/CD (C-02)** : Automatisation native des pipelines d'intégration et de déploiement continus (tests Jest automatisés, build de l'application, et déploiements vers Render) déclenchés à chaque push.
3. **Traçabilité des exigences (C-03)** : Facilité de liaison bidirectionnelle entre une exigence fonctionnelle (User Story), sa tâche technique (Issue), son implémentation de code (Commits, Branches), sa revue de code (Pull/Merge Requests) et ses cas de tests associés.
4. **Ergonomie & Courbe d'apprentissage (C-04)** : Vitesse de prise en main par l'équipe, clarté de l'interface utilisateur, simplicité d'utilisation quotidienne et temps requis pour la configuration initiale de l'outil.
5. **Coût & Modèle de licences (C-05)** : Accessibilité financière pour une équipe de 3 ingénieurs dans un cadre académique (recherche de la gratuité ou d'un coût très bas pour les fonctionnalités professionnelles indispensables).
6. **Documentation & Gestion des connaissances (C-06)** : Capacité à intégrer un espace Wiki ou une base documentaire collaborative afin de stocker les livrables du cycle de vie du projet (cadrage, conception, maintenance) de manière structurée et liée au backlog.
7. **Gestion de version & Collaboration sur le code (C-07)** : Performance de l'hébergement Git natif, des outils de revue de code (diffs visuels, commentaires en ligne, règles d'approbation) et de la collaboration générale.
8. **DevSecOps & Qualité (C-08)** : Intégration d'outils de sécurité natifs (analyse statique de code SAST, détection automatique de fuites de secrets, dépendance automatique avec des outils comme Dependabot).

---

## 2. Comparatif des 3 suites ALM du marché

Nous avons sélectionné 3 suites ALM représentatives pour notre projet :
- **Suite A : GitHub Ecosystem** (GitHub Projects, GitHub Actions, GitHub Issues, Dependabot)
- **Suite B : GitLab Ultimate** (GitLab Issues & Boards, GitLab CI/CD, GitLab Wiki)
- **Suite C : Atlassian Suite** (Jira Software, Confluence, Bitbucket & Pipelines)

Chaque critère est noté sur **5 points** (1 = Très insuffisant, 5 = Excellent).

### Tableau comparatif

| Critère d'évaluation | GitHub Ecosystem | GitLab Ultimate | Atlassian Suite (Jira/Confluence) |
|---|:---:|:---:|:---:|
| **C-01 : Agilité & Backlog** | 3.5 / 5 | 4.0 / 5 | **5.0 / 5** |
| **C-02 : Intégration CI/CD** | 4.5 / 5 | **5.0 / 5** | 3.5 / 5 |
| **C-03 : Traçabilité** | **4.5 / 5** | **4.5 / 5** | 4.0 / 5 |
| **C-04 : Ergonomie & Onboarding** | **5.0 / 5** | 3.5 / 5 | 2.0 / 5 |
| **C-05 : Coût & Licences** | **5.0 / 5** | 3.0 / 5 | 2.5 / 5 |
| **C-06 : Documentation / Wiki** | 3.0 / 5 | 4.0 / 5 | **5.0 / 5** |
| **C-07 : Gestion de version** | **5.0 / 5** | 4.5 / 5 | 4.0 / 5 |
| **C-08 : DevSecOps & Sécurité** | 4.5 / 5 | **5.0 / 5** | 3.0 / 5 |
| **Note Globale (Total / 40)** | **35.0 / 40** (8.75/10) | **33.5 / 40** (8.38/10) | **29.0 / 40** (7.25/10) |

---

### Analyse détaillée par suite ALM

#### 1. GitHub Ecosystem (Note : 35.0/40)
* **Forces** : Interface de développement extrêmement populaire réduisant la courbe d'apprentissage à zéro. La gestion du backlog avec **GitHub Projects** est simple, fluide et visuelle. **GitHub Actions** fournit un système de CI/CD déclaratif puissant sous forme de workflows YAML avec un catalogue communautaire gigantesque. La traçabilité est native et transparente : il suffit de lier une Issue à une Pull Request, et d'utiliser des mots-clés (`closes #12`) pour automatiser les transitions d'état. **Dependabot** est intégré gratuitement pour gérer les vulnérabilités de dépendances npm (backend/frontend). Le modèle est entièrement gratuit pour les équipes étudiantes.
* **Faiblesses** : Les métriques agiles avancées (diagrammes de flux cumulés, burndown charts natifs complexes) et le Wiki natif sont relativement basiques par rapport à des outils spécialisés comme Jira ou Confluence.

#### 2. GitLab Ultimate (Note : 33.5/40)
* **Forces** : Une approche "tout-en-un" remarquable où l'ensemble du cycle de vie réside dans une seule application. **GitLab CI/CD** est l'un des moteurs de pipeline les plus matures du marché, facilitant l'intégration de conteneurs Docker de manière native. Les outils de sécurité intégrés (SAST, DAST, Container Scanning) sont excellents.
* **Faiblesses** : L'interface utilisateur est dense et peut s'avérer déroutante pour une petite équipe. Le plan gratuit restreint drastiquement le nombre de minutes de CI/CD gratuites et bloque les fonctionnalités de sécurité les plus avancées derrière la licence "Ultimate", dont le coût est prohibitif pour un projet d'études.

#### 3. Atlassian Suite (Jira / Confluence / Bitbucket) (Note : 29.0/40)
* **Forces** : **Jira** est la référence absolue pour le pilotage Agile, offrant une flexibilité totale de workflow et des rapports statistiques ultra-détaillés pour les Scrum Masters. **Confluence** est l'outil de documentation collaborative le plus performant, permettant de lier directement des spécifications fonctionnelles à des tickets Jira.
* **Faiblesses** : Suite logicielle fragmentée nécessitant l'utilisation et la configuration de plusieurs outils séparés. La configuration initiale est lourde, complexe, et demande un investissement en temps important (overhead administratif). L'ergonomie est souvent critiquée pour sa lourdeur. La gratuité est limitée à un nombre restreint d'utilisateurs avec des fonctionnalités bridées.

---

## 3. Recommandation motivée

Pour le projet **FIFA Ticketing Hub 2026**, nous recommandons l'adoption de la suite **GitHub Ecosystem** (GitHub Projects + GitHub Actions + GitHub Issues). Ce choix s'appuie sur trois arguments majeurs directement dictés par le contexte de notre projet :

1. **Adéquation avec la taille et l'agilité de l'équipe (3 ingénieurs)** :
   Avec une équipe de seulement 3 développeurs sur une durée de 6 semaines (3 sprints de 2 semaines), le temps est une ressource critique. L'installation et la configuration fine d'une suite lourde comme Atlassian Jira/Confluence aurait consommé plusieurs jours de travail précieux au détriment de l'implémentation. GitHub offre une configuration en quelques minutes, permettant à l'équipe de se concentrer immédiatement sur la valeur métier (réservations, verrous Redis, paiement Stripe).

2. **Intégration technique et DevOps fluide** :
   La stack technique retenue (React, Node.js, hébergement sur Render) s'intègre parfaitement avec GitHub. GitHub Actions permet de construire des pipelines de CI/CD performants et de s'intégrer nativement avec Render (builds, tests automatiques, et déclenchements automatiques de déploiement). De plus, l'intégration de **Dependabot** répond directement à nos exigences de maintenance (Module 7) de manière automatisée et gratuite.

3. **Contrainte budgétaire stricte (0 €)** :
   En tant que projet d'études, nous ne disposons d'aucun budget. GitHub propose des dépôts privés gratuits illimités, des tableaux GitHub Projects gratuits et des quotas de minutes GitHub Actions largement suffisants pour nos besoins de déploiement et d'exécution de tests Jest backend et frontend.

En conclusion, **GitHub** représente le meilleur compromis efficacité/coût, garantissant une excellente traçabilité des exigences (Module 10) et un flux de livraison continu DevOps stable et sécurisé sans surcharger l'équipe en administration d'outils.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
