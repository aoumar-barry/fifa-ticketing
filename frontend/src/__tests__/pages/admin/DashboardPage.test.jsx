import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../../../pages/admin/DashboardPage';
import { useAuthStore } from '../../../store/authStore';
import { fetchAdminStats, exportAdminSalesCSV } from '../../../services/adminService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../store/authStore');
jest.mock('../../../services/adminService');

describe('DashboardPage Component', () => {
  const mockUser = { id: 'admin1', email: 'admin@fifa.com', role: 'admin' };
  const mockStats = {
    totalRevenue: 2450.50,
    ticketsSold: 12,
    activeMatchesCount: 3,
    matchStats: [
      {
        match: {
          id: 'm1',
          teamA: 'France',
          teamB: 'Japan',
          round: 'group',
          date: '2026-06-17T20:00:00Z',
          totalSeats: 100,
          stadium: {
            id: 's1',
            name: 'Mercedes-Benz Stadium',
            city: 'Atlanta',
            country: 'USA'
          }
        },
        ticketsSold: 8,
        revenue: 1200,
        occupancyRate: 0.08
      },
      {
        match: {
          id: 'm2',
          teamA: 'USA',
          teamB: 'Germany',
          round: 'group',
          date: '2026-06-12T20:00:00Z',
          totalSeats: 50,
          stadium: {
            id: 's2',
            name: 'Gillette Stadium',
            city: 'Boston',
            country: 'USA'
          }
        },
        ticketsSold: 4,
        revenue: 1250.50,
        occupancyRate: 0.08
      }
    ]
  };

  beforeAll(() => {
    window.URL.createObjectURL = jest.fn(() => 'blob:mock-csv-url');
    window.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
    });
    fetchAdminStats.mockResolvedValue(mockStats);
  });

  test('renders loading spinner on mount', async () => {
    fetchAdminStats.mockReturnValueOnce(new Promise(() => {}));

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/chargement des statistiques/i)).toBeInTheDocument();
  });

  test('renders KPIs and match stats table successfully', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(fetchAdminStats).toHaveBeenCalled();
    });

    // Check KPIs
    expect(screen.getByText(/revenus totaux/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s*450,50\s*€/)).toBeInTheDocument(); // allow space between numbers
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByRole('columnheader', { name: /match/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /stade/i })).toBeInTheDocument();

    // Check table content
    expect(screen.getByText('France vs Japan')).toBeInTheDocument();
    expect(screen.getByText('USA vs Germany')).toBeInTheDocument();
    expect(screen.getByText('Mercedes-Benz Stadium')).toBeInTheDocument();

    // Occupancy rates
    expect(screen.getAllByText('8%')).toHaveLength(2);
  });

  test('handles CSV export successfully', async () => {
    const csvBlob = new Blob(['Order ID,Ticket ID,Buyer Email,Match\no1,t1,user@fifa.com,France vs Japan'], { type: 'text/csv' });
    exportAdminSalesCSV.mockResolvedValueOnce(csvBlob);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('France vs Japan')).toBeInTheDocument());

    const exportBtn = screen.getByRole('button', { name: /exporter les ventes/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportAdminSalesCSV).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(csvBlob);
    });
  });

  test('displays error message and handles retry', async () => {
    fetchAdminStats.mockRejectedValueOnce(new Error('Erreur de chargement de l\'API'));

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/erreur de chargement de l'api/i)).toBeInTheDocument();
    });

    // Mock success for retry
    fetchAdminStats.mockResolvedValueOnce(mockStats);

    const retryBtn = screen.getByRole('button', { name: /réessayer/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('France vs Japan')).toBeInTheDocument();
    });
  });
});
