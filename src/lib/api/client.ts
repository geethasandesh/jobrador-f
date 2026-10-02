import type {
  BusinessDetail,
  JobDetail,
  LeadDetail,
  OpportunityList,
  SearchFilters,
} from "./types";

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

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function getJob(id: string, origin?: { latitude: number; longitude: number }) {
  return getOrNull<JobDetail>(withOrigin(`/v1/jobs/${id}`, origin));
}

export function getLead(id: string, origin?: { latitude: number; longitude: number }) {
  return getOrNull<LeadDetail>(withOrigin(`/v1/leads/${id}`, origin));
}

export function getBusiness(id: string, origin?: { latitude: number; longitude: number }) {
  return getOrNull<BusinessDetail>(withOrigin(`/v1/businesses/${id}`, origin));
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
}) {
  return request<LeadDetail>("/v1/leads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmLead(id: string, status: "yes" | "no" | "unsure") {
  return request<LeadDetail>(`/v1/leads/${id}/confirmations`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
