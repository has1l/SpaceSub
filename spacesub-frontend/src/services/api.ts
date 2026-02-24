import axios from "axios";

const API_BASE = "http://spacesub.localhost:3000";
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
