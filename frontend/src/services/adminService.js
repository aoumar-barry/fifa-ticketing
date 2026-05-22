import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/admin`;

export class AdminApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

function getAuthHeaders() {
  const token = useAuthStore.getState().accessToken;
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
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
    throw new AdminApiError(
      response.status,
      message,
      response.ok ? 'NON_JSON_RESPONSE' : 'UNKNOWN_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new AdminApiError(
      response.status,
      'Failed to parse JSON response from server',
      'INVALID_JSON'
    );
  }

  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      data?.error?.message || data?.message || 'API request failed',
      data?.error?.code || data?.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

export async function fetchAdminMatches() {
  const res = await fetch(`${API_BASE_URL}/matches`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createAdminMatch(matchData) {
  const res = await fetch(`${API_BASE_URL}/matches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(matchData),
  });
  return handleResponse(res);
}

export async function updateAdminMatch(id, matchData) {
  const res = await fetch(`${API_BASE_URL}/matches/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(matchData),
  });
  return handleResponse(res);
}

export async function deactivateAdminMatch(id) {
  const res = await fetch(`${API_BASE_URL}/matches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchAdminStadiums() {
  const res = await fetch(`${API_BASE_URL}/stadiums`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}
