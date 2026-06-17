const API_BASE = '/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (localStorage.getItem('token')) {
      // Token wygasł lub jest nieprawidłowy — wyloguj automatycznie
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
      return;
    }
    // Brak tokenu = błąd logowania (złe hasło) — rzuć normalny błąd
    throw new Error(data.detail || 'Nieprawidłowa nazwa użytkownika lub hasło');
  }
  if (!res.ok) {
    throw new Error(data.detail || 'Wystąpił błąd połączenia z serwerem');
  }
  return data;
}

export const api = {
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  resetPassword: async (data) => {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getPackages: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/packages/?${query}`, { headers: authHeaders() });
    return handleResponse(res);
  },

  createPackage: async (packageData) => {
    const res = await fetch(`${API_BASE}/packages/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(packageData),
    });
    return handleResponse(res);
  },

  createPayPalOrder: async (id) => {
    const res = await fetch(`${API_BASE}/packages/${id}/paypal/create-order`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  capturePayPalOrder: async (id, orderId) => {
    const res = await fetch(`${API_BASE}/packages/${id}/paypal/capture-order`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ order_id: orderId }),
    });
    return handleResponse(res);
  },

  assignPackage: async (id, courierId) => {
    const res = await fetch(`${API_BASE}/packages/${id}/assign?courier_id=${courierId}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  updatePackageStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/packages/${id}/status?status=${status}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  archivePackage: async (id, role) => {
    const res = await fetch(`${API_BASE}/packages/${id}/archive?role=${role}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  getAdminStats: async (fromDate, toDate) => {
    const res = await fetch(`${API_BASE}/admin/stats?from_date=${fromDate}&to_date=${toDate}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  // Token jako query param — <img src> nie obsługuje nagłówków Authorization
  getQrUrl: (id) => `${API_BASE}/packages/${id}/qr?token=${getToken()}`,

  getDirectionsMapUrl: async (origin, destination) => {
    const params = new URLSearchParams({ origin, destination });
    const res = await fetch(`${API_BASE}/maps/directions?${params}`, { headers: authHeaders() });
    return handleResponse(res);
  },

  validateAddress: async (address) => {
    const res = await fetch(`${API_BASE}/maps/validate-address`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ address }),
    });
    return handleResponse(res);
  },

  autocompleteAddress: async (input) => {
    const params = new URLSearchParams({ input });
    const res = await fetch(`${API_BASE}/maps/autocomplete?${params}`, { headers: authHeaders() });
    return handleResponse(res);
  },

  estimatePackage: async (data) => {
    const res = await fetch(`${API_BASE}/packages/estimate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  optimizeRoute: async (data) => {
    const res = await fetch(`${API_BASE}/maps/optimize-route`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getAdminCouriersOverview: async () => {
    const res = await fetch(`${API_BASE}/admin/couriers-overview`, { headers: authHeaders() });
    return handleResponse(res);
  },

  getAdminClientsOverview: async () => {
    const res = await fetch(`${API_BASE}/admin/clients-overview`, { headers: authHeaders() });
    return handleResponse(res);
  },

  updateProfile: async (userId, data) => {
    const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  adminGetAllUsers: async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
    return handleResponse(res);
  },

  adminCreateUser: async (data) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  adminUpdateUser: async (userId, data) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  adminDeleteUser: async (userId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  adminChangeUserPassword: async (userId, newPassword) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/password`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ new_password: newPassword }),
    });
    return handleResponse(res);
  },

  adminGetAllPackages: async () => {
    const res = await fetch(`${API_BASE}/admin/packages`, { headers: authHeaders() });
    return handleResponse(res);
  },

  adminUpdatePackage: async (packageId, data) => {
    const res = await fetch(`${API_BASE}/admin/packages/${packageId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  adminDeletePackage: async (packageId) => {
    const res = await fetch(`${API_BASE}/admin/packages/${packageId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },
};
