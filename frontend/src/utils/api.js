import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("sw_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      // Only clear storage and redirect if it's NOT the initial /auth/me check
      const url = err.config?.url || "";
      if (!url.includes("/auth/me")) {
        localStorage.removeItem("sw_token");
        localStorage.removeItem("sw_user");
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

export default api;