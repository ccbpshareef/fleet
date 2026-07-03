import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ToastProvider from "./components/ToastProvider";
import "./styles.css";
import "./styles/mobileUi.css";
import "./styles/ui-refresh.css";
import "./styles/mobile-premium.css";
import "./styles/login.css";
import "./styles/fleetflow.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
