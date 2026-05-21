import { fetchMatches, fetchMatchById, MatchApiError } from '../../services/matchService';

describe('matchService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchMatches', () => {
    test('calls GET /api/v1/matches with correct headers', async () => {
      const mockMatches = [
        { id: '1', teamA: 'USA', teamB: 'Germany', availableSeats: 50 },
        { id: '2', teamA: 'France', teamB: 'Japan', availableSeats: 0 }
      ];
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockMatches)
      });

      const result = await fetchMatches();

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/matches', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      expect(result).toEqual(mockMatches);
    });

    test('calls GET /api/v1/matches with query parameters when filters are provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([])
      });

      await fetchMatches({
        teamA: 'France',
        stadiumId: 'stadium-123',
        date: '2026-06-12'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/matches?teamA=France&stadiumId=stadium-123&date=2026-06-12',
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }
      );
    });

    test('throws MatchApiError on unsuccessful response', async () => {
      const mockErrorResponse = {
        message: 'Invalid query parameters',
        code: 'INVALID_INPUT'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValueOnce(mockErrorResponse)
      });

      try {
        await fetchMatches({ date: 'invalid-date' });
        throw new Error('Should have thrown MatchApiError');
      } catch (err) {
        expect(err).toBeInstanceOf(MatchApiError);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Invalid query parameters');
        expect(err.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('fetchMatchById', () => {
    test('calls GET /api/v1/matches/:id with correct headers', async () => {
      const mockMatch = { id: 'match-123', teamA: 'USA', teamB: 'Germany' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockMatch)
      });

      const result = await fetchMatchById('match-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/matches/match-123', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      expect(result).toEqual(mockMatch);
    });

    test('throws MatchApiError on match not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValueOnce({
          message: 'Match not found',
          code: 'MATCH_NOT_FOUND'
        })
      });

      await expect(fetchMatchById('unknown-id')).rejects.toThrow(MatchApiError);
    });
  });
});
