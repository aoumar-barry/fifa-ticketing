import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/orders`;

export class OrderApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'OrderApiError';
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
    throw new OrderApiError(
      response.status,
      message,
      response.ok ? 'NON_JSON_RESPONSE' : 'UNKNOWN_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new OrderApiError(
      response.status,
      'Failed to parse JSON response from server',
      'INVALID_JSON'
    );
  }

  if (!response.ok) {
    throw new OrderApiError(
      response.status,
      data?.error?.message || data?.message || 'API request failed',
      data?.error?.code || data?.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

export async function fetchOrders() {
  const res = await fetch(API_BASE_URL, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function fetchOrder(orderId) {
  const res = await fetch(`${API_BASE_URL}/${orderId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}
