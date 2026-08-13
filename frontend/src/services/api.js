import axios from 'axios';

const API_BASE_URL =
  'https://crossval-assignment-g25f.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const authRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/signup') ||
      requestUrl.includes('/auth/me');

    if (error.response?.status === 401 && !authRequest && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const wakeBackend = () =>
  api.get('/health', { timeout: 60000 }).catch((error) => {
    console.log('Backend wake-up ping failed:', error.message);
  });

export const authAPI = {
  signup: (email, password) => api.post('/auth/signup', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, orderData) => api.put(`/orders/${id}`, orderData),
  delete: (id) => api.delete(`/orders/${id}`),
  exportCsv: (from, to) =>
    api.get('/orders/export', {
      params: { from, to },
      responseType: 'blob',
    }),
};

export const paymentsAPI = {
  create: (paymentData) => api.post('/payments', paymentData),
  getAll: (params = {}) => api.get('/payments', { params }),
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
};

export default api;
