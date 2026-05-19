const API_BASE = '/api';

/**
 * Globalny handler dla odpowiedzi HTTP z serwera.
 */
async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || 'Wystąpił błąd połączenia z serwerem');
  }
  return data;
}

/**
 * Zhermetyzowany serwis komunikacji z backendem.
 * Wyciąga wszystkie operacje `fetch` poza komponenty Reacta.
 */
export const api = {
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },
  
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },
  
  resetPassword: async (data) => {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  
  getPackages: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/packages/?${query}`);
    return handleResponse(res);
  },
  
  createPackage: async (packageData) => {
    const res = await fetch(`${API_BASE}/packages/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packageData)
    });
    return handleResponse(res);
  },
  
  createPayPalOrder: async (id) => {
    const res = await fetch(`${API_BASE}/packages/${id}/paypal/create-order`, { method: 'POST' });
    return handleResponse(res);
  },
  
  capturePayPalOrder: async (id, orderId) => {
    const res = await fetch(`${API_BASE}/packages/${id}/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId })
    });
    return handleResponse(res);
  },
  
  assignPackage: async (id, courierId) => {
    const res = await fetch(`${API_BASE}/packages/${id}/assign?courier_id=${courierId}`, { method: 'PATCH' });
    return handleResponse(res);
  },
  
  updatePackageStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/packages/${id}/status?status=${status}`, { method: 'PATCH' });
    return handleResponse(res);
  },
  
  archivePackage: async (id, role) => {
    const res = await fetch(`${API_BASE}/packages/${id}/archive?role=${role}`, { method: 'PATCH' });
    return handleResponse(res);
  },
  
  getAdminStats: async (month) => {
    const res = await fetch(`${API_BASE}/admin/stats?month=${month}`);
    return handleResponse(res);
  },

  getQrUrl: (id) => `${API_BASE}/packages/${id}/qr`
};
