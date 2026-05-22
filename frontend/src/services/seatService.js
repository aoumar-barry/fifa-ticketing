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
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new SeatApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new SeatApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
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
