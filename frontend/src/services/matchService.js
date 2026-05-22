import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/matches`;

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
  const contentType = response.headers ? response.headers.get('content-type') : 'application/json';
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    const text = await response.text();
    const snippet = text.slice(0, 100);
    const message = response.ok
      ? `Expected JSON response but received non-JSON (possibly HTML index page). Check your API URL configuration (VITE_API_URL). Snippet: "${snippet}"`
      : (response.statusText || 'Request failed');
    throw new MatchApiError(
      response.status,
      message,
      response.ok ? 'NON_JSON_RESPONSE' : 'UNKNOWN_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new MatchApiError(
      response.status,
      'Failed to parse JSON response from server',
      'INVALID_JSON'
    );
  }

  if (!response.ok) {
    throw new MatchApiError(
      response.status,
      data?.error?.message || data?.message || 'API request failed',
      data?.error?.code || data?.code || 'UNKNOWN_ERROR'
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
