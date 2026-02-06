import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./Routing/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      {/* Toasts */}
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

      {/* App Routes */}
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
