import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/matches`;

export class SeatApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'SeatApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse(response) {
  const contentType = response.headers ? response.headers.get('content-type') : 'application/json';
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    const text = await response.text();
    const snippet = text.slice(0, 100);
    const message = response.ok
      ? `Expected JSON response but received non-JSON (possibly HTML index page). Check your API URL configuration (VITE_API_URL). Snippet: "${snippet}"`
      : (response.statusText || 'Request failed');
    throw new SeatApiError(
      response.status,
      message,
      response.ok ? 'NON_JSON_RESPONSE' : 'UNKNOWN_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new SeatApiError(
      response.status,
      'Failed to parse JSON response from server',
      'INVALID_JSON'
    );
  }

  if (!response.ok) {
    throw new SeatApiError(
      response.status,
      data?.error?.message || data?.message || 'API request failed',
      data?.error?.code || data?.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

/**
 * Fetch seats for a specific match
 * @param {string} matchId - the match ID
 */
export async function fetchSeats(matchId) {
  const res = await fetch(`${API_BASE_URL}/${matchId}/seats`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
  return handleResponse(res);
}
