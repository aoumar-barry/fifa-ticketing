import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { signInWithGooglePopup, signInWithGithubPopup } from '../config/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  const navigate = useNavigate();
  const { login, loginWithFirebase, isLoading, error: storeError } = useAuthStore();

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Error handled by store and displayed via storeError / catch block
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError('');
    try {
      const { idToken } = await signInWithGooglePopup();
      await loginWithFirebase(idToken);
      navigate('/');
    } catch (err) {
      setLocalError(err.message || 'La connexion via Google a échoué.');
    }
  };

  const handleGithubLogin = async () => {
    setLocalError('');
    try {
      const { idToken } = await signInWithGithubPopup();
      await loginWithFirebase(idToken);
      navigate('/');
    } catch (err) {
      setLocalError(err.message || 'La connexion via GitHub a échoué.');
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
            Connexion
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Accédez à vos billets pour la Coupe du Monde
          </p>
        </div>

        {activeError && (
          <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 text-brand-red rounded-lg text-sm font-medium animate-pulse-slow">
            {activeError}
          </div>
        )}

        <form onSubmit={handleLocalLogin} className="space-y-5 relative z-10">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="votre.email@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-bg-tertiary border border-border-light rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand-gold text-black font-bold rounded-lg shadow-glow hover:bg-brand-gold-light active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="relative my-8 z-10 flex items-center justify-between">
          <span className="w-1/5 border-b border-border-light"></span>
          <span className="text-xs text-text-muted uppercase font-bold tracking-wider">
            Ou continuer avec
          </span>
          <span className="w-1/5 border-b border-border-light"></span>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="py-3 px-4 bg-bg-tertiary hover:bg-bg-elevated border border-border-light hover:border-text-secondary rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>

          <button
            onClick={handleGithubLogin}
            disabled={isLoading}
            className="py-3 px-4 bg-bg-tertiary hover:bg-bg-elevated border border-border-light hover:border-text-secondary rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {/* GitHub Icon SVG */}
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            GitHub
          </button>
        </div>

        <div className="text-center relative z-10 text-sm">
          <span className="text-text-secondary">Nouveau sur FIFA Tickets ? </span>
          <Link to="/register" className="text-brand-gold hover:text-brand-gold-light hover:underline font-bold transition-all">
            Créer un compte
          </Link>
        </div>

      </div>
    </div>
  );
}
