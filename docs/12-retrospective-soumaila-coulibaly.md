# Analyse Rétrospective — Bilan Critique (Soumaila Coulibaly)

Ce document présente l'analyse rétrospective et le bilan critique individuel de l'expérience vécue par **Soumaila Coulibaly** lors du cycle de vie du projet **FIFA Ticketing Hub 2026** (Coupe du Monde de la FIFA 2026). Il est structuré autour des trois axes d'analyse exigés, complétant le retour de Théo Dupin avec une perspective particulièrement axée sur le frontend, l'intégration client et l'expérience utilisateur.

---

## 1. Ce qui a bien fonctionné

Plusieurs réalisations techniques, choix ergonomiques et approches d'intégration ont eu un impact très positif sur l'expérience finale de l'utilisateur.

### 1.1 Choix techniques & Expérience Utilisateur (UI/UX)
* **Plan de stade SVG interactif (US-13)** : L'implémentation de la cartographie dynamique du stade entièrement en SVG réactif a fonctionné au-delà de nos attentes. La gestion visuelle des catégories de sièges (Or en gold, Catégorie B en bleu, Catégorie C en vert) et l'effet de transparence (opacité réduite) pour les sièges déjà réservés ou verrouillés offrent une clarté instantanée pour l'utilisateur. L'intégration s'est faite de manière performante sans requêtes DOM directes hors de React, s'appuyant uniquement sur le state local de l'application.
* **Design System & Dark Mode par défaut** : La mise en place du système de tokens dans `tokens.css` a grandement simplifié le maintien de la cohérence visuelle. Le choix d'une interface sombre (Dark Mode) immersive par défaut, avec la possibilité de basculer en mode clair via un interrupteur réactif persistant (`localStorage`), donne à la plateforme un aspect premium (inspiré de Linear) qui a été particulièrement salué.
* **Gestion visuelle du temps d'expiration du panier (US-03)** : L'implémentation du composant `CartTimer` s'est montrée très efficace. Le fait de faire passer le compte à rebours de 10 minutes en couleur rouge vif sous la barre des 2 minutes, puis d'appliquer une micro-animation de pulsation sous la minute restante, a parfaitement matérialisé la notion d'urgence de la réservation temporaire de manière fluide et esthétique.

### 1.2 Pratiques d'Intégration & Client-Side API
* **Formulaires de Paiement Stripe Elements (US-04)** : L'intégration de Stripe Elements à la page de checkout a garanti une conformité PCI-DSS stricte par délégation. L'intégration visuelle a été personnalisée pour épouser le thème sombre de la plateforme (via l'API d'apparence de Stripe Elements) tout en offrant une validation robuste et immédiate des cartes de test.
* **Intégration Firebase OAuth (US-01)** : La mise en place de la connexion via Google OAuth s'est déroulée de manière fluide côté client. La communication sécurisée consistant à récupérer l'ID Token Firebase pour l'échanger avec notre backend contre un cookie JWT httpOnly sécurisé a éliminé tout stockage sensible dans le stockage local du navigateur.

---

## 2. Ce qui a moins bien fonctionné

Une autocritique rigoureuse révèle plusieurs obstacles techniques, des oublis dans le périmètre client et des complexités de test.

### 2.1 Difficultés techniques & Limites de l'implémentation
* **Tests unitaires et de composants sur le Frontend (Jest & JSDOM)** : Contrairement au backend qui a pu s'appuyer sur des environnements en mémoire performants, la suite de tests du frontend a représenté un véritable défi technique. Mocker les composants Stripe Elements, les appels d'API asynchrones et l'état global Firebase Auth s'est avéré complexe et chronophage. En conséquence, la couverture de test du frontend est restée inférieure aux 70% fixés initialement, se concentrant principalement sur les composants isolés (comme les boutons et cartes) plutôt que sur les flux complets.
* **Persistance de l'état local et déconnexion (Logout)** : Lors de la phase de déconnexion, nous avons rencontré des problèmes de réinitialisation de l'état global React (Redux ou Context local). Certaines données utilisateur ou de panier restaient brièvement visibles en mémoire cache avant de forcer un rafraîchissement manuel de la page (`window.location.reload()`), une solution technique peu élégante qui trahit une dette technique d'architecture sur le cycle de vie du store.
* **Validation de formulaires ad-hoc** : La validation des entrées pour l'authentification locale a été écrite "à la main" dans les composants de formulaires. Cela a conduit à du code verbeux, parfois redondant, et à des faiblesses d'ergonomie, par exemple l'acceptation de numéros de téléphone mal formatés avant l'envoi de la requête au serveur, ce qui a surchargé inutilement le backend en requêtes invalides.

### 2.2 Gestion du scope & Priorisation
* **Sous-estimation de la complexité de l'espace Admin (US-07 & US-12)** : L'accent mis sur la perfection visuelle du parcours de l'acheteur (SeatMap interactive, animations Stripe) nous a fait manquer de temps pour finaliser le dashboard d'administration. Avoir planifié des graphiques et des interfaces complexes de style Vercel pour l'administrateur dès le départ a mené à un blocage, la fonctionnalité n'ayant finalement pas pu être livrée pour le Sprint 3.

---

## 3. Ce que je ferais différemment

Une nouvelle itération du projet m'amènerait à revoir plusieurs choix méthodologiques et d'architecture frontend.

### 3.1 Choix techniques & Outils de développement
* **Utilisation de Zod et React Hook Form dès le début** : Au lieu de gérer manuellement chaque champ de formulaire et les messages d'erreur associés dans des states locaux React, j'utiliserais une bibliothèque éprouvée pour centraliser et structurer proprement la validation des données d'entrée directement côté client.
* **Création d'une bibliothèque de Mocks globaux pour les tests** : Pour ne plus perdre de temps à écrire des mocks ad-hoc pour Stripe et Firebase à chaque nouveau test de page, j'aurais mis en place un fichier de configuration globale (`jest.setup.cjs`) contenant des mocks standardisés de ces services externes dès la première semaine.
* **Adoption d'une stratégie MVP stricte pour l'Admin** : Pour l'interface d'administration, j'aurais proposé des tableaux HTML minimalistes sans graphiques interactifs ni filtres complexes dans un premier temps. Assurer la création fonctionnelle d'un match (US-07 - Must Have) était prioritaire sur l'esthétique du tableau de bord.

### 3.2 Collaboration et méthodologie
* **Storybook pour les composants partagés** : Pour faciliter le travail en parallèle avec Théo, l'utilisation de Storybook aurait permis de documenter et de valider visuellement nos composants clés (MatchCard, TicketCard) de manière indépendante des données réelles de l'API backend, limitant ainsi les frictions lors des fusions de branches.
* **Sessions de conception communes sur les contrats d'API** : Planifier des sessions de conception synchrones en début de sprint pour verrouiller les structures JSON des réponses de l'API (notamment les formats de paniers et de tickets) nous aurait évité des allers-retours et des corrections de dernière minute dans le code d'intégration du frontend.

---

## 4. Utilisation de l'IA (Assistant de codage)

L'usage d'outils d'IA (Claude, Gemini) a été systématique et a joué un rôle d'accélérateur majeur tout au long du développement.

### 4.1 Modalités d'utilisation
L'assistance par IA s'est structurée autour des points suivants :
1. **Génération de structures SVG complexes** : Conception de la structure réactive et propre du plan de stade (`SeatMap`), facilitant le calcul des coordonnées de chaque siège et le binding des événements de clic.
2. **Configuration Tailwind & CSS Variables** : Aide à l'écriture de la configuration Tailwind étendue (`tailwind.config.js`) pour mapper proprement nos tokens CSS personnalisés et créer des animations harmonieuses.
3. **Mocks de tests d'intégration** : Aide à la rédaction des mocks de l'API Stripe Elements et de Firebase Auth pour nos fichiers de test Jest.
4. **Mise en conformité documentaire** : Assistance à la formalisation de l'analyse rétrospective et à la structuration du plan de tests.

### 4.2 Impact sur le flux de travail
L'IA a profondément modifié ma manière de travailler :
* **Gain d'efficacité esthétique** : Traduire rapidement nos intentions de design premium en classes Tailwind fiables et responsives a permis un gain de temps de près de 40% sur la création des interfaces utilisateurs.
* **Déblocage technique** : L'aide au diagnostic des erreurs d'authentification asynchrone Firebase et de récupération d'états dans React a permis de résoudre rapidement des problèmes qui auraient nécessité des heures de recherche documentaire.
* **Documentation continue** : La mise en forme rapide et structurée des livrables de tests et de traçabilité a assuré le respect des standards ALM attendus par l'évaluateur du projet.

---

*FIFA Ticketing Hub 2026 — ESN AST — Master 2 ALM — Mai 2026*
