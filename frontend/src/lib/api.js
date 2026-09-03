import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://aeroflow-j4ga.onrender.com";
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

export function formatApiError(errOrDetail) {
  if (!errOrDetail) return "Unable to complete request. Please verify your details and try again.";

  // If passed an axios error object directly
  if (errOrDetail?.response?.data?.detail) {
    return formatApiError(errOrDetail.response.data.detail);
  }
  if (errOrDetail?.response?.data?.message) {
    return String(errOrDetail.response.data.message);
  }
  if (errOrDetail?.code === "ERR_NETWORK" || errOrDetail?.message?.includes("Network Error")) {
    return "Connecting to AeroFlow cloud servers. Please try again in a few seconds.";
  }
  if (errOrDetail?.code === "ECONNABORTED" || errOrDetail?.message?.includes("timeout")) {
    return "Request timed out. Please check your internet connection and try again.";
  }

  const detail = errOrDetail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  if (detail && typeof detail.detail === "string") return detail.detail;
  if (detail?.message) return String(detail.message);
  return String(detail);
}

// Background pre-warming ping to ensure zero-latency first interactions
try {
  if (typeof window !== "undefined") {
    setTimeout(() => {
      fetch(`${API}/health`, { method: "GET", mode: "cors" }).catch(() => {});
    }, 100);
  }
} catch {}

export default api;
