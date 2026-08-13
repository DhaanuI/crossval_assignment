import axios from 'axios';

// Backend API URL - Render deployment
const API_BASE_URL = 'https://crossval-assignment-g25f.onrender.com/api';

// For local development, uncomment this line and comment the line above:
// const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if user has a token (actual auth failure)
    // Don't redirect if they're trying to login/signup with wrong credentials
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const wakeBackend = () =>
  api.get('/health', { timeout: 60000 }).catch((error) => {
    console.log('Backend wake-up ping failed:', error.message);
  });

// Auth API
export const authAPI = {
  signup: (email, password) => api.post('/auth/signup', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// Orders API
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: (status) => api.get('/orders', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, orderData) => api.put(`/orders/${id}`, orderData),
  delete: (id) => api.delete(`/orders/${id}`),
};

// Payments API
export const paymentsAPI = {
  create: (paymentData) => api.post('/payments', paymentData),
  getAll: () => api.get('/payments'),
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
};

export default api;
