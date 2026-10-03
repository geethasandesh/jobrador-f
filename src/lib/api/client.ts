import type {
  BusinessDetail,
  JobDetail,
  LeadDetail,
  OpportunityList,
  SearchFilters,
} from "./types";
import { accessToken } from "../session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function failMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "The API is not running. Start jobrador-b on port 4000.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await failMessage(response));
  }
  return (await response.json()) as T;
}

export function searchPlaces(query: string, signal?: AbortSignal) {
  return request<{
    places: Array<{ label: string; latitude: number; longitude: number }>;
    outsideBerlin?: boolean;
  }>(`/v1/places?q=${encodeURIComponent(query)}`, { signal });
}

export function getOpportunities(filters: SearchFilters, signal?: AbortSignal) {
  const params = new URLSearchParams({
    lat: String(filters.latitude),
    lng: String(filters.longitude),
    radiusKm: String(filters.radiusKm),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.jobType) params.set("jobType", filters.jobType);
  if (filters.category) params.set("category", filters.category);
  if (filters.kinds) params.set("kinds", filters.kinds);
  if (filters.language) params.set("language", filters.language);
  if (filters.salary) params.set("salary", filters.salary);
  if (filters.sort) params.set("sort", filters.sort);
  return request<OpportunityList>(`/v1/opportunities?${params}`, { signal });
}

function withOrigin(path: string, origin?: { latitude: number; longitude: number }) {
  if (!origin) return path;
  const params = new URLSearchParams({
    lat: String(origin.latitude),
    lng: String(origin.longitude),
  });
  return `${path}?${params}`;
}

async function getOrNull<T>(path: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    return await request<T>(path, headers ? { headers } : undefined);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function getJob(id: string, origin?: { latitude: number; longitude: number }) {
  return getOrNull<JobDetail>(withOrigin(`/v1/jobs/${id}`, origin));
}

export async function getLead(id: string, origin?: { latitude: number; longitude: number }) {
  const token = typeof window === "undefined" ? null : await accessToken();
  return getOrNull<LeadDetail>(
    withOrigin(`/v1/leads/${id}`, origin),
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function getBusiness(id: string, origin?: { latitude: number; longitude: number }) {
  return getOrNull<BusinessDetail>(withOrigin(`/v1/businesses/${id}`, origin));
}

async function accountHeaders() {
  const token = await accessToken();
  if (!token) throw new ApiError(401, "Log in to share or update a tip.");
  return { Authorization: `Bearer ${token}` };
}

export function createLead(body: {
  businessName: string;
  description: string;
  jobType: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  area?: string;
  salaryMin?: number;
  hoursMin?: number;
  hoursMax?: number;
  poster?: "student" | "business";
}) {
  return accountHeaders().then((headers) =>
    request<LeadDetail>("/v1/leads", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

export type WallReaction = {
  emoji: string;
  count: number;
  mine: boolean;
};

export type WallNote = {
  id: string;
  displayName: string;
  body: string;
  color: string;
  status?: "pending" | "approved" | "rejected";
  createdAt: string;
  reactions: WallReaction[];
};

export function getWallNotes(deviceId: string) {
  const params = new URLSearchParams({ deviceId });
  return request<{ notes: WallNote[] }>(`/v1/wall?${params}`);
}

export function getMyWallNote(deviceId: string) {
  const params = new URLSearchParams({ deviceId });
  return request<{ note: WallNote | null }>(`/v1/wall/mine?${params}`);
}

export function reactToWallNote(noteId: string, body: { deviceId: string; emoji: string }) {
  return request<{ reactions: WallReaction[] }>(`/v1/wall/${noteId}/reactions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function stickWallNote(body: { displayName: string; body: string; color: string; deviceId: string }) {
  return request<WallNote>("/v1/wall", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type MyPost = {
  id: string;
  businessName: string;
  title: string;
  area: string;
  status: string;
  latitude: number;
  longitude: number;
  reportedAt: string;
};

export function listMyPosts() {
  return accountHeaders().then((headers) =>
    request<{ leads: MyPost[] }>("/v1/me/leads", { headers }),
  );
}

export function managePost(id: string, action: "stop" | "delete" | "reopen") {
  return accountHeaders().then((headers) =>
    request<{ ok: true; status: string }>(`/v1/leads/${id}/manage`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    }),
  );
}

export function confirmLead(id: string, status: "yes" | "no" | "unsure" | "done") {
  return accountHeaders().then((headers) =>
    request<LeadDetail & { notice?: string }>(`/v1/leads/${id}/confirmations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ status }),
    }),
  );
}

export function requestPasswordEmail(email: string) {
  return request<{ ok: true }>("/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function sendBugReport(body: { message: string; email?: string; page?: string }) {
  return request<{ ok: true }>("/v1/bugs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
