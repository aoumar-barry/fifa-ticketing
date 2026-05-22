# Module 3 — Conception

## 1. Diagramme de cas d'utilisation

Nous avons modélisé deux acteurs : l'utilisateur authentifié et l'administrateur. La séparation en deux espaces distincts reflète les niveaux d'accès de notre système. La relation «include» entre "Réserver un billet" et "Payer en ligne" traduit le caractère obligatoire du paiement pour valider une réservation. Le cas "S'inscrire / Se connecter" intègre les deux méthodes d'authentification supportées : connexion locale et Google OAuth.

## 2. Diagramme de classes

Nous avons séparé Cart et Order car ils représentent deux états distincts : Cart est temporaire (TTL 10 min) et Order est permanente, créée uniquement après confirmation du paiement. Le champ `firebaseUid` dans User permet la liaison avec Google OAuth via Firebase. Stadium est une entité indépendante pour éviter la duplication sur plusieurs matchs. Payment est lié à Order pour assurer la traçabilité de chaque transaction Stripe.

## 3. Diagramme de séquence 1 — Connexion hybride

Nous avons représenté deux flux distincts. Le Flux A couvre la connexion locale avec vérification bcrypt et génération de tokens JWT en cookie httpOnly. Le Flux B couvre Google OAuth via Firebase où le backend vérifie l'idToken et crée ou lie le compte via `firebaseUid`. Le cas d'erreur 401 retourne le même message pour un mauvais mot de passe et un email inexistant, conformément aux bonnes pratiques anti-énumération.

## 4. Diagramme de séquence 2 — Réservation et paiement

Le verrou Redis `SET seat:{id} NX EX 600` est posé avant toute écriture en base pour garantir l'exclusivité du siège en cas de requêtes simultanées. Le webhook Stripe `charge.succeeded` est préféré à un retour synchrone pour garantir que la commande n'est créée qu'après confirmation explicite de Stripe. Après confirmation, la clé Redis est supprimée et le siège passe en statut `sold` dans MongoDB Atlas pour maintenir la cohérence entre les deux sources de vérité.

