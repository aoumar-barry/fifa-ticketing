# Maintenance du Projet & Mises à Jour des Dépendances

Ce document décrit la stratégie de maintenance et de mise à jour automatisée des dépendances pour le projet FIFA Ticketing Hub 2026.

## 1. Automatisation avec Dependabot

Dependabot est configuré pour analyser régulièrement les fichiers de dépendances et ouvrir des Pull Requests de mise à jour.

### Configuration (`.github/dependabot.yml`)
Le fichier de configuration de Dependabot est situé dans [.github/dependabot.yml](file:///c:/Dev/fifa-ticketing/.github/dependabot.yml) et applique les règles suivantes :
- **Fréquence** : Hebdomadaire (toutes les semaines).
- **Écosystème** : `npm` (Node.js).
- **Cibles** : 
  - Backend : `/backend`
  - Frontend : `/frontend`
- **Limite** : Maximum 10 Pull Requests ouvertes simultanément par répertoire pour éviter le bruit.

---

## 2. Stratégie d'Auto-Merge

Pour simplifier la maintenance tout en garantissant la stabilité de l'application, un workflow d'auto-merge a été mis en place.

### Workflow d'Auto-Merge (`.github/workflows/dependabot-auto-merge.yml`)
Le workflow défini dans [.github/workflows/dependabot-auto-merge.yml](file:///c:/Dev/fifa-ticketing/.github/workflows/dependabot-auto-merge.yml) gère la fusion automatique selon les critères suivants :
1. **Acteur** : La Pull Request doit être initiée par l'utilisateur `dependabot[bot]`.
2. **Type de version (SemVer)** :
   - **Patch** (`version-update:semver-patch`) : Mises à jour correctives sans rupture de compatibilité.
   - **Minor** (`version-update:semver-minor`) : Nouvelles fonctionnalités rétrocompatibles.
3. **Validation CI** : La fusion automatique n'intervient que si l'ensemble des tests du pipeline CI/CD (tests unitaires et d'intégration backend/frontend) sont passés avec succès.
4. **Commande utilisée** : Le workflow utilise la CLI GitHub (`gh pr merge --auto --merge`) qui configure la PR pour fusionner automatiquement dès que les validations requises sont validées.

---

## 3. Mises à Jour Majeures (Major Updates)

Les mises à jour majeures (`version-update:semver-major`) ne sont **pas** fusionnées automatiquement. Elles nécessitent une intervention humaine :
1. Analyse des changements introduits (changelog / breaking changes).
2. Validation locale en exécutant les tests et le build :
   - Backend : `npm test`
   - Frontend : `npm test` et `npm run build`
3. Fusion manuelle après approbation.
