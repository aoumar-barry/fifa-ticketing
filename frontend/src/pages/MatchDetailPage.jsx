import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { fetchMatchById } from '../services/matchService';
import { fetchSeats } from '../services/seatService';
import SeatMap from '../components/SeatMap';
import ThemeToggle from '../components/ThemeToggle';

function formatMatchDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date à déterminer';
    
    const datePart = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formattedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);
    const formattedTime = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${formattedDate} à ${formattedTime}`;
  } catch (err) {
    return 'Date non spécifiée';
  }
}

const getRoundLabel = (round) => {
  switch (round) {
    case 'group': return 'Phase de Groupes';
    case 'round16': return 'Huitième de Finale';
    case 'quarter': return 'Quart de Finale';
    case 'semi': return 'Demi-Finale';
    case 'final': return 'Finale';
    default: return round || 'Match';
  }
};

export default function MatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { cart, initializeCart } = useCartStore();
  const [match, setMatch] = useState(null);
  const [seats, setSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const pollingRef = useRef(null);

  // Initialize cart state on mount (useful if user refreshes page)
  useEffect(() => {
    initializeCart();
  }, [initializeCart]);

  const loadMatchData = async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const matchData = await fetchMatchById(id);
      setMatch(matchData);
      
      const seatsData = await fetchSeats(id);
      setSeats(seatsData || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Impossible de charger les détails du match.');
    } finally {
      if (showSkeleton) setIsLoading(false);
    }
  };

  // Only refresh seats silently in the background
  const refreshSeatsOnly = async () => {
    try {
      const seatsData = await fetchSeats(id);
      setSeats(seatsData || []);
    } catch (err) {
      console.warn('Silent seat update failed:', err);
    }
  };

  useEffect(() => {
    loadMatchData(true);

    // Setup 10-second polling for seats
    pollingRef.current = setInterval(() => {
      refreshSeatsOnly();
    }, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
        {/* Simple Header Skeleton */}
        <header className="bg-bg-primary/80 border-b border-border-subtle h-16 flex items-center justify-between px-8">
          <div className="h-6 w-32 bg-bg-elevated animate-pulse rounded"></div>
          <div className="h-8 w-24 bg-bg-elevated animate-pulse rounded-full"></div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6 items-center justify-center">
          <span className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
          <p className="text-text-secondary text-sm font-mono tracking-widest uppercase animate-pulse">
            Chargement de la configuration du stade...
          </p>
        </main>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
        <header className="bg-bg-primary/80 border-b border-border-subtle h-16 flex items-center justify-between px-8">
          <Link to="/" className="text-brand-gold font-mono font-black text-lg tracking-wider">
            FIFA
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-8 max-w-md w-full text-center shadow-card">
            <svg className="w-12 h-12 text-brand-red mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-text-primary mb-2">Erreur de chargement</h2>
            <p className="text-text-secondary text-sm mb-6">{error || 'Le match spécifié est introuvable.'}</p>
            <div className="flex gap-4 justify-center">
              <Link to="/" className="px-5 py-2 bg-bg-tertiary border border-border-light hover:bg-bg-elevated rounded-full text-xs font-bold text-text-primary">
                Retour au catalogue
              </Link>
              <button onClick={() => loadMatchData(true)} className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-dark text-black rounded-full text-xs font-bold transition-all">
                Réessayer
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-brand-gold font-mono font-black text-lg tracking-wider">
              FIFA
            </Link>
            <span className="text-text-primary font-bold text-sm tracking-widest uppercase">
              Ticketing Hub
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <span className="text-text-muted">Connecté</span>
                  <span className="text-text-secondary font-medium">{user?.email}</span>
                </div>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="px-4 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95"
                  >
                    Portail Admin
                  </button>
                )}
                <button
                  onClick={logout}
                  className="px-4 py-1.5 bg-bg-tertiary hover:bg-bg-elevated border border-border-light rounded-full text-xs font-semibold transition-all"
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-brand-gold hover:bg-brand-gold-dark text-black rounded-full text-xs font-bold transition-all"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Detail Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Back Link */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold-light transition-colors uppercase tracking-wider">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au catalogue
          </Link>
        </div>

        {/* Match Info Banner */}
        <section className="bg-bg-secondary border border-border-light rounded-2xl p-6 md:p-8 shadow-card flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          {/* Subtle gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-gold-dark via-brand-gold to-brand-gold-light" />
          
          <div className="flex flex-col items-center md:items-start gap-4">
            <span className="text-xs font-mono text-brand-gold font-bold uppercase tracking-widest bg-brand-gold/10 border border-brand-gold/20 px-3 py-1 rounded">
              {getRoundLabel(match.round)} {match.group ? `• Groupe ${match.group}` : ''}
            </span>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6">
              <h2 className="text-xl md:text-3xl font-black text-text-primary tracking-tight">
                {match.teamA}
              </h2>
              <span className="text-xs font-mono text-text-muted px-2 py-0.5 border border-border-subtle rounded bg-bg-tertiary">
                VS
              </span>
              <h2 className="text-xl md:text-3xl font-black text-text-primary tracking-tight">
                {match.teamB}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-xs text-text-secondary mt-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatMatchDate(match.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{match.stadium?.name}, {match.stadium?.city} ({match.stadium?.country})</span>
              </div>
            </div>
          </div>

          {/* Places remaining badge */}
          <div className="bg-bg-tertiary border border-border-light rounded-xl p-4 flex flex-col items-center md:items-end justify-center min-w-[150px] shadow-sm">
            <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted mb-1">
              Disponibilité
            </span>
            <span className={`text-2xl font-black ${match.availableSeats > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
              {match.availableSeats} / {match.totalSeats}
            </span>
            <span className="text-[10px] text-text-secondary mt-1">
              Places restantes
            </span>
          </div>
        </section>

        {/* Seat Selection Map Section */}
        <section>
          <SeatMap
            matchId={id}
            seats={seats}
            onRefreshSeats={refreshSeatsOnly}
          />
        </section>

      </main>
    </div>
  );
}
