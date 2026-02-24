import axios from 'axios';

const API_BASE = 'http://flexbank.localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flexbank_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('flexbank_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE };
