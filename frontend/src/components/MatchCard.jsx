import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Helper to format date in French
 */
function formatMatchDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date à déterminer';
    
    // Capitalize first letter of weekday
    const datePart = date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);
    const formattedTime = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${formattedDate} • ${formattedTime}`;
  } catch (err) {
    return 'Date non spécifiée';
  }
}

export default function MatchCard({ match }) {
  const { id, teamA, teamB, round, group, date, stadium, availableSeats } = match;
  
  const isAvailable = availableSeats > 0;
  const formattedDate = formatMatchDate(date);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 shadow-card hover:-translate-y-0.5 hover:border-brand-gold/30 transition-all duration-300 flex flex-col justify-between h-full">
      {/* Card Header: Round / Group */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-widest bg-bg-tertiary px-2.5 py-1 rounded-sm border border-border-subtle">
          {round ? `${round}` : `Groupe ${group || ''}`}
        </span>
        {/* Availability Badge */}
        {isAvailable ? (
          <span 
            data-testid="badge-available"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green border border-brand-green/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
            {availableSeats} places
          </span>
        ) : (
          <span 
            data-testid="badge-unavailable"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-red/10 text-brand-red border border-brand-red/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
            Complet
          </span>
        )}
      </div>

      {/* Teams Face-off */}
      <div className="flex flex-col gap-3 my-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border-light flex items-center justify-center text-xs font-black text-brand-gold shadow-sm">
            {teamA ? teamA.substring(0, 3).toUpperCase() : 'TBD'}
          </div>
          <span className="font-bold text-text-primary text-lg tracking-wide">{teamA}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-border-subtle"></div>
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">VS</span>
          <div className="h-[1px] flex-1 bg-border-subtle"></div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border-light flex items-center justify-center text-xs font-black text-brand-gold shadow-sm">
            {teamB ? teamB.substring(0, 3).toUpperCase() : 'TBD'}
          </div>
          <span className="font-bold text-text-primary text-lg tracking-wide">{teamB}</span>
        </div>
      </div>

      {/* Location & Time Info */}
      <div className="border-t border-border-subtle pt-4 mt-2 flex flex-col gap-2.5">
        {/* Date Time */}
        <div className="flex items-center gap-2.5 text-text-secondary text-sm">
          <svg className="w-4 h-4 text-brand-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{formattedDate}</span>
        </div>

        {/* Stadium details */}
        <div className="flex items-center gap-2.5 text-text-secondary text-sm">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">
            {stadium ? `${stadium.name}, ${stadium.city}` : 'Stade à déterminer'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-border-subtle/50">
        {isAvailable ? (
          <Link 
            to={`/match/${id}`}
            className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-brand-gold text-black rounded-full font-bold text-sm tracking-wide shadow-glow hover:scale-[1.02] active:scale-95 transition-all duration-150 text-center"
          >
            Réserver
          </Link>
        ) : (
          <button 
            disabled 
            className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-bg-tertiary text-text-muted border border-border-subtle rounded-full font-bold text-sm tracking-wide cursor-not-allowed text-center"
          >
            Complet
          </button>
        )}
      </div>
    </div>
  );
}
