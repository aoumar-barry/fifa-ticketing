import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchOrders } from '../services/orderService';
import { getQRCode, downloadPDF } from '../services/ticketService';
import ThemeToggle from '../components/ThemeToggle';

function formatMatchDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date à déterminer';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return 'Date non spécifiée';
  }
}

export default function TicketPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [ticket, setTicket] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadTicketDetails = async () => {
      setIsLoading(true);
      setError('');
      try {
        // 1. Fetch the QR code
        const qrData = await getQRCode(id);
        setQrCodeUrl(qrData.qrCode);

        // 2. Resolve ticket information
        if (location.state?.ticket) {
          setTicket(location.state.ticket);
        } else {
          const orders = await fetchOrders();
          let foundTicket = null;
          for (const order of orders) {
            foundTicket = order.tickets?.find((t) => t._id === id);
            if (foundTicket) break;
          }
          if (!foundTicket) {
            throw new Error('Billet introuvable dans votre historique de commandes.');
          }
          setTicket(foundTicket);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Impossible de charger le billet.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTicketDetails();
  }, [id, location.state]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await downloadPDF(id);
    } catch (err) {
      alert(err.message || 'Erreur lors du téléchargement du PDF');
    } finally {
      setIsDownloading(false);
    }
  };

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
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="text-text-muted">Connecté</span>
              <span className="text-text-secondary font-medium">{user?.email}</span>
            </div>
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="px-4 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold rounded-full text-xs font-semibold tracking-wide transition-all duration-150 active:scale-95 inline-block text-center"
              >
                Portail Admin
              </Link>
            )}
            <ThemeToggle />
            <button
              onClick={logout}
              className="px-4 py-1.5 bg-bg-tertiary hover:bg-bg-elevated border border-border-light rounded-full text-xs font-semibold transition-all"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center gap-8">
        {/* Back Link */}
        <div className="w-full flex justify-start">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold-light transition-colors uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;historique
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-8 text-center w-full shadow-card max-w-md">
            <h3 className="text-lg font-bold text-text-primary mb-2">Erreur</h3>
            <p className="text-text-secondary text-sm mb-6">{error}</p>
            <Link
              to="/orders"
              className="inline-block bg-bg-tertiary hover:bg-bg-elevated border border-border-light text-brand-gold font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all"
            >
              Voir mes commandes
            </Link>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
            <p className="text-text-secondary text-xs font-mono uppercase tracking-widest animate-pulse">
              Chargement de votre billet...
            </p>
          </div>
        )}

        {/* Loaded Content */}
        {!isLoading && !error && ticket && (
          <div className="w-full space-y-8 flex flex-col items-center animate-fadeIn">
            {/* Page Title Header */}
            <div className="text-center">
              <p className="text-brand-gold font-mono text-xs tracking-widest uppercase mb-1">
                FIFA World Cup 2026
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                Votre Billet Officiel
              </h1>
              <p className="text-text-secondary text-xs mt-1">
                Présentez ce code QR lors du contrôle d&apos;accès au stade.
              </p>
            </div>

            {/* Glassmorphic Ticket Card */}
            <div className="w-full max-w-md bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-elevated border border-brand-gold/30 rounded-2xl shadow-card overflow-hidden transition-all duration-300 hover:border-brand-gold/60 hover:shadow-glow relative">
              {/* Gold header stripe */}
              <div className="h-1.5 bg-gradient-to-r from-brand-gold-dark via-brand-gold to-brand-gold-light" />

              {/* Main Ticket Info Section */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Match Information */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20 uppercase">
                      Billet Match
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      REF: {ticket._id?.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-wide text-text-primary">
                    {ticket.matchId?.teamA} <span className="text-brand-gold">VS</span> {ticket.matchId?.teamB}
                  </h2>
                  <p className="text-xs text-text-secondary font-medium">
                    {ticket.matchId ? formatMatchDate(ticket.matchId.date) : ''}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {ticket.matchId?.stadiumId?.name || 'Stade'}, {ticket.matchId?.stadiumId?.city || 'Ville'}
                  </p>
                </div>

                {/* Seat Information Grid */}
                <div className="grid grid-cols-2 gap-4 bg-bg-primary/40 border border-border-subtle rounded-xl p-4 text-xs">
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
                      Tribune / Section
                    </span>
                    <span className="font-bold text-text-primary text-sm">
                      Section {ticket.seatId?.section}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
                      Rangée / Siège
                    </span>
                    <span className="font-bold text-text-primary text-sm">
                      Rang {ticket.seatId?.row} • N°{ticket.seatId?.number}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
                      Catégorie
                    </span>
                    <span className="font-bold text-brand-gold text-sm">
                      Cat. {ticket.seatId?.category}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
                      Tarif
                    </span>
                    <span className="font-bold text-text-primary text-sm">
                      {ticket.seatId?.price?.toFixed(2)} $
                    </span>
                  </div>
                </div>
              </div>

              {/* Perforated Tear line */}
              <div className="relative flex items-center justify-between my-2">
                {/* Left Hole */}
                <div className="w-6 h-6 rounded-full bg-bg-primary border-r border-brand-gold/30 -ml-3 z-10" />
                {/* Dashed Line */}
                <div className="flex-1 border-t-2 border-dashed border-border-light" />
                {/* Right Hole */}
                <div className="w-6 h-6 rounded-full bg-bg-primary border-l border-brand-gold/30 -mr-3 z-10" />
              </div>

              {/* QR Code Section */}
              <div className="p-6 sm:p-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="bg-white p-4 rounded-xl shadow-inner border border-border-light relative group">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Ticket QR Code"
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center bg-bg-tertiary">
                      <span className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
                    </div>
                  )}
                  {/* Scanning scanlines effect for interactive premium feel */}
                  <div className="absolute inset-x-4 top-4 h-0.5 bg-brand-gold/50 shadow-glow animate-pulse pointer-events-none" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                    ID Unique Billet
                  </p>
                  <p className="font-mono text-xs text-text-secondary select-all">
                    {ticket._id}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="w-full max-w-md flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex-1 bg-brand-gold hover:bg-brand-gold-dark text-black font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:bg-bg-elevated disabled:text-text-muted flex justify-center items-center gap-2 shadow-glow font-sans"
              >
                {isDownloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Télécharger le PDF
                  </>
                )}
              </button>

              <Link
                to="/orders"
                className="flex-1 text-center bg-bg-secondary hover:bg-bg-tertiary border border-border-light text-text-primary font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all flex justify-center items-center gap-2"
              >
                Toutes mes commandes
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
