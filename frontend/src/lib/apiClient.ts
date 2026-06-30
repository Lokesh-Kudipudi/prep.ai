import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: inject JWT Bearer Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("prepai.token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: handle 401 Unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config && error.config.url && error.config.url.includes("/auth/login");
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      console.warn("[apiClient] Unauthorized! Clearing token and redirecting to login.");
      localStorage.removeItem("prepai.token");
      
      // Force reload/redirect to login page
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
