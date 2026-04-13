import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/config";

const TOKEN_KEY = "@driver_app/auth_token";
const USER_KEY = "@driver_app/auth_user";

// ─── Token Management ───

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredUser(): Promise<{
  id: number;
  name: string;
  role: string;
} | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setStoredUser(user: {
  id: number;
  name: string;
  role: string;
}): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ─── Base Fetch Wrapper ───

async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log("API URL:", url);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  return data as T;
}

// ─── Auth APIs ───

export interface SendOtpResponse {
  message: string;
  exists: boolean;
}

export async function sendOtp(phoneNumber: string): Promise<SendOtpResponse> {
  return apiFetch("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, type: "driver" }),
  });
}

export interface VerifyOtpResponse {
  verified: boolean;
  exists: boolean;
  token?: string;
  user?: { id: number; name: string; role: string };
}

export async function verifyOtp(
  phoneNumber: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  return apiFetch("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, otp, type: "driver" }),
  });
}

export interface SignupData {
  name: string;
  phoneNumber: string;
  email?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
}

export interface SignupResponse {
  message: string;
  token: string;
  user: { id: number; name: string; role: string };
}

export async function signup(data: SignupData): Promise<SignupResponse> {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ ...data, type: "driver" }),
  });
}

// ─── Ride APIs ───

export async function acceptRide(rideId: number) {
  return apiFetch(`/rides/${rideId}/accept`, {
    method: "PATCH",
  });
}

export async function updateRideStatus(
  rideId: number,
  status: "STARTED" | "COMPLETED" | "CANCELLED",
) {
  return apiFetch(`/rides/${rideId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getRideStatus(rideId: number) {
  return apiFetch(`/rides/${rideId}/status`, {
    method: "GET",
  });
}

// ─── Location API ───

export async function updateLocationRest(
  driverId: number,
  lat: number,
  lng: number,
) {
  return apiFetch("/location/update", {
    method: "POST",
    body: JSON.stringify({ id: driverId, role: "driver", lat, lng }),
  });
}
