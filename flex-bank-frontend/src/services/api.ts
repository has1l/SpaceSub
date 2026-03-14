import axios from 'axios';

// All API calls go through the gateway proxy: /bank-api/* → localhost:3001
// Works identically on localhost and through LocalTunnel.
const API_BASE = `${window.location.origin}/bank-api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flexbank_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, token ? 'Auth: Bearer ...' + token.slice(-10) : 'Auth: NONE');
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
