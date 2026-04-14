/**
 * Central config for API and WebSocket URLs.
 * Replace with your ngrok URL or production URL.
 */

// Use your ngrok HTTPS URL here (no trailing slash)
export const API_BASE_URL =
  "http://192.168.1.5:3000";

// WebSocket URL (wss for ngrok, ws for local)
export const WS_BASE_URL =
  "ws://192.168.1.5:3000/ws";

// Location update interval (ms)
export const LOCATION_UPDATE_INTERVAL = 5000;

// Google Maps API key
export const GOOGLE_API_KEY = "AIzaSyAfOQyqsb67GemOyufgIsggGUUY4TW4by4";
