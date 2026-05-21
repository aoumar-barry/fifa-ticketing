import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { createCart, deleteCart } from '../services/cartService';

export default function SeatMap({ matchId, seats, onRefreshSeats }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { cart, setCart, clearCart } = useCartStore();
  const [isReserving, setIsReserving] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Map seats to SVG coordinates
  const getSeatCoords = (seat) => {
    const { category, row, number } = seat;
    
    if (category === 'A') {
      const rowIndex = row.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      const colIndex = number - 1; // 0..9
      const x = 265 + colIndex * 30;
      const y = 195 - rowIndex * 22;
      return { x, y };
    } else if (category === 'B') {
      const rowIndex = row.charCodeAt(0) - 69; // E=0, F=1, G=2, H=3
      const colIndex = number - 1; // 0..9
      const x = 215 - rowIndex * 22;
      const y = 195 + colIndex * 25;
      return { x, y };
    } else if (category === 'C') {
      const rowIndex = row.charCodeAt(0) - 73; // I=0, J=1, K=2, L=3
      const colIndex = number - 1; // 0..9
      const x = 585 + rowIndex * 22;
      const y = 195 + colIndex * 25;
      return { x, y };
    }
    return { x: 0, y: 0 };
  };

  const handleSeatClick = async (seat) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (seat.status !== 'available') return;
    if (isReserving) return;

    setIsReserving(true);
    setErrorMessage('');

    try {
      // If user already has an active cart, release the old seat first
      if (cart) {
        try {
          await deleteCart(cart.cartId);
        } catch (e) {
          console.warn('Failed to delete previous cart, continuing...', e);
        }
        clearCart();
      }

      // Create new cart/lock for this seat
      const res = await createCart(matchId, seat.id);
      setCart({
        cartId: res.cartId,
        expiresAt: res.expiresAt,
        matchId,
        seatId: seat.id,
        seat,
      });

      // Refresh parent component's seats to show updated status immediately
      if (onRefreshSeats) {
        onRefreshSeats();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Impossible de réserver ce siège. Veuillez réessayer.');
    } finally {
      setIsReserving(false);
    }
  };

  const getSeatColorClass = (seat, isSelected) => {
    if (isSelected) return 'fill-brand-gold';
    if (seat.status !== 'available') return 'fill-text-muted opacity-30';
    
    switch (seat.category) {
      case 'A': return 'fill-brand-gold hover:fill-brand-gold-light';
      case 'B': return 'fill-brand-blue hover:fill-brand-blue-light';
      case 'C': return 'fill-brand-green hover:fill-brand-green-light';
      default: return 'fill-text-muted';
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-bg-secondary border border-border-light rounded-xl p-6 shadow-card overflow-hidden">
      <style>{`
        @keyframes seat-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .pulse-ring {
          transform-origin: center;
          animation: seat-pulse 2s infinite ease-out;
        }
        .stadium-seat {
          transition: transform 0.15s ease, fill 0.15s ease;
          transform-origin: center;
        }
        .stadium-seat:hover:not(.disabled) {
          transform: scale(1.3);
        }
      `}</style>

      {/* Header / Error Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-wider">Plan du Stade</h3>
          <p className="text-xs text-text-secondary">Sélectionnez un siège disponible pour le réserver pendant 10 minutes.</p>
        </div>
        {errorMessage && (
          <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs px-3 py-1.5 rounded font-medium animate-pulse">
            {errorMessage}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[4/3] max-h-[500px] border border-border-subtle rounded-lg bg-bg-primary overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soccer Field (Center Pitch) */}
          <g id="pitch" className="opacity-90">
            {/* Outer Green Grass */}
            <rect x="250" y="230" width="300" height="200" fill="#1b4224" rx="4" />
            <rect x="255" y="235" width="290" height="190" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
            
            {/* Center Line & Circle */}
            <line x1="400" y1="235" x2="400" y2="425" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
            <circle cx="400" cy="330" r="45" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
            <circle cx="400" cy="330" r="3" fill="#ffffff" />

            {/* Left Penalty Area */}
            <rect x="255" y="295" width="40" height="70" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
            {/* Right Penalty Area */}
            <rect x="505" y="295" width="40" height="70" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
          </g>

          {/* Section Titles */}
          <text x="400" y="70" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="bold" letterSpacing="2" opacity="0.7">
            TRIBUNE NORD — CATÉGORIE A
          </text>
          <text x="90" y="335" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="bold" letterSpacing="2" opacity="0.7" transform="rotate(-90 90 335)">
            TRIBUNE OUEST — CATÉGORIE B
          </text>
          <text x="710" y="335" textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="bold" letterSpacing="2" opacity="0.7" transform="rotate(90 710 335)">
            TRIBUNE EST — CATÉGORIE C
          </text>

          {/* Render Seats */}
          <g id="seats">
            {seats.map((seat) => {
              const { x, y } = getSeatCoords(seat);
              const isSelected = cart && cart.seatId === seat.id;
              const isAvailable = seat.status === 'available';
              
              return (
                <g 
                  key={seat.id}
                  className="cursor-pointer"
                  onClick={() => handleSeatClick(seat)}
                  onMouseEnter={() => setHoveredSeat(seat)}
                  onMouseLeave={() => setHoveredSeat(null)}
                >
                  {/* Pulsing indicator for active selection */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="none"
                      stroke="var(--brand-gold)"
                      strokeWidth="2"
                      className="pulse-ring"
                    />
                  )}

                  {/* Seat dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r="7.5"
                    className={`stadium-seat ${isAvailable ? '' : 'disabled'} ${getSeatColorClass(seat, isSelected)}`}
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />

                  {/* Accessible outline indicator for selection */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r="10"
                      fill="none"
                      stroke="var(--text-primary)"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredSeat && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-light text-text-primary px-4 py-2 rounded-lg shadow-modal flex flex-col items-center gap-1 min-w-[200px] pointer-events-none"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                hoveredSeat.category === 'A' ? 'bg-brand-gold' : hoveredSeat.category === 'B' ? 'bg-brand-blue' : 'bg-brand-green'
              }`} />
              <span className="font-bold text-xs">Siège {hoveredSeat.row}-{hoveredSeat.number}</span>
            </div>
            <div className="text-[10px] text-text-secondary flex gap-2">
              <span>Section {hoveredSeat.section}</span>
              <span>•</span>
              <span className="text-brand-gold font-bold">{hoveredSeat.price} $</span>
            </div>
            <div className="text-[9px] font-mono mt-0.5 uppercase tracking-wider text-text-muted">
              {hoveredSeat.status === 'sold' && 'Vendu'}
              {hoveredSeat.status === 'locked' && 'Verrouillé'}
              {hoveredSeat.status === 'available' && 'Disponible'}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary */}
      <div className="mt-6 border-t border-border-subtle pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Colors / Legend */}
        <div className="flex flex-wrap gap-4 text-xs justify-center md:justify-start">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-brand-gold" />
            <span className="text-text-secondary">Catégorie A (150 $)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-brand-blue" />
            <span className="text-text-secondary">Catégorie B (100 $)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-brand-green" />
            <span className="text-text-secondary">Catégorie C (50 $)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-text-muted opacity-30" />
            <span className="text-text-secondary">Occupé / Indisponible</span>
          </div>
        </div>

        {/* Selected Seat State */}
        {cart && cart.matchId === matchId && cart.seat && (
          <div className="flex items-center gap-4 bg-bg-elevated border border-border-light rounded-lg px-4 py-2 text-xs w-full md:w-auto justify-between md:justify-start">
            <div>
              <p className="text-text-secondary">Siège sélectionné :</p>
              <p className="font-bold text-text-primary">
                Rangée {cart.seat.row}, Place {cart.seat.number} ({cart.seat.price} $)
              </p>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              disabled={isReserving}
              className="bg-brand-gold hover:bg-brand-gold-dark text-black font-bold px-4 py-2 rounded transition-colors uppercase tracking-wider text-xs"
            >
              Commander
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
