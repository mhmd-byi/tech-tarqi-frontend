import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
const TOKEN_KEY = "admin_token";
const USER_KEY = "panel_user";

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

export type PanelUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "provider" | "user";
};

export type Provider = {
  id: string;
  name: string;
  username: string;
  email: string;
  clientCount: number;
};

export type Admin = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export type AssignmentRow = {
  user: { id: string; name: string; username: string; email: string };
  assignment: { id: string; provider: { id: string; name: string }; since: string } | null;
};

export type Thread = {
  id: string;
  status: "active" | "archived";
  user: { id: string; name: string; username: string };
  since: string;
  archivedAt?: string;
};

export type Signal = {
  symbol: string;
  direction: "buy" | "sell";
  entry: number;
  stopLoss: number;
  targets: number[];
  note?: string;
};

export type ChatMessage = {
  id: string;
  scope: "broadcast" | "direct";
  provider: string;
  assignment?: string;
  kind: "text" | "image" | "signal";
  text?: string;
  signal?: Signal;
  hasImage: boolean;
  sender: { id: string; name: string; role: "provider" | "user" };
  createdAt: string;
};

export type OutgoingMessage =
  | { kind: "text"; text: string }
  | { kind: "image"; file: File; text?: string }
  | {
      kind: "signal";
      symbol: string;
      direction: "buy" | "sell";
      entry: string;
      stopLoss: string;
      targets: string;
      note?: string;
    };

export type PlanService = "forex" | "comex" | "index";
export type PlanTier = "bronze" | "silver" | "gold" | "platinum";

export type BillingMode = "recurring" | "one_time";

export type Plan = {
  id: string;
  service: PlanService;
  tier: PlanTier;
  label: string;
  priceCents: number;
  currency: string;
  intervalMonths: number;
  billingMode: BillingMode;
  popular: boolean;
  active: boolean;
  paypalLinked?: boolean;
};

export type SubscriptionRow = {
  id: string;
  status: "incomplete" | "active" | "past_due" | "canceled" | "unpaid";
  isActive: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  plan: Omit<Plan, "popular" | "active" | "paypalLinked"> | null;
  user: { _id: string; name: string; username: string; email: string } | null;
};

export class ApiError extends Error {}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredUser(): PanelUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PanelUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: PanelUser): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
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

function postJson<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function signIn(
  identifier: string,
  password: string
): Promise<{ token: string; user: PanelUser }> {
  return postJson("/auth/signin", { identifier, password });
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
  return postJson<KycSubmission>(`/kyc/${id}`, { status, rejectionReason }, "PATCH");
}

export function listProviders(): Promise<Provider[]> {
  return request<Provider[]>("/providers");
}

export function createProvider(input: {
  name: string;
  username: string;
  email: string;
  countryCode: string;
  mobile: string;
  password: string;
}): Promise<Provider> {
  return postJson<Provider>("/providers", input);
}

export function listAdmins(): Promise<Admin[]> {
  return request<Admin[]>("/admins");
}

export function createAdmin(input: {
  name: string;
  username: string;
  email: string;
  countryCode: string;
  mobile: string;
  password: string;
}): Promise<Admin> {
  return postJson<Admin>("/admins", input);
}

export function listAssignments(): Promise<AssignmentRow[]> {
  return request<AssignmentRow[]>("/assignments");
}

export function assignProvider(userId: string, providerId: string): Promise<unknown> {
  return postJson("/assignments", { userId, providerId });
}

export function archiveAssignment(id: string): Promise<unknown> {
  return request(`/assignments/${id}`, { method: "DELETE" });
}

export function listThreads(providerId?: string): Promise<Thread[]> {
  return request<Thread[]>(providerId ? `/chat/threads?providerId=${providerId}` : "/chat/threads");
}

export function listBroadcastMessages(providerId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/chat/broadcast/${providerId}/messages`);
}

export function listDirectMessages(
  assignmentId: string
): Promise<{ canPost: boolean; status: string; messages: ChatMessage[] }> {
  return request(`/chat/direct/${assignmentId}/messages`);
}

/** One multipart body for every kind keeps the server-side parsing in one place. */
function toFormData(message: OutgoingMessage): FormData {
  const form = new FormData();
  form.append("kind", message.kind);

  if (message.kind === "text") {
    form.append("text", message.text);
  } else if (message.kind === "image") {
    form.append("image", message.file);
    if (message.text) form.append("text", message.text);
  } else {
    form.append("symbol", message.symbol);
    form.append("direction", message.direction);
    form.append("entry", message.entry);
    form.append("stopLoss", message.stopLoss);
    form.append("targets", message.targets);
    if (message.note) form.append("note", message.note);
  }

  return form;
}

export function postBroadcastMessage(
  providerId: string,
  message: OutgoingMessage
): Promise<ChatMessage> {
  return request<ChatMessage>(`/chat/broadcast/${providerId}/messages`, {
    method: "POST",
    body: toFormData(message),
  });
}

export function postDirectMessage(
  assignmentId: string,
  message: OutgoingMessage
): Promise<ChatMessage> {
  return request<ChatMessage>(`/chat/direct/${assignmentId}/messages`, {
    method: "POST",
    body: toFormData(message),
  });
}

/**
 * Passport scans and chat images sit behind authenticated endpoints, so they can't
 * be loaded with a plain <img src>. Fetch the bytes with the token, hand back a blob URL.
 */
export async function fetchImageUrl(id: string, type: "passport" | "selfie"): Promise<string> {
  const response = await requestRaw(`/kyc/${id}/image/${type}`);
  return URL.createObjectURL(await response.blob());
}

export async function fetchMessageImageUrl(messageId: string): Promise<string> {
  const response = await requestRaw(`/chat/messages/${messageId}/image`);
  return URL.createObjectURL(await response.blob());
}

export function listPlans(): Promise<Plan[]> {
  return request<Plan[]>("/plans");
}

export function updatePlan(
  id: string,
  changes: { priceCents?: number; active?: boolean; popular?: boolean }
): Promise<Plan> {
  return postJson<Plan>(`/plans/${id}`, changes, "PATCH");
}

export function listSubscriptions(): Promise<SubscriptionRow[]> {
  return request<SubscriptionRow[]>("/subscriptions");
}

export function sendTestEmail(): Promise<{ message: string }> {
  return request<{ message: string }>("/mail/test", { method: "POST" });
}

export function connectSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  return io(SOCKET_URL, { auth: { token } });
}
