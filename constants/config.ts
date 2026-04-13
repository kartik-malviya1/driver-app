/**
 * Central config for API and WebSocket URLs.
 * Replace with your ngrok URL or production URL.
 */

// Use your ngrok HTTPS URL here (no trailing slash)
export const API_BASE_URL =
  "https://af9a-2409-40c4-35a-b665-4aa-1fa2-3c67-8945.ngrok-free.app";

// WebSocket URL (wss for ngrok, ws for local)
export const WS_BASE_URL =
  "wss://af9a-2409-40c4-35a-b665-4aa-1fa2-3c67-8945.ngrok-free.app/ws";

// Location update interval (ms)
export const LOCATION_UPDATE_INTERVAL = 5000;
