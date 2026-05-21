import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useLocation, useParams } from 'react-router-dom';
import TicketPage from '../../pages/TicketPage';
import { useAuthStore } from '../../store/authStore';
import { fetchOrders } from '../../services/orderService';
import { getQRCode, downloadPDF } from '../../services/ticketService';

// Mock stores & services
jest.mock('../../store/authStore');
jest.mock('../../services/orderService', () => ({
  fetchOrders: jest.fn(),
}));
jest.mock('../../services/ticketService', () => ({
  getQRCode: jest.fn(),
  downloadPDF: jest.fn(),
}));

// Mock react-router-dom useParams and useLocation specifically for changing values
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useLocation: jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const mockTicket = {
  _id: 'ticket-123',
  status: 'valid',
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

describe('TicketPage Component', () => {
  const mockLogout = jest.fn();
  const mockUser = { email: 'user@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
    useParams.mockReturnValue({ id: 'ticket-123' });
    getQRCode.mockResolvedValue({ qrCode: 'data:image/png;base64,mockqrcode' });
  });

  test('renders ticket page using location.state when ticket is present', async () => {
    useLocation.mockReturnValue({ state: { ticket: mockTicket } });

    render(
      <BrowserRouter>
        <TicketPage />
      </BrowserRouter>
    );

    // Initial loader
    expect(screen.getByText(/Chargement de votre billet/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Votre Billet Officiel/i })).toBeInTheDocument();
      expect(screen.getByText((content, node) => node.textContent === 'France VS Japan')).toBeInTheDocument();
      expect(screen.getByText((content, node) => node.textContent === 'Section A1')).toBeInTheDocument();
      expect(screen.getByText((content, node) => node.textContent === 'Rang A • N°5')).toBeInTheDocument();
      expect(screen.getByText((content, node) => node.textContent === 'Cat. A')).toBeInTheDocument();
      expect(screen.getByText((content, node) => node.textContent === '150.00 $')).toBeInTheDocument();
      expect(screen.getByAltText('Ticket QR Code')).toHaveAttribute('src', 'data:image/png;base64,mockqrcode');
    });

    expect(fetchOrders).not.toHaveBeenCalled();
  });

  test('fetches orders and scans for ticket when location.state is null', async () => {
    useLocation.mockReturnValue({ state: null });
    fetchOrders.mockResolvedValue([mockOrder]);

    render(
      <BrowserRouter>
        <TicketPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenCalled();
      expect(screen.getByText((content, node) => node.textContent === 'France VS Japan')).toBeInTheDocument();
      expect(screen.getByAltText('Ticket QR Code')).toBeInTheDocument();
    });
  });

  test('handles case when ticket is not found in orders', async () => {
    useLocation.mockReturnValue({ state: null });
    fetchOrders.mockResolvedValue([
      {
        _id: 'order-2',
        tickets: [],
      },
    ]);

    render(
      <BrowserRouter>
        <TicketPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Erreur' })).toBeInTheDocument();
      expect(screen.getByText(/Billet introuvable dans votre historique/i)).toBeInTheDocument();
    });
  });

  test('triggers downloadPDF service when clicking download button', async () => {
    useLocation.mockReturnValue({ state: { ticket: mockTicket } });
    downloadPDF.mockResolvedValueOnce();

    render(
      <BrowserRouter>
        <TicketPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Télécharger le PDF/i })).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /Télécharger le PDF/i });
    fireEvent.click(downloadBtn);

    expect(downloadPDF).toHaveBeenCalledWith('ticket-123');
    await waitFor(() => {
      expect(downloadBtn).not.toBeDisabled();
    });
  });
});
