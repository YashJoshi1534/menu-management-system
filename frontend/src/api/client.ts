import axios from "axios";
import { getCookie, setCookie, removeCookie } from "../utils/cookies";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = getCookie("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getCookie("refreshToken");

      if (refreshToken) {
        try {
          // Attempt to refresh
          const response = await axios.post("http://127.0.0.1:8000/auth/refresh", {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Save new tokens
          setCookie("accessToken", accessToken);
          setCookie("refreshToken", newRefreshToken);

          // Update business info in cookie if stored as JSON (optional but good for consistency)
          const businessStr = getCookie("business");
          if (businessStr) {
            const business = JSON.parse(businessStr);
            business.accessToken = accessToken;
            business.refreshToken = newRefreshToken;
            setCookie("business", JSON.stringify(business));
          }

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.setItem("session_expired", "true");
          removeCookie("business");
          removeCookie("outletUid");
          removeCookie("accessToken");
          removeCookie("refreshToken");
          localStorage.removeItem("business");
          window.location.href = "/";
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout 
        localStorage.setItem("session_expired", "true");
        removeCookie("business");
        removeCookie("outletUid");
        removeCookie("accessToken");
        removeCookie("refreshToken");
        localStorage.removeItem("business");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
