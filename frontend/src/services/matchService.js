const API_BASE_URL = '/api/v1/matches';

/**
 * Custom error class for Match API requests
 */
export class MatchApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'MatchApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Helper to perform fetch requests with default options and parse JSON
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new MatchApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new MatchApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

/**
 * Fetch matches list with optional filters
 * @param {Object} filters - optional filters like { teamA, teamB, stadiumId, date }
 */
export async function fetchMatches(filters = {}) {
  const queryParams = new URLSearchParams();
  
  if (filters.teamA) queryParams.append('teamA', filters.teamA);
  if (filters.teamB) queryParams.append('teamB', filters.teamB);
  if (filters.stadiumId) queryParams.append('stadiumId', filters.stadiumId);
  if (filters.date) queryParams.append('date', filters.date);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return handleResponse(res);
}

/**
 * Fetch a single match by its ID
 * @param {string} id - the match ID
 */
export async function fetchMatchById(id) {
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return handleResponse(res);
}
