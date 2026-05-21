import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MatchCard from '../../components/MatchCard';

describe('MatchCard Component', () => {
  const availableMatch = {
    id: 'match-1',
    teamA: 'France',
    teamB: 'Japan',
    round: 'Phase de Groupes',
    group: 'A',
    date: '2026-06-17T20:00:00Z',
    stadium: {
      name: 'Mercedes-Benz Stadium',
      city: 'Atlanta',
      country: 'USA'
    },
    availableSeats: 120,
    totalSeats: 120,
    isActive: true
  };

  const soldOutMatch = {
    ...availableMatch,
    id: 'match-2',
    availableSeats: 0
  };

  test('renders match details (teams, round, stadium, date) correctly', () => {
    render(
      <BrowserRouter>
        <MatchCard match={availableMatch} />
      </BrowserRouter>
    );

    // Verify team names
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getByText('Japan')).toBeInTheDocument();
    
    // Verify round
    expect(screen.getByText('Phase de Groupes')).toBeInTheDocument();

    // Verify stadium details
    expect(screen.getByText('Mercedes-Benz Stadium, Atlanta')).toBeInTheDocument();

    // Verify date is formatted (should contain weekday, day, month, time)
    // Note: JS Date parsing format can vary slightly by env timezone, but we can verify it contains time and text
    expect(screen.getByText(/juin/i)).toBeInTheDocument();
    expect(screen.getByText(/22:00|20:00/i)).toBeInTheDocument(); // matches depending on local runner time
  });

  test('renders active available badge and "Réserver" button when seats are available', () => {
    render(
      <BrowserRouter>
        <MatchCard match={availableMatch} />
      </BrowserRouter>
    );

    // Verify available badge
    const badge = screen.getByTestId('badge-available');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('120 places');

    // Verify book button
    const bookButton = screen.getByRole('link', { name: /réserver/i });
    expect(bookButton).toBeInTheDocument();
    expect(bookButton).toHaveAttribute('href', '/match/match-1');
  });

  test('renders "Complet" badge and disabled button when no seats are available', () => {
    render(
      <BrowserRouter>
        <MatchCard match={soldOutMatch} />
      </BrowserRouter>
    );

    // Verify unavailable badge
    const badge = screen.getByTestId('badge-unavailable');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Complet');

    // Verify book button is disabled
    const bookButton = screen.getByRole('button', { name: /complet/i });
    expect(bookButton).toBeInTheDocument();
    expect(bookButton).toBeDisabled();
  });
});
