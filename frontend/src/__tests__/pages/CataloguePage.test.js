import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CataloguePage from '../../pages/CataloguePage';
import { useAuthStore } from '../../store/authStore';
import { fetchMatches } from '../../services/matchService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock auth store
jest.mock('../../store/authStore');

// Mock match service
jest.mock('../../services/matchService', () => ({
  fetchMatches: jest.fn(),
  fetchMatchById: jest.fn()
}));

describe('CataloguePage Component', () => {
  const mockLogout = jest.fn();
  const mockUser = { email: 'test@fifa.com' };

  const mockMatches = [
    {
      id: 'm1',
      teamA: 'USA',
      teamB: 'Germany',
      round: 'Groupe A',
      date: '2026-06-12T20:00:00Z',
      stadium: { name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
      availableSeats: 50
    },
    {
      id: 'm2',
      teamA: 'France',
      teamB: 'Japan',
      round: 'Groupe A',
      date: '2026-06-17T20:00:00Z',
      stadium: { name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico' },
      availableSeats: 120
    },
    {
      id: 'm3',
      teamA: 'Canada',
      teamB: 'Germany',
      round: 'Groupe L',
      date: '2026-06-19T14:00:00Z',
      stadium: { name: 'BMO Field', city: 'Toronto', country: 'Canada' },
      availableSeats: 0
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({
      user: mockUser,
      logout: mockLogout
    });
    fetchMatches.mockResolvedValue(mockMatches);
  });

  test('renders navbar, user info and page title', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    // Verify header details
    expect(screen.getByText('FIFA')).toBeInTheDocument();
    expect(screen.getByText('Ticketing Hub')).toBeInTheDocument();
    expect(screen.getByText('test@fifa.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();

    // Verify page hero
    expect(screen.getByRole('heading', { name: /catalogue des matchs/i })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(fetchMatches).toHaveBeenCalled();
    });
  });

  test('fetches and lists matches on mount', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    // Initial loader skeleton should be visible
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    // Wait for matches to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    // Check cards rendering
    expect(screen.getAllByText('USA')[0]).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  test('filters matches based on team search input', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/rechercher une équipe/i);
    
    // Search "France"
    fireEvent.change(searchInput, { target: { value: 'France' } });

    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.queryByText('USA')).not.toBeInTheDocument();
    expect(screen.queryByText('Canada')).not.toBeInTheDocument();
  });

  test('filters matches based on stadium dropdown', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    const stadiumSelect = screen.getByLabelText(/stade/i);
    
    // Select BMO Field
    fireEvent.change(stadiumSelect, { target: { value: 'BMO Field' } });

    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.queryByText('USA')).not.toBeInTheDocument();
    expect(screen.queryByText('France')).not.toBeInTheDocument();
  });

  test('filters matches based on date picker', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    const dateInput = screen.getByLabelText(/date/i);
    
    // Match date for France vs Japan is 2026-06-17
    fireEvent.change(dateInput, { target: { value: '2026-06-17' } });

    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.queryByText('USA')).not.toBeInTheDocument();
    expect(screen.queryByText('Canada')).not.toBeInTheDocument();
  });

  test('resets all filters when clicking clear/reset action', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/rechercher une équipe/i);
    fireEvent.change(searchInput, { target: { value: 'Germany' } });

    // Both USA and Canada matches contain Germany
    expect(screen.getAllByText('USA')[0]).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.queryByText('France')).not.toBeInTheDocument();

    // Reset button should now be visible
    const resetBtn = screen.getByRole('button', { name: /réinitialiser les filtres/i });
    fireEvent.click(resetBtn);

    // All matches should be visible again
    expect(screen.getAllByText('USA')[0]).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  test('displays empty state when no matches match filters', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/rechercher une équipe/i);
    fireEvent.change(searchInput, { target: { value: 'InvalidTeam' } });

    expect(screen.getByText(/aucun match trouvé/i)).toBeInTheDocument();
    expect(screen.getByText(/aucun résultat ne correspond à vos critères de recherche/i)).toBeInTheDocument();

    // Reset from empty state button
    const resetBtns = screen.getAllByRole('button', { name: /réinitialiser les filtres/i });
    expect(resetBtns.length).toBe(2);
    fireEvent.click(resetBtns[1]);

    expect(screen.getByText('France')).toBeInTheDocument();
  });

  test('renders error state and handles retry click', async () => {
    fetchMatches.mockRejectedValueOnce(new Error('Erreur de connexion serveur'));

    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    expect(screen.getByText('Erreur de connexion serveur')).toBeInTheDocument();

    // Click retry
    fetchMatches.mockResolvedValueOnce(mockMatches);
    const retryBtn = screen.getByRole('button', { name: /réessayer/i });
    fireEvent.click(retryBtn);

    // Wait for skeleton, then data
    await waitFor(() => {
      expect(screen.getByText('France')).toBeInTheDocument();
    });
  });

  test('triggers logout store action when sign out clicked', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: /se déconnecter/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });

  test('navigates to user profile page when clicking profile button', async () => {
    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    const profileBtn = screen.getByRole('button', { name: /mon profil/i });
    fireEvent.click(profileBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('handles pagination correctly when there are more than 6 matches', async () => {
    const largeMockMatches = [
      { id: 'm1', teamA: 'TeamA1', teamB: 'TeamB1', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm2', teamA: 'TeamA2', teamB: 'TeamB2', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm3', teamA: 'TeamA3', teamB: 'TeamB3', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm4', teamA: 'TeamA4', teamB: 'TeamB4', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm5', teamA: 'TeamA5', teamB: 'TeamB5', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm6', teamA: 'TeamA6', teamB: 'TeamB6', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm7', teamA: 'TeamA7', teamB: 'TeamB7', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
      { id: 'm8', teamA: 'TeamA8', teamB: 'TeamB8', date: '2026-06-12T20:00:00Z', stadium: { name: 'S1' } },
    ];
    fetchMatches.mockResolvedValueOnce(largeMockMatches);

    render(
      <BrowserRouter>
        <CataloguePage />
      </BrowserRouter>
    );

    // Wait for loader to disappear and data to render
    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument());

    // Should only render the first 6 matches
    expect(screen.getByText('TeamA1')).toBeInTheDocument();
    expect(screen.getByText('TeamA6')).toBeInTheDocument();
    expect(screen.queryByText('TeamA7')).not.toBeInTheDocument();

    // Check pagination controls are visible
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('Page 1 sur 2');

    // Click next page
    const nextBtn = screen.getByRole('button', { name: /suivant/i });
    const prevBtn = screen.getByRole('button', { name: /précédent/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);

    // Page 2 matches should now be visible, page 1 should not
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('Page 2 sur 2');
    expect(screen.queryByText('TeamA1')).not.toBeInTheDocument();
    expect(screen.getByText('TeamA7')).toBeInTheDocument();
    expect(screen.getByText('TeamA8')).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();

    // Click previous page
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('page-indicator')).toHaveTextContent('Page 1 sur 2');
    expect(screen.getByText('TeamA1')).toBeInTheDocument();
    expect(screen.queryByText('TeamA7')).not.toBeInTheDocument();

    // Filter to reset page: search TeamA7
    const searchInput = screen.getByPlaceholderText(/rechercher une équipe/i);
    fireEvent.change(searchInput, { target: { value: 'TeamA7' } });

    // Since there's only 1 match (TeamA7) matching now, pagination controls should disappear
    expect(screen.getByText('TeamA7')).toBeInTheDocument();
    expect(screen.queryByTestId('pagination-controls')).not.toBeInTheDocument();
  });
});
