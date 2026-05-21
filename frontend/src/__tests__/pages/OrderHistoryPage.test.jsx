import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import OrderHistoryPage from '../../pages/OrderHistoryPage';
import { useAuthStore } from '../../store/authStore';
import { fetchOrders, fetchOrder } from '../../services/orderService';
import { downloadPDF } from '../../services/ticketService';

// Mock stores & services
jest.mock('../../store/authStore');
jest.mock('../../services/orderService', () => ({
  fetchOrders: jest.fn(),
  fetchOrder: jest.fn(),
}));
jest.mock('../../services/ticketService', () => ({
  downloadPDF: jest.fn(),
}));

// Mock react-router-dom useParams specifically for changing values
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const mockTicket = {
  _id: 'ticket-1',
  matchId: {
    teamA: 'France',
    teamB: 'Japan',
    date: '2026-06-17T20:00:00Z',
    stadiumId: {
      name: 'Estadio Azteca',
      city: 'Mexico City',
    },
  },
  seatId: {
    section: 'A1',
    row: 'A',
    number: 5,
    category: 'A',
    price: 150.0,
  },
};

const mockOrder = {
  _id: 'order-1',
  createdAt: '2026-05-20T10:00:00Z',
  status: 'confirmed',
  totalAmount: 150.0,
  tickets: [mockTicket],
};

describe('OrderHistoryPage Component', () => {
  const mockLogout = jest.fn();
  const mockUser = { email: 'user@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  describe('Master History List View', () => {
    beforeEach(() => {
      useParams.mockReturnValue({ id: undefined });
    });

    test('renders orders list when orders are found', async () => {
      fetchOrders.mockResolvedValueOnce([mockOrder]);

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      // Verify loading state
      expect(screen.getByText(/Chargement de l'historique/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Historique des Commandes/i })).toBeInTheDocument();
        expect(screen.getByText('order-1')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === 'France vs Japan')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === '150.00 $')).toBeInTheDocument();
        expect(screen.getByText('Confirmé')).toBeInTheDocument();
      });

      expect(fetchOrders).toHaveBeenCalledTimes(1);
    });

    test('renders empty state when no orders are found', async () => {
      fetchOrders.mockResolvedValueOnce([]);

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Aucune commande')).toBeInTheDocument();
        expect(screen.getByText(/Vous n'avez pas encore effectué de réservation/i)).toBeInTheDocument();
      });
    });

    test('renders error state and permits retry', async () => {
      fetchOrders.mockRejectedValueOnce(new Error('Failed to fetch'));

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });

      // Mock window.location.reload
      const originalLocation = window.location;
      delete window.location;
      window.location = { reload: jest.fn() };

      const retryBtn = screen.getByRole('button', { name: /Réessayer/i });
      fireEvent.click(retryBtn);

      expect(window.location.reload).toHaveBeenCalled();

      // Clean up
      window.location = originalLocation;
    });

    test('logs out when clicking Se déconnecter', async () => {
      fetchOrders.mockResolvedValueOnce([]);

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Se déconnecter/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Se déconnecter/i }));
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Order Details View', () => {
    beforeEach(() => {
      useParams.mockReturnValue({ id: 'order-1' });
    });

    test('renders order details when order is successfully loaded', async () => {
      fetchOrder.mockResolvedValueOnce(mockOrder);

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Récupération des détails de la commande/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Détails Commande')).toBeInTheDocument();
        expect(screen.getByText('order-1')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === '150.00 $')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === '(Section A1 • Cat. A)')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === 'Siège A-5')).toBeInTheDocument();
        expect(screen.getByText((content, node) => node.textContent.replace(/\s+/g, ' ').trim() === 'France vs Japan')).toBeInTheDocument();
      });

      expect(fetchOrder).toHaveBeenCalledWith('order-1');
    });

    test('triggers PDF download for specific ticket', async () => {
      fetchOrder.mockResolvedValueOnce(mockOrder);
      downloadPDF.mockResolvedValueOnce();

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /PDF/i })).toBeInTheDocument();
      });

      const pdfBtn = screen.getByRole('button', { name: /PDF/i });
      fireEvent.click(pdfBtn);

      expect(downloadPDF).toHaveBeenCalledWith('ticket-1');
    });

    test('renders detail error and back button if order load fails', async () => {
      fetchOrder.mockRejectedValueOnce(new Error('Order not found'));

      render(
        <BrowserRouter>
          <OrderHistoryPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Order not found')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Retour à l'historique/i })).toBeInTheDocument();
      });
    });
  });
});
