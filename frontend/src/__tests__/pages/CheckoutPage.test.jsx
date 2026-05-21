import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CheckoutPage from '../../pages/CheckoutPage';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import * as paymentService from '../../services/paymentService';

// Mock Stripe library elements
jest.mock('@stripe/react-stripe-js', () => {
  const React = require('react');
  return {
    Elements: ({ children }) => <div data-testid="stripe-elements">{children}</div>,
    CardElement: () => <div data-testid="card-element" />,
    useStripe: () => ({
      confirmCardPayment: jest.fn().mockResolvedValue({
        paymentIntent: { status: 'succeeded', id: 'pi_test_123' },
      }),
    }),
    useElements: () => ({
      getElement: () => 'mock-card-element',
    }),
  };
});

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../services/paymentService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const mockCart = {
  cartId: 'cart-456',
  expiresAt: new Date(Date.now() + 600 * 1000).toISOString(), // 10 minutes from now
  matchId: 'match-1',
  seatId: 'seat-a1',
  seat: {
    id: 'seat-a1',
    section: 'A1',
    row: 'A',
    number: 5,
    category: 'A',
    price: 150.00,
    matchDetails: {
      teamA: 'France',
      teamB: 'Japan',
      date: '2026-06-17T20:00:00Z',
      stadium: {
        name: 'Mercedes-Benz Stadium',
        city: 'Atlanta'
      }
    }
  }
};

describe('CheckoutPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'user@example.com' },
      isAuthenticated: true
    });
    useCartStore.setState({
      cart: null
    });
  });

  test('renders empty cart page when no active cart exists', () => {
    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Votre panier est vide')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour au catalogue/i })).toBeInTheDocument();
  });

  test('loads client secret and displays order summary', async () => {
    useCartStore.setState({ cart: mockCart });
    paymentService.createPaymentIntent.mockResolvedValueOnce({
      clientSecret: 'secret_123',
      paymentIntentId: 'pi_test_123',
    });

    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>
    );

    // Initial loading state
    expect(screen.getByText(/Sécurisation du tunnel/i)).toBeInTheDocument();

    await waitFor(() => {
      // Summary elements
      expect(screen.getByText('France vs Japan')).toBeInTheDocument();
      expect(screen.getByText('Mercedes-Benz Stadium, Atlanta')).toBeInTheDocument();
      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('Rang A')).toBeInTheDocument();
      expect(screen.getByText('Place 5')).toBeInTheDocument();
      expect(screen.getByText('150.00 $')).toBeInTheDocument();

      // Elements Stripe loaded
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
      expect(screen.getByTestId('card-element')).toBeInTheDocument();
    });
  });

  test('submitting checkout form triggers confirmation and navigation', async () => {
    useCartStore.setState({ cart: mockCart });
    paymentService.createPaymentIntent.mockResolvedValueOnce({
      clientSecret: 'secret_123',
      paymentIntentId: 'pi_test_123',
    });
    paymentService.confirmPayment.mockResolvedValueOnce({
      orderId: 'order-789',
    });

    render(
      <BrowserRouter>
        <CheckoutPage />
      </BrowserRouter>
    );

    // Wait for the components to load from paymentIntent endpoint
    await waitFor(() => {
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    });

    // Enter name
    const nameInput = screen.getByLabelText(/nom du titulaire/i);
    fireEvent.change(nameInput, { target: { value: 'Jean Dupont' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /payer 150.00 \$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentService.confirmPayment).toHaveBeenCalledWith('cart-456', 'pi_test_123');
      expect(useCartStore.getState().cart).toBeNull(); // cart cleared
      expect(mockNavigate).toHaveBeenCalledWith('/orders/order-789');
    });
  });
});
