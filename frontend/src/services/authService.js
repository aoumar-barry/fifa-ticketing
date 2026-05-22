import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/auth`;

/**
 * Custom error class for API requests
 */
export class AuthApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Default fetch options — credentials: 'include' is required so that
 * httpOnly cookies (refreshToken) are sent and received across the
 * Vite dev-server proxy.
 */
const defaultOpts = { credentials: 'include' };

/**
 * Helper to perform fetch requests with default options
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    // If not JSON, throw generic error
    if (!response.ok) {
      throw new AuthApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

/**
 * Direct local registration
 */
export async function registerLocal(email, password, firstName, lastName, phone) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    ...defaultOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName, phone }),
  });
  return handleResponse(res);
}

/**
 * Direct local login
 */
export async function loginLocal(email, password) {
  const res = await fetch(`${API_BASE_URL}/login`, {
    ...defaultOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

/**
 * Firebase OAuth session login/sync
 */
export async function loginFirebase(idToken) {
  const res = await fetch(`${API_BASE_URL}/firebase`, {
    ...defaultOpts,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  });
  return handleResponse(res);
}

/**
 * Refresh local access token using HTTPOnly refresh token cookie
 */
export async function refreshAccessToken() {
  const res = await fetch(`${API_BASE_URL}/refresh`, {
    ...defaultOpts,
    method: 'POST',
  });
  return handleResponse(res);
}

/**
 * Log out user and clear refresh token cookie
 */
export async function logout() {
  const res = await fetch(`${API_BASE_URL}/logout`, {
    ...defaultOpts,
    method: 'POST',
  });
  return handleResponse(res);
}
