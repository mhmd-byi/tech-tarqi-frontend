const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const TOKEN_KEY = "admin_token";

export type KycStatus = "pending" | "approved" | "rejected";

export type KycUser = {
  _id: string;
  name: string;
  username: string;
  email: string;
  countryCode: string;
  mobile: string;
};

export type KycSubmission = {
  id: string;
  status: KycStatus;
  fullName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  expiryDate: string;
  rejectionReason?: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
  user: KycUser;
};

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
};

export class ApiError extends Error {}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function requestRaw(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError("Could not reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data?.message ?? "Something went wrong");
  }

  return response;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await requestRaw(path, init);
  return (await response.json()) as T;
}

export async function signIn(
  identifier: string,
  password: string
): Promise<{ token: string; user: AdminUser }> {
  return request("/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
}

export function listSubmissions(status?: KycStatus): Promise<KycSubmission[]> {
  return request<KycSubmission[]>(status ? `/kyc?status=${status}` : "/kyc");
}

export function getSubmission(id: string): Promise<KycSubmission> {
  return request<KycSubmission>(`/kyc/${id}`);
}

export function reviewSubmission(
  id: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<KycSubmission> {
  return request<KycSubmission>(`/kyc/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, rejectionReason }),
  });
}

/**
 * Passport scans sit behind an admin-only endpoint, so they can't be loaded with
 * a plain <img src>. Fetch the bytes with the token and hand back an object URL.
 */
export async function fetchImageUrl(
  id: string,
  type: "passport" | "selfie"
): Promise<string> {
  const response = await requestRaw(`/kyc/${id}/image/${type}`);
  return URL.createObjectURL(await response.blob());
}
