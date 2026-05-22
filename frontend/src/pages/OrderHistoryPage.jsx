import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchOrders, fetchOrder } from '../services/orderService';
import { downloadPDF } from '../services/ticketService';
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

function OrderDetailView({ orderId }) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingTicketId, setDownloadingTicketId] = useState(null);

  useEffect(() => {
    const loadOrder = async () => {
      setIsLoading(true);
      try {
        const data = await fetchOrder(orderId);
        setOrder(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Impossible de charger les détails de la commande.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrder();
  }, [orderId]);

  const handleDownloadPDF = async (ticketId) => {
    setDownloadingTicketId(ticketId);
    try {
      await downloadPDF(ticketId);
    } catch (err) {
      alert(err.message || 'Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingTicketId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
        <p className="text-text-secondary text-xs font-mono uppercase tracking-widest animate-pulse">
          Récupération des détails de la commande...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-8 text-center max-w-md mx-auto my-10 shadow-card">
        <h3 className="text-lg font-bold text-text-primary mb-2">Erreur</h3>
        <p className="text-text-secondary text-sm mb-6">{error || 'Commande introuvable.'}</p>
        <Link to="/orders" className="inline-block bg-bg-tertiary hover:bg-bg-elevated border border-border-light text-brand-gold font-bold px-5 py-2 rounded-full text-xs uppercase tracking-wider transition-all">
          Retour à l&apos;historique
        </Link>
      </div>
    );
  }

  // Extract match details from the first ticket if available
  const firstTicket = order.tickets?.[0];
  const match = firstTicket?.matchId;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back Link */}
      <div>
        <Link to="/orders" className="inline-flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold-light transition-colors uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à l&apos;historique
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Order Details Panel */}
        <section className="lg:col-span-4 bg-bg-secondary border border-border-light rounded-xl p-6 shadow-card space-y-6">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-3">
            Détails Commande
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">Référence :</span>
              <span className="font-mono text-text-primary font-bold">{order._id || orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Date d&apos;achat :</span>
              <span className="text-text-primary">{new Date(order.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Statut :</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                order.status === 'confirmed' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
              }`}>
                {order.status === 'confirmed' ? 'Confirmé' : 'En attente'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Méthode de paiement :</span>
              <span className="text-text-primary">Stripe</span>
            </div>
            <div className="border-t border-border-subtle pt-4 flex justify-between items-baseline">
              <span className="text-sm font-bold text-text-primary">Montant payé :</span>
              <span className="text-xl font-black text-brand-gold">{order.totalAmount?.toFixed(2)} $</span>
            </div>
          </div>
        </section>

        {/* Tickets Panel */}
        <section className="lg:col-span-8 space-y-6">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">
            Vos Billets ({order.tickets?.length || 0})
          </h3>

          <div className="space-y-4">
            {order.tickets?.map((ticket) => (
              <div 
                key={ticket._id}
                className="bg-bg-secondary border border-border-subtle hover:border-border-light rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
              >
                {/* Left side: Seat & Match Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-gold" />
                    <span className="font-bold text-sm text-text-primary">
                      Siège {ticket.seatId?.row}-{ticket.seatId?.number}
                    </span>
                    <span className="text-xs text-text-secondary">
                      (Section {ticket.seatId?.section} • Cat. {ticket.seatId?.category})
                    </span>
                  </div>

                  {ticket.matchId && (
                    <div className="text-xs text-text-secondary">
                      <p className="font-bold text-text-primary">
                        {ticket.matchId.teamA} vs {ticket.matchId.teamB}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {formatMatchDate(ticket.matchId.date)} • {ticket.matchId.stadiumId?.name || 'Stade'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <Link
                    to={`/tickets/${ticket._id}`}
                    state={{ ticket }}
                    className="flex-1 md:flex-initial text-center bg-bg-tertiary hover:bg-bg-elevated border border-border-light text-text-primary font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors"
                  >
                    Voir Billet
                  </Link>
                  <button
                    onClick={() => handleDownloadPDF(ticket._id)}
                    disabled={downloadingTicketId === ticket._id}
                    className="flex-1 md:flex-initial bg-brand-gold hover:bg-brand-gold-dark text-black font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:bg-bg-elevated disabled:text-text-muted flex justify-center items-center gap-1.5"
                  >
                    {downloadingTicketId === ticket._id ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        Export...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  const { id } = useParams();
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only load full order list if not in detailed view
    if (id) return;

    const loadOrders = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchOrders();
        setOrders(data || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Impossible de charger l\'historique des commandes.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, [id]);

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {id ? (
          <OrderDetailView orderId={id} />
        ) : (
          <div className="space-y-8">
            {/* Title */}
            <div>
              <p className="text-brand-gold font-mono text-xs tracking-widest uppercase mb-1">
                FIFA World Cup 2026
              </p>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                Historique des Commandes
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                Visualisez vos réservations de sièges et gérez vos billets de match.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-5 text-center max-w-xl mx-auto">
                <p className="text-text-primary font-bold mb-3">{error}</p>
                <button onClick={() => window.location.reload()} className="px-5 py-2 bg-brand-red text-white font-bold text-xs rounded-full hover:bg-red-600 transition-colors">
                  Réessayer
                </button>
              </div>
            )}

            {/* Loader */}
            {isLoading && !error && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
                <p className="text-text-secondary text-xs font-mono uppercase tracking-widest animate-pulse">
                  Chargement de l&apos;historique...
                </p>
              </div>
            )}

            {/* Orders List & Empty States */}
            {!isLoading && !error && (
              <>
                {orders.length > 0 ? (
                  <div className="bg-bg-secondary border border-border-light rounded-xl overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle bg-bg-tertiary text-text-secondary font-bold uppercase tracking-wider">
                            <th className="p-4">ID Commande</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Match</th>
                            <th className="p-4 text-right">Places</th>
                            <th className="p-4 text-right">Montant</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {orders.map((order) => {
                            const matchDetails = order.tickets?.[0]?.matchId;
                            return (
                              <tr key={order._id} className="hover:bg-bg-elevated/20 transition-colors">
                                <td className="p-4 font-mono font-bold text-text-primary">{order._id}</td>
                                <td className="p-4 text-text-secondary">
                                  {new Date(order.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                                </td>
                                <td className="p-4">
                                  {matchDetails ? (
                                    <div>
                                      <p className="font-bold text-text-primary">
                                        {matchDetails.teamA} vs {matchDetails.teamB}
                                      </p>
                                      <p className="text-[10px] text-text-muted mt-0.5">
                                        {matchDetails.stadiumId?.name || 'Stade'}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-text-muted">Détails indisponibles</span>
                                  )}
                                </td>
                                <td className="p-4 text-right font-medium text-text-primary">
                                  {order.tickets?.length || 0}
                                </td>
                                <td className="p-4 text-right font-bold text-brand-gold">
                                  {order.totalAmount?.toFixed(2)} $
                                </td>
                                <td className="p-4">
                                  <span className={`inline-block font-bold px-2 py-0.5 rounded text-[9px] uppercase ${
                                    order.status === 'confirmed' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
                                  }`}>
                                    {order.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <Link
                                    to={`/orders/${order._id}`}
                                    className="inline-block bg-bg-tertiary hover:bg-bg-elevated border border-border-light text-text-primary font-bold px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-colors"
                                  >
                                    Gérer / Voir
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-bg-secondary/40 border border-border-subtle border-dashed rounded-xl max-w-xl mx-auto">
                    <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-bold text-text-primary mb-1">Aucune commande</h3>
                    <p className="text-text-secondary text-sm mb-6 px-6">
                      Vous n&apos;avez pas encore effectué de réservation de billet. Parcourez le catalogue pour trouver votre match.
                    </p>
                    <Link to="/" className="inline-block bg-brand-gold hover:bg-brand-gold-dark text-black font-bold px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-colors">
                      Réserver un billet
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
