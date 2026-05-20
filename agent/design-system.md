# Design System — FIFA Ticketing Hub 2026

> Référence : `CLAUDE.md` section 6.
> Mode par défaut : **dark**. Switch via attribut `data-theme` sur `<html>`.
> Persistance : `localStorage.setItem('theme', 'dark' | 'light')`.

---

## 1. Tokens CSS

Fichier source : `frontend/src/styles/tokens.css` (chargé en premier dans `main.jsx`).

### Variables thème (dark/light)
Voir `CLAUDE.md` section 6 — ce fichier en est le miroir exact. Toute modification se fait simultanément dans les deux fichiers.

### Variables globales (`:root`)
- Couleurs marque : `--brand-gold`, `--brand-green`, `--brand-red`, `--brand-blue`
- Glow : `--shadow-glow`
- Transitions : `--transition-fast` (150ms), `--transition-base` (250ms), `--transition-slow` (400ms)
- Radius : `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`

---

## 2. Typographie

| Famille | Usage | Poids |
|---|---|---|
| Inter | UI général | 400 / 500 / 600 / 700 / 900 |
| JetBrains Mono | Codes, QR ref, identifiants | 400 / 700 |

Chargement : `<link>` dans `index.html` (Google Fonts) + `font-family` Tailwind.

### Échelle
| Token Tailwind | Usage |
|---|---|
| `text-xs` (12) | Légendes, métadonnées |
| `text-sm` (14) | Body secondaire |
| `text-base` (16) | Body principal |
| `text-lg` (18) | Sous-titres |
| `text-2xl` (24) | Titres section |
| `text-4xl` (36) | Titres page |
| `text-6xl` (60) | Hero |

---

## 3. Composants — règles de style

| Composant | Style |
|---|---|
| `MatchCard` | `bg-bg-secondary`, `border border-subtle`, `rounded-lg`, hover `-translate-y-0.5`, `shadow-card` |
| `SeatMap` | SVG. Section A=`brand-gold`, B=`brand-blue`, C=`brand-green`. Sièges pris : `opacity-30 cursor-not-allowed` |
| `CartTimer` | Texte `text-secondary`. <2min → `text-brand-red`. <1min → `animate-pulse` |
| Bouton CTA primaire | `bg-brand-gold text-black rounded-full shadow-glow hover:scale-[1.02]` |
| Bouton secondaire | `bg-bg-tertiary text-primary border border-light hover:border-focus` |
| Badge dispo | Pill vert (`brand-green`) animé si stock > 0, rouge (`brand-red`) si complet |
| `TicketCard` | Gradient noir diagonal, `border-brand-gold`, QR sur fond blanc `rounded-md` |
| `PaymentForm` | Stripe Elements dans `bg-bg-tertiary` `border-light` `rounded-lg` |
| `ThemeToggle` | Switch smooth 250ms, icône soleil/lune |
| `Modal` | `shadow-modal`, backdrop `bg-black/60 backdrop-blur-sm` |
| `Input` | `bg-bg-tertiary`, `border-light`, focus `border-focus shadow-glow` |

---

## 4. Inspirations par page

| Page | Référence visuelle |
|---|---|
| Landing / Hero | Linear.app |
| Catalogue matchs | Event tickets dark UI |
| Détail match | Apple product page |
| Checkout | Stripe checkout |
| Dashboard admin | Vercel dashboard |

---

## 5. Animations (Tailwind extend)

```js
animation: {
  'pulse-slow': 'pulse 3s ease-in-out infinite',
  'shimmer':    'shimmer 2s linear infinite',
}
```

Keyframes `shimmer` (à ajouter dans `tokens.css`) :
```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

---

## 6. Accessibilité

- Contraste minimum AA pour tous les textes.
- `focus-visible` toujours visible (anneau `--border-focus`).
- Tous les boutons icône → `aria-label`.
- `prefers-reduced-motion` respecté (désactive `animate-*`).
- Navigation clavier complète (Tab order logique, Esc ferme modal).

---

## 7. Responsive

Mobile-first. Breakpoints Tailwind par défaut :
- `sm` 640px — tablettes portrait
- `md` 768px — tablettes paysage
- `lg` 1024px — laptop
- `xl` 1280px — desktop

Le SeatMap doit être pannable/zoomable sur mobile (`touch-action: pan-x pan-y`).
