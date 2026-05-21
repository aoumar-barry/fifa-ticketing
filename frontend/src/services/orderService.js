import { useAuthStore } from '../store/authStore';

const API_BASE_URL = '/api/v1/orders';

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
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new OrderApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new OrderApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
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
