import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CompareWindow from "./CompareWindow";
import "./index.css";

function parseCompareIds() {
  const raw = new URLSearchParams(window.location.search).get("compare");
  if (!raw) return null;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}

const compareIds = parseCompareIds();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {compareIds ? <CompareWindow runIds={compareIds} /> : <App />}
  </React.StrictMode>,
);
