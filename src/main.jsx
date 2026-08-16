import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SwishProvider } from "./context/SwishContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SwishProvider>
        <App />
      </SwishProvider>
    </BrowserRouter>
  </React.StrictMode>
);