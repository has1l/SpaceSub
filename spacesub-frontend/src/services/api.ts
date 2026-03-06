import axios from "axios";

// All API calls go through the Vite proxy: /api/* → localhost:3000
// This works identically on localhost and through ngrok.
const API_BASE = "/api";

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
