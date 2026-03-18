import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./Routing/AppRoutes";
import { AuthProvider } from "./context/AuthContext";

import Loader from "./components/Loader";
import { useAuth } from "./context/AuthContext";

import { useEffect, useRef } from "react";
import api from "./api/client";

function AppContent() {
  const { globalLoading, setGlobalLoading } = useAuth();
  const activeRequests = useRef(0);
  const loaderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        activeRequests.current++;
        
        // Only start timeout if it's the first request and not already showing
        if (activeRequests.current === 1 && !loaderTimeout.current) {
          loaderTimeout.current = setTimeout(() => {
            setGlobalLoading(true);
          }, 200); // 200ms delay to avoid flickering on fast requests
        }
        return config;
      },
      (error) => {
        activeRequests.current = Math.max(0, activeRequests.current - 1);
        if (activeRequests.current === 0) {
          if (loaderTimeout.current) {
            clearTimeout(loaderTimeout.current);
            loaderTimeout.current = null;
          }
          setGlobalLoading(false);
        }
        return Promise.reject(error);
      }
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => {
        activeRequests.current = Math.max(0, activeRequests.current - 1);
        if (activeRequests.current === 0) {
          if (loaderTimeout.current) {
            clearTimeout(loaderTimeout.current);
            loaderTimeout.current = null;
          }
          setGlobalLoading(false);
        }
        return response;
      },
      (error) => {
        activeRequests.current = Math.max(0, activeRequests.current - 1);
        if (activeRequests.current === 0) {
          if (loaderTimeout.current) {
            clearTimeout(loaderTimeout.current);
            loaderTimeout.current = null;
          }
          setGlobalLoading(false);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
      if (loaderTimeout.current) clearTimeout(loaderTimeout.current);
    };
  }, [setGlobalLoading]);
  
  return (
    <>
      {globalLoading && <Loader />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        }}
      />
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
