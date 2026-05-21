import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const { register, isLoading, error: storeError } = useAuthStore();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setLocalError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    try {
      await register(email, password, firstName, lastName, phone || undefined);
      navigate('/');
    } catch (err) {
      // Error is stored in Zustand state and shown via storeError
    }
  };

  const activeError = localError || storeError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary px-4 py-12">
      <div className="w-full max-w-md bg-bg-secondary border border-border-subtle rounded-2xl shadow-card p-8 backdrop-blur-md relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-gold opacity-10 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-blue opacity-10 blur-3xl rounded-full"></div>

        <div className="text-center mb-8 relative z-10">
          <p className="text-brand-gold font-mono text-xs tracking-widest uppercase mb-2">
            FIFA Ticketing Hub 2026
          </p>
          <h1 className="text-3xl font-black tracking-tight">
            Créer un compte
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Inscrivez-vous pour réserver vos places de match
          </p>
        </div>

        {activeError && (
          <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-lg text-sm font-medium animate-pulse-slow">
            {activeError}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                Prénom *
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                Nom *
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
              Adresse e-mail *
            </label>
            <input
              id="email"
              type="email"
              placeholder="jean.dupont@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
              Téléphone (optionnel)
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
              Mot de passe *
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150 text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-gold text-black font-bold rounded-lg shadow-glow hover:bg-brand-gold-light active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center text-sm"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "S'inscrire"
              )}
            </button>
          </div>
        </form>

        <div className="relative my-6 z-10 flex items-center justify-between">
          <span className="w-1/4 border-b border-border-light"></span>
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
            Ou
          </span>
          <span className="w-1/4 border-b border-border-light"></span>
        </div>

        <div className="text-center relative z-10 text-sm">
          <span className="text-text-secondary">Déjà un compte ? </span>
          <Link to="/login" className="text-brand-gold hover:text-brand-gold-light hover:underline font-bold transition-all">
            Se connecter
          </Link>
        </div>

      </div>
    </div>
  );
}
