import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchMatches } from '../services/matchService';
import MatchCard from '../components/MatchCard';
import ThemeToggle from '../components/ThemeToggle';

export default function CataloguePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStadium, setSelectedStadium] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to first page when any filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStadium, selectedDate]);

  const loadMatches = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMatches();
      setMatches(data || []);
    } catch (err) {
      setError(err.message || 'Impossible de charger le catalogue des matchs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Dynamically extract unique stadiums from active matches for the dropdown
  const uniqueStadiums = Array.from(
    new Set(
      matches
        .map((m) => m.stadium?.name)
        .filter(Boolean)
    )
  ).sort();

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStadium('');
    setSelectedDate('');
  };

  // Client-side filtering logic
  const filteredMatches = matches.filter((match) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesTeam = !query || 
      match.teamA.toLowerCase().includes(query) ||
      match.teamB.toLowerCase().includes(query);

    const matchesStadium = !selectedStadium || match.stadium?.name === selectedStadium;

    let matchesDate = true;
    if (selectedDate) {
      try {
        const matchDayStr = new Date(match.date).toISOString().split('T')[0];
        matchesDate = matchDayStr === selectedDate;
      } catch (e) {
        matchesDate = false;
      }
    }

    return matchesTeam && matchesStadium && matchesDate;
  });

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-40 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              onClick={() => navigate('/profile')}
              className="px-4 py-1.5 bg-brand-gold text-bg-primary hover:bg-brand-gold-light rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95"
            >
              Mon Profil
            </button>
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Banner Section */}
        <section className="mb-10 text-center sm:text-left">
          <p className="text-brand-gold font-mono text-xs tracking-widest uppercase mb-2">
            Coupe du Monde de la FIFA 2026
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3">
            Catalogue des Matchs
          </h1>
          <p className="text-text-secondary text-base max-w-2xl">
            Réservez vos places officielles pour vivre l&apos;ambiance unique de la Coupe du Monde au Canada, au Mexique et aux États-Unis.
          </p>
        </section>

        {/* Filter Bar (Glassmorphism design) */}
        <section className="bg-bg-secondary/60 border border-border-subtle rounded-xl p-5 mb-8 backdrop-blur-sm shadow-sm flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Équipe
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Rechercher une équipe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 pl-9 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-all duration-150 focus:shadow-glow"
                />
                <div className="absolute left-3 top-2.5 text-text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Stadium Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stadium" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Stade
              </label>
              <select
                id="stadium"
                value={selectedStadium}
                onChange={(e) => setSelectedStadium(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
              >
                <option value="">Tous les stades</option>
                {uniqueStadiums.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Date du Match
              </label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
              />
            </div>
          </div>

          {/* Reset Filters Option */}
          {(searchQuery || selectedStadium || selectedDate) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-brand-gold hover:text-brand-gold-light transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </section>

        {/* Display Error Message */}
        {error && (
          <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-5 text-center my-10 max-w-xl mx-auto">
            <svg className="w-10 h-10 text-brand-red mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-text-primary font-bold mb-3">{error}</p>
            <button
              onClick={loadMatches}
              className="px-5 py-2 bg-brand-red text-white font-bold text-xs rounded-full hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Shimmer Skeleton Loader */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="loading-skeleton">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-bg-secondary border border-border-subtle rounded-lg p-6 h-80 flex flex-col justify-between animate-pulse">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="h-6 w-24 bg-bg-elevated rounded"></div>
                    <div className="h-6 w-16 bg-bg-elevated rounded-full"></div>
                  </div>
                  <div className="h-7 w-3/4 bg-bg-elevated rounded mb-4"></div>
                  <div className="h-[1px] bg-border-subtle my-2"></div>
                  <div className="h-7 w-2/3 bg-bg-elevated rounded mt-4"></div>
                </div>
                <div className="border-t border-border-subtle pt-4 flex flex-col gap-2">
                  <div className="h-4 w-1/2 bg-bg-elevated rounded"></div>
                  <div className="h-4 w-2/3 bg-bg-elevated rounded"></div>
                </div>
                <div className="h-9 w-full bg-bg-elevated rounded-full mt-4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Match Grid & Empty State */}
        {!isLoading && !error && (
          <>
            {filteredMatches.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMatches.slice((currentPage - 1) * 6, (currentPage - 1) * 6 + 6).map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
                
                {filteredMatches.length > 6 && (
                  <div className="flex items-center justify-center gap-4 mt-8" data-testid="pagination-controls">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed border border-border-light rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95 text-text-primary"
                    >
                      Précédent
                    </button>
                    <span className="text-xs text-text-secondary font-medium" data-testid="page-indicator">
                      Page {currentPage} sur {Math.ceil(filteredMatches.length / 6)}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredMatches.length / 6)))}
                      disabled={currentPage === Math.ceil(filteredMatches.length / 6)}
                      className="px-4 py-2 bg-bg-tertiary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed border border-border-light rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95 text-text-primary"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-bg-secondary/40 border border-border-subtle border-dashed rounded-xl max-w-xl mx-auto my-6">
                <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-text-primary mb-1">Aucun match trouvé</h3>
                <p className="text-text-secondary text-sm mb-5 px-6">
                  Aucun résultat ne correspond à vos critères de recherche. Essayez de modifier vos filtres.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border-light text-brand-gold font-bold text-xs rounded-full transition-all"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
