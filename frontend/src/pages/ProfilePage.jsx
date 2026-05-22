import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchUserProfile, updateUserProfile } from '../services/userService';
import ThemeToggle from '../components/ThemeToggle';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await fetchUserProfile();
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');

      // Sync with Zustand store
      if (user) {
        setUser({
          ...user,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        });
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger les détails du profil.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firstName.trim()) {
      setError('Le prénom est requis.');
      return;
    }
    if (!lastName.trim()) {
      setError('Le nom est requis.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : '',
      });

      setFirstName(updated.firstName || '');
      setLastName(updated.lastName || '');
      setPhone(updated.phone || '');
      setSuccess('Profil mis à jour avec succès !');

      // Sync update with Zustand store
      if (user) {
        setUser({
          ...user,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
        });
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-brand-gold font-mono font-black text-lg tracking-wider">
              FIFA
            </span>
            <span className="text-text-primary font-bold text-sm tracking-widest uppercase">
              Ticketing Hub
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-text-muted">Connecté en tant que</span>
              <span className="text-text-secondary font-medium">{email || user?.email}</span>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95"
              >
                Portail Admin
              </button>
            )}
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-bg-tertiary hover:bg-bg-elevated border border-border-light rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation back and header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold-light transition-colors mb-4 focus:outline-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au Catalogue
          </button>

          <h1 className="text-3xl font-black tracking-tight mb-2">Mon Profil</h1>
          <p className="text-text-secondary text-sm">
            Gérez vos informations personnelles pour vos réservations et billets officiels.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 sm:p-8 space-y-6 animate-pulse" data-testid="profile-loading">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-bg-elevated rounded"></div>
              <div className="h-10 w-full bg-bg-elevated rounded"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-bg-elevated rounded"></div>
                <div className="h-10 w-full bg-bg-elevated rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 bg-bg-elevated rounded"></div>
                <div className="h-10 w-full bg-bg-elevated rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 bg-bg-elevated rounded"></div>
              <div className="h-10 w-full bg-bg-elevated rounded"></div>
            </div>
            <div className="h-10 w-32 bg-bg-elevated rounded-full"></div>
          </div>
        )}

        {/* Profile Card & Form */}
        {!isLoading && (
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Notifications */}
              {error && (
                <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-4 flex items-center gap-3 text-sm text-brand-red">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-brand-green/10 border border-brand-green/20 rounded-lg p-4 flex items-center gap-3 text-sm text-brand-green">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              {/* Email (Read-Only) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Adresse Email (non modifiable)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-bg-tertiary border border-border-light rounded-md py-2 px-3 text-sm text-text-muted cursor-not-allowed outline-none"
                />
              </div>

              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
                  />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Nom
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Numéro de Téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Ex: +33 6 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-gold to-brand-gold-dark hover:from-brand-gold-light hover:to-brand-gold text-black font-bold text-xs uppercase tracking-wider rounded-full transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>

            </form>
          </div>
        )}
      </main>
    </div>
  );
}
