import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { createPaymentIntent, confirmPayment } from '../services/paymentService';
import CartTimer from '../components/CartTimer';

// Initialize stripe. Use mock key if env variable is missing
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51MockPublishableKey'
);

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

function CheckoutForm({ clientSecret, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cart, clearCart } = useCartStore();
  const [nameOnCard, setNameOnCard] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!nameOnCard.trim()) {
      setErrorMessage('Veuillez entrer le nom du titulaire de la carte.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { paymentIntent, error } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: nameOnCard,
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Le paiement a échoué.');
      }

      if (paymentIntent.status === 'succeeded') {
        // 2. Confirm order in backend
        const confirmRes = await confirmPayment(cart.cartId, paymentIntent.id);
        
        // 3. Clear cart store and redirect to Order Details Page
        clearCart();
        navigate(`/orders/${confirmRes.orderId}`);
      } else {
        throw new Error('Le paiement n\'a pas pu être validé.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Une erreur est survenue lors du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm p-3 rounded-lg font-medium">
          {errorMessage}
        </div>
      )}

      {/* Name on Card Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-name" className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Nom du titulaire
        </label>
        <input
          id="card-name"
          type="text"
          placeholder="Ex: Jean Dupont"
          value={nameOnCard}
          onChange={(e) => setNameOnCard(e.target.value)}
          required
          className="w-full bg-bg-tertiary border border-border-light focus:border-brand-gold rounded-md py-2 px-3 text-sm text-text-primary focus:outline-none transition-all duration-150 focus:shadow-glow"
        />
      </div>

      {/* Stripe Card Element Wrapper */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Informations de paiement
        </label>
        <div className="p-3.5 bg-bg-tertiary border border-border-light rounded-md focus-within:border-brand-gold transition-all duration-150">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  fontSmoothing: 'antialiased',
                  fontSize: '14px',
                  '::placeholder': {
                    color: '#5A5A72',
                  },
                },
                invalid: {
                  color: '#FF4D4D',
                  iconColor: '#FF4D4D',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full bg-brand-gold hover:bg-brand-gold-dark disabled:bg-bg-elevated disabled:text-text-muted text-black font-bold py-3 rounded-lg transition-colors uppercase tracking-wider text-sm shadow-glow flex justify-center items-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            Traitement en cours...
          </>
        ) : (
          `Payer ${amount.toFixed(2)} $`
        )}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { cart } = useCartStore();
  const { user } = useAuthStore();
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cart?.cartId) {
      setIsLoading(false);
      return;
    }

    const fetchIntent = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await createPaymentIntent(cart.cartId);
        setClientSecret(res.clientSecret);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Impossible de préparer le paiement.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntent();
  }, [cart]);

  // If cart is empty or has expired
  if (!cart) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6">
        <div className="bg-bg-secondary border border-border-subtle rounded-xl p-8 max-w-md w-full text-center shadow-card">
          <svg className="w-12 h-12 text-brand-gold mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h2 className="text-xl font-bold text-text-primary mb-2">Votre panier est vide</h2>
          <p className="text-text-secondary text-sm mb-6">
            Votre session de réservation a expiré ou aucun siège n&apos;a été sélectionné.
          </p>
          <Link to="/" className="inline-block w-full bg-brand-gold hover:bg-brand-gold-dark text-black font-bold py-2.5 rounded-full text-xs uppercase tracking-wider transition-colors">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
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
          
          {/* Active Cart Timer */}
          <div>
            <CartTimer />
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Summary Card */}
        <section className="lg:col-span-5 bg-bg-secondary border border-border-light rounded-xl p-6 shadow-card space-y-6">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-3">
            Récapitulatif de la commande
          </h3>

          {cart.seat && (
            <div className="space-y-4">
              {/* Match description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                  FIFA World Cup 2026
                </span>
                <p className="font-bold text-text-primary text-lg tracking-wide">
                  {cart.seat.matchDetails?.teamA || 'Match'} vs {cart.seat.matchDetails?.teamB || 'Match'}
                </p>
                <p className="text-xs text-text-secondary">
                  {cart.seat.matchDetails?.date ? formatMatchDate(cart.seat.matchDetails.date) : ''}
                </p>
                <p className="text-xs text-text-muted">
                  {cart.seat.matchDetails?.stadium?.name}, {cart.seat.matchDetails?.stadium?.city}
                </p>
              </div>

              <div className="border-t border-border-subtle pt-4 space-y-2 text-xs">
                {/* Seat details */}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tribune / Section :</span>
                  <span className="font-medium text-text-primary">{cart.seat.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Rangée :</span>
                  <span className="font-medium text-text-primary">Rang {cart.seat.row}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Siège :</span>
                  <span className="font-medium text-text-primary">Place {cart.seat.number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Catégorie :</span>
                  <span className="font-medium text-text-primary">Cat. {cart.seat.category}</span>
                </div>
              </div>

              {/* Price Details */}
              <div className="border-t border-border-subtle pt-4 flex justify-between items-baseline">
                <span className="text-sm font-bold text-text-primary">Total :</span>
                <span className="text-2xl font-black text-brand-gold">{cart.seat.price?.toFixed(2)} $</span>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Payment Form Card */}
        <section className="lg:col-span-7 bg-bg-secondary border border-border-light rounded-xl p-6 shadow-card">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-3 mb-6">
            Informations de Facturation
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
              <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">
                Sécurisation du tunnel de paiement...
              </p>
            </div>
          ) : error ? (
            <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-5 text-center">
              <p className="text-text-primary font-bold mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-brand-red text-white font-bold text-xs rounded-full hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm clientSecret={clientSecret} amount={cart.seat?.price || 0} />
            </Elements>
          )}
        </section>

      </main>
    </div>
  );
}
