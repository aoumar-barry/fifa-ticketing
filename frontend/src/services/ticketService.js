import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

const API_BASE_URL = `${API_URL}/api/v1/tickets`;

export class TicketApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'TicketApiError';
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
      throw new TicketApiError(response.status, response.statusText || 'Request failed');
    }
    return null;
  }

  if (!response.ok) {
    throw new TicketApiError(
      response.status,
      data.message || 'API request failed',
      data.code || 'UNKNOWN_ERROR'
    );
  }

  return data;
}

export async function getQRCode(ticketId) {
  const res = await fetch(`${API_BASE_URL}/${ticketId}/qr`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function downloadPDF(ticketId) {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_BASE_URL}/${ticketId}/pdf`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let errorMsg = 'Failed to download ticket PDF';
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ticket-${ticketId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}
