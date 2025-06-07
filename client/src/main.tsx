import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize Telegram Web App script if not already loaded
if (!window.Telegram?.WebApp) {
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.async = true;
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(<App />);
