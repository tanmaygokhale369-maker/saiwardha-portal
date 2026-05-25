import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global responsive styles
const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  @media (max-width: 768px) {
    .desktop-sidebar { display: none !important; }
  }
  @media (min-width: 769px) {
    .mobile-drawer { display: none !important; }
  }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { opacity: 1; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.StrictMode><App /></React.StrictMode>);