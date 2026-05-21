import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SeatMap from '../../components/SeatMap';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import * as cartService from '../../services/cartService';

jest.mock('../../services/cartService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockSeats = [
  {
    id: 'seat-a1',
    section: 'A1',
    row: 'A',
    number: 1,
    category: 'A',
    price: 150,
    status: 'available',
  },
  {
    id: 'seat-b1',
    section: 'B1',
    row: 'E',
    number: 1,
    category: 'B',
    price: 100,
    status: 'sold',
  },
  {
    id: 'seat-c1',
    section: 'C1',
    row: 'I',
    number: 1,
    category: 'C',
    price: 50,
    status: 'locked',
  },
];

describe('SeatMap Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset stores
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@example.com' },
    });
    useCartStore.setState({
      cart: null,
    });
  });

  test('renders stadium map, sections and legend', () => {
    render(
      <BrowserRouter>
        <SeatMap matchId="match-1" seats={mockSeats} onRefreshSeats={jest.fn()} />
      </BrowserRouter>
    );

    // Section Titles
    expect(screen.getByText('TRIBUNE NORD — CATÉGORIE A')).toBeInTheDocument();
    expect(screen.getByText('TRIBUNE OUEST — CATÉGORIE B')).toBeInTheDocument();
    expect(screen.getByText('TRIBUNE EST — CATÉGORIE C')).toBeInTheDocument();

    // Legend
    expect(screen.getByText('Catégorie A (150 $)')).toBeInTheDocument();
    expect(screen.getByText('Catégorie B (100 $)')).toBeInTheDocument();
    expect(screen.getByText('Catégorie C (50 $)')).toBeInTheDocument();
    expect(screen.getByText('Occupé / Indisponible')).toBeInTheDocument();
  });

  test('clicking available seat reserves it and updates store', async () => {
    const mockRefresh = jest.fn();
    cartService.createCart.mockResolvedValueOnce({
      cartId: 'cart-123',
      expiresAt: '2026-05-21T18:00:00Z',
    });

    const { container } = render(
      <BrowserRouter>
        <SeatMap matchId="match-1" seats={mockSeats} onRefreshSeats={mockRefresh} />
      </BrowserRouter>
    );

    // Get the seat circle element for seat-a1 (the only available seat in mockSeats)
    // We can identify it by class and coordinate mapping. Or we can select the parent g element.
    // In our component, we render a g with key={seat.id} and inside it is the circle.
    // Let's find the circle with the 'stadium-seat' class that does NOT have 'disabled'
    const availableSeats = container.querySelectorAll('.stadium-seat:not(.disabled)');
    expect(availableSeats.length).toBe(1);

    fireEvent.click(availableSeats[0]);

    await waitFor(() => {
      expect(cartService.createCart).toHaveBeenCalledWith('match-1', 'seat-a1');
      expect(useCartStore.getState().cart).toEqual({
        cartId: 'cart-123',
        expiresAt: '2026-05-21T18:00:00Z',
        matchId: 'match-1',
        seatId: 'seat-a1',
        seat: mockSeats[0],
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  test('clicking unavailable (sold/locked) seat does nothing', async () => {
    const mockRefresh = jest.fn();
    const { container } = render(
      <BrowserRouter>
        <SeatMap matchId="match-1" seats={mockSeats} onRefreshSeats={mockRefresh} />
      </BrowserRouter>
    );

    const disabledSeats = container.querySelectorAll('.stadium-seat.disabled');
    expect(disabledSeats.length).toBe(2);

    fireEvent.click(disabledSeats[0]);

    expect(cartService.createCart).not.toHaveBeenCalled();
    expect(useCartStore.getState().cart).toBeNull();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  test('redirects to /login if unauthenticated user clicks a seat', async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });

    const { container } = render(
      <BrowserRouter>
        <SeatMap matchId="match-1" seats={mockSeats} onRefreshSeats={jest.fn()} />
      </BrowserRouter>
    );

    const availableSeats = container.querySelectorAll('.stadium-seat:not(.disabled)');
    fireEvent.click(availableSeats[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(cartService.createCart).not.toHaveBeenCalled();
  });

  test('shows confirmation panel when seat is selected in cart', () => {
    useCartStore.setState({
      cart: {
        cartId: 'cart-123',
        expiresAt: '2026-05-21T18:00:00Z',
        matchId: 'match-1',
        seatId: 'seat-a1',
        seat: mockSeats[0],
      },
    });

    render(
      <BrowserRouter>
        <SeatMap matchId="match-1" seats={mockSeats} onRefreshSeats={jest.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Siège sélectionné :')).toBeInTheDocument();
    expect(screen.getByText('Rangée A, Place 1 (150 $)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /commander/i })).toBeInTheDocument();
  });
});
