import axios from 'axios';

// All API calls go through the gateway proxy: /bank-api/* → localhost:3001
// Works identically on localhost and through ngrok.
const API_BASE = '/bank-api';

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
      window.location.href = '/bank/';
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE };
