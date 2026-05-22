import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/payment`;

export class PaymentApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'PaymentApiError';
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
      throw new PaymentApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new PaymentApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

export async function createPaymentIntent(cartId) {
  const res = await fetch(`${API_BASE_URL}/intent`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cartId }),
  });
  return handleResponse(res);
}

export async function confirmPayment(cartId, paymentIntentId) {
  const res = await fetch(`${API_BASE_URL}/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cartId, paymentIntentId }),
  });
  return handleResponse(res);
}
