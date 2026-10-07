import type {
  BusinessDetail,
  JobDetail,
  LeadDetail,
  OpportunityList,
  SearchFilters,
} from "./types";
import { accessToken } from "../access-token";

const API_ORIGIN = "https://jobrador-b.vercel.app";

function apiUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!configured) return process.env.NODE_ENV === "development" ? "http://localhost:4000" : API_ORIGIN;
  try {
    const host = new URL(configured).hostname;
    if (host === "localhost" || host === "127.0.0.1") return configured;
    if (host === "jobrador.online" || host === "www.jobrador.online" || host.startsWith("jobrador-f")) return API_ORIGIN;
  } catch {
    return API_ORIGIN;
  }
  return configured;
}

const API_URL = apiUrl();

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
    throw new ApiError(0, "The map service did not respond. Try again in a moment.");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await failMessage(response));
  }
  return (await response.json()) as T;
}

export function registerAccount(email: string, password: string) {
  return request<{ ok: true }>("/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
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

async function accountHeaders(message = "Log in to share or update a tip.") {
  const token = await accessToken();
  if (!token) throw new ApiError(401, message);
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

export type Referral = {
  id: string;
  authorName: string;
  message: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  mine: boolean;
};

export function getReferrals() {
  return accountHeaders().then((headers) =>
    request<{ referrals: Referral[]; admin: boolean; pendingCount: number }>("/v1/referrals", { headers }),
  );
}

export function sendReferral(body: { message: string }) {
  return accountHeaders().then((headers) =>
    request<Referral>("/v1/referrals", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

export function getReferralQueue() {
  return accountHeaders().then((headers) =>
    request<{ pending: Referral[]; history: Referral[] }>("/v1/referrals/queue", { headers }),
  );
}

export function reviewReferral(id: string, action: "approve" | "reject") {
  return accountHeaders().then((headers) =>
    request<Referral>(`/v1/referrals/${id}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    }),
  );
}

export type AdminOverview = {
  counts: {
    users: number | null;
    referralsPending: number;
    referralsApproved: number;
    referralsDeclined: number;
    bugReports: number;
    bugsOpen: number;
    closuresPending: number;
    jobs: number;
    tips: number;
    businessPosts: number;
    wallNotes: number;
  };
  accounts: Array<{ email: string; createdAt: string }> | null;
  referrals: { pending: Referral[]; history: Referral[] };
  bugs: Array<{ id: string; message: string; email: string | null; page: string | null; createdAt: string; handledAt: string | null }>;
};

export type LibraryKind = "job" | "community_lead" | "nearby_business";

export type LibraryState = {
  saved: Array<{ id: string; kind: LibraryKind }>;
  visits: Array<{ id: string; kind: LibraryKind; title: string; subtitle: string; href: string }>;
};

export function readLibrary() {
  return accountHeaders("Log in to see saved jobs.").then((headers) => request<LibraryState>("/v1/library", { headers }));
}

export function mergeLibrary(body: LibraryState) {
  return accountHeaders("Log in to save a job.").then((headers) =>
    request<LibraryState>("/v1/library/merge", { method: "POST", headers, body: JSON.stringify(body) }),
  );
}

export function setLibrarySaved(body: { id: string; saved: boolean; kind: LibraryKind }) {
  return accountHeaders("Log in to save a job.").then((headers) =>
    request<{ ok: true }>("/v1/library/saved", { method: "POST", headers, body: JSON.stringify(body) }),
  );
}

export function addLibraryVisit(body: LibraryState["visits"][number]) {
  return accountHeaders("Log in to keep a visit list.").then((headers) =>
    request<{ ok: true }>("/v1/library/visits", { method: "POST", headers, body: JSON.stringify(body) }),
  );
}

export function removeLibraryVisit(id: string) {
  return accountHeaders("Log in to keep a visit list.").then((headers) =>
    request<{ ok: true }>(`/v1/library/visits/${encodeURIComponent(id)}`, { method: "DELETE", headers }),
  );
}

export type ClosureReport = {
  id: string;
  jobId: string;
  placeName: string;
  jobTitle: string;
  status: "pending" | "confirmed" | "dismissed";
  createdAt: string;
};

export function myClosure(jobId: string) {
  return accountHeaders("Log in to report a closed posting.").then((headers) =>
    request<{ report: ClosureReport | null }>(`/v1/closures?jobId=${encodeURIComponent(jobId)}`, { headers }),
  );
}

export function reportClosed(jobId: string) {
  return accountHeaders("Log in to report a closed posting.").then((headers) =>
    request<ClosureReport>("/v1/closures", { method: "POST", headers, body: JSON.stringify({ jobId }) }),
  );
}

export type AdminPlaceTone = "unchecked" | "hiring" | "empty" | "tip";

export type AdminPlace = {
  id: string;
  tone: AdminPlaceTone;
  name: string;
  area: string | null;
  address: string;
  detail: string;
  href: string;
};

export function getAdminPlaces(tone: AdminPlaceTone, query: string) {
  const params = new URLSearchParams({ tone });
  if (query) params.set("q", query);
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ tone: AdminPlaceTone; counts: Record<AdminPlaceTone, number>; places: AdminPlace[] }>(`/v1/admin/places?${params}`, { headers }),
  );
}

export type AdminPost = {
  id: string;
  poster: "student" | "business";
  name: string;
  title: string;
  area: string | null;
  hidden: boolean;
  createdAt: string;
};

export function getAdminPosts() {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ posts: AdminPost[] }>("/v1/admin/posts", { headers }),
  );
}

export function setAdminPostHidden(id: string, hidden: boolean) {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ ok: true }>(`/v1/admin/posts/${encodeURIComponent(id)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ hidden }),
    }),
  );
}

export type AdminWallNote = {
  id: string;
  displayName: string;
  body: string;
  hidden: boolean;
  createdAt: string;
};

export function getAdminWall() {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ notes: AdminWallNote[] }>("/v1/admin/wall", { headers }),
  );
}

export function setAdminNoteHidden(id: string, hidden: boolean) {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ ok: true }>(`/v1/admin/wall/${encodeURIComponent(id)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ hidden }),
    }),
  );
}

export function markBugHandled(id: string) {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ ok: true }>(`/v1/admin/bugs/${encodeURIComponent(id)}/handle`, { method: "POST", headers }),
  );
}

export function getAdminClosures() {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ pending: ClosureReport[]; history: ClosureReport[] }>("/v1/admin/closures", { headers }),
  );
}

export function reviewClosure(id: string, action: "confirm" | "dismiss") {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<{ ok: true }>(`/v1/admin/closures/${encodeURIComponent(id)}/review`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    }),
  );
}

export function getAdminOverview() {
  return accountHeaders("Log in to open the admin dashboard.").then((headers) =>
    request<AdminOverview>("/v1/admin/overview", { headers }),
  );
}

export function sendBugReport(body: { message: string; email?: string; page?: string }) {
  return request<{ ok: true }>("/v1/bugs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
