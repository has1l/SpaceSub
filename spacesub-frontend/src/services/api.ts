import axios from "axios";

// In development, Vite proxies /api/* → localhost:3000 (see vite.config.ts).
// In production (Vercel), either:
//   1. vercel.json rewrites /api/* to the deployed backend (same-origin, no CORS)
//   2. VITE_API_URL points directly to the backend (cross-origin, requires CORS)
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "spacesub_token";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export { API_BASE, TOKEN_KEY };
export default api;
