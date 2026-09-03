import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 30000,
  retry: 2,
  retryDelay: 1000
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("aero_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !config.retry || error.response?.status === 401 || error.response?.status === 403) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= config.retry) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const delay = config.retryDelay || 1000;

    return new Promise((resolve) => {
      setTimeout(() => resolve(api(config)), delay);
    });
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
