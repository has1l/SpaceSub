import axios from 'axios';

// In development, Vite proxies /bank-api/* → localhost:3001.
// In production (Vercel), VITE_API_URL points to the deployed mock-bank,
// or vercel.json rewrites /bank-api/* to the Railway mock-bank.
const API_BASE = import.meta.env.VITE_API_URL || '/bank-api';

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
