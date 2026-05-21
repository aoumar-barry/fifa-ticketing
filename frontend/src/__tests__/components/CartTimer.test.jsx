import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CartTimer from '../../components/CartTimer';
import { useCartStore } from '../../store/cartStore';
import * as cartService from '../../services/cartService';

jest.mock('../../services/cartService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('CartTimer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useCartStore.setState({
      cart: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not render if there is no active cart', () => {
    const { container } = render(
      <BrowserRouter>
        <CartTimer />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders MM:SS countdown correctly based on expiresAt', () => {
    const expiresAt = new Date(Date.now() + 500 * 1000); // 500 seconds (~8m 20s)
    useCartStore.setState({
      cart: {
        cartId: 'cart-123',
        expiresAt: expiresAt.toISOString(),
      },
    });

    render(
      <BrowserRouter>
        <CartTimer />
      </BrowserRouter>
    );

    expect(screen.getByTestId('cart-timer-countdown')).toHaveTextContent('08:20');
  });

  test('turns red when time is under 2 minutes', () => {
    const expiresAt = new Date(Date.now() + 110 * 1000); // 110 seconds (~1m 50s)
    useCartStore.setState({
      cart: {
        cartId: 'cart-123',
        expiresAt: expiresAt.toISOString(),
      },
    });

    render(
      <BrowserRouter>
        <CartTimer />
      </BrowserRouter>
    );

    const countdown = screen.getByTestId('cart-timer-countdown');
    expect(countdown).toHaveClass('text-brand-red');
    expect(screen.getByTestId('cart-timer-container')).not.toHaveClass('animate-pulse');
  });

  test('pulses when time is under 1 minute', () => {
    const expiresAt = new Date(Date.now() + 45 * 1000); // 45 seconds
    useCartStore.setState({
      cart: {
        cartId: 'cart-123',
        expiresAt: expiresAt.toISOString(),
      },
    });

    render(
      <BrowserRouter>
        <CartTimer />
      </BrowserRouter>
    );

    const container = screen.getByTestId('cart-timer-container');
    expect(container).toHaveClass('animate-pulse');
  });

  test('calls deleteCart, clearCart, and redirects to home on expiration', async () => {
    const expiresAt = new Date(Date.now() + 2 * 1000); // 2 seconds
    useCartStore.setState({
      cart: {
        cartId: 'cart-123',
        expiresAt: expiresAt.toISOString(),
      },
    });

    cartService.deleteCart.mockResolvedValueOnce({ success: true });

    render(
      <BrowserRouter>
        <CartTimer />
      </BrowserRouter>
    );

    expect(screen.getByTestId('cart-timer-countdown')).toHaveTextContent('00:02');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(cartService.deleteCart).toHaveBeenCalledWith('cart-123');
      expect(useCartStore.getState().cart).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
