import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/cart`;

export class CartApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'CartApiError';
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
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new CartApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new CartApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

export async function createCart(matchId, seatId) {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ matchId, seatId }),
  });
  return handleResponse(res);
}

export async function getCart(cartId) {
  const res = await fetch(`${API_BASE_URL}/${cartId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function deleteCart(cartId) {
  const res = await fetch(`${API_BASE_URL}/${cartId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}
