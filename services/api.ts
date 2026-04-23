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
  photoUrl?: string;
  licensePhotoUrl?: string;
  aadhaarCardPhotoUrl?: string;
  rcPhotoUrl?: string;
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
    body: JSON.stringify({ "HELLP": "YES" }),
  });
}

export async function updateRideStatus(
  rideId: number,
  status: "STARTED" | "COMPLETED" | "CANCELLED",
  otp?: number
) {
  return apiFetch(`/rides/${rideId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, otp }),
  });
}

export async function getRideStatus(rideId: number) {
  return apiFetch(`/rides/${rideId}/status`, {
    method: "GET",
  });
}

export async function getActiveRide() {
  return apiFetch("/rides/active", {
    method: "GET",
  });
}

export interface NearbyRideRequest {
  rideId: number;
  pickup: {
    lat: number;
    lng: number;
  };
  drop: {
    lat: number;
    lng: number;
  };
  price: number;
  paymentMode: "CASH" | "ONLINE";
  distanceKm?: number | null;
}

export async function getNearbyRideRequests(
  radiusKm = 6,
  limit = 25
): Promise<{ rides: NearbyRideRequest[] }> {
  return apiFetch(`/rides/nearby?radiusKm=${radiusKm}&limit=${limit}`, {
    method: "GET",
  });
}

export interface DriverHomeResponse {
  driver: {
    id: number;
    name: string;
    status: "OFFLINE" | "ONLINE" | "BUSY";
    rating: number | null;
    isApproved: boolean;
  };
  stats: {
    todayTrips: number;
    todayEarnings: number;
    lifetimeTrips: number;
    lifetimeEarnings: number;
    activeRideCount: number;
  };
}

export async function getDriverHomeData(): Promise<DriverHomeResponse> {
  return apiFetch("/driver/home", {
    method: "GET",
  });
}

export interface DriverAccountResponse {
  profile: {
    id: number;
    name: string;
    phoneNumber: string;
    vehicleNumber: string | null;
    licenseNumber: string | null;
    photoUrl: string | null;
    licensePhotoUrl: string | null;
    aadhaarCardPhotoUrl: string | null;
    isApproved: boolean;
    status: "OFFLINE" | "ONLINE" | "BUSY";
    rating: number | null;
    createdAt: string;
  };
  stats: {
    completedTrips: number;
    totalAssignedTrips: number;
    lifetimeEarnings: number;
    yearsOnPlatform: number;
    completionRate: number | null;
  };
}

export interface UpdateDriverAccountPayload {
  name?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  photoUrl?: string;
  licensePhotoUrl?: string;
  aadhaarCardPhotoUrl?: string;
}

export async function getDriverAccount(): Promise<DriverAccountResponse> {
  return apiFetch("/driver/account", {
    method: "GET",
  });
}

export async function updateDriverAccount(payload: UpdateDriverAccountPayload): Promise<{
  message: string;
  profile: DriverAccountResponse["profile"];
}> {
  return apiFetch("/driver/account", {
    method: "PATCH",
    body: JSON.stringify(payload),
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
