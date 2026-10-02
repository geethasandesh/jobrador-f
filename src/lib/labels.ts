import type { Category, JobType, Kind, LeadJobType } from "./api/types";

export const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: "MINIJOB", label: "Minijob" },
  { value: "WERKSTUDENT", label: "Werkstudent" },
  { value: "TEILZEIT", label: "Teilzeit" },
  { value: "STUDENT", label: "Student job" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "OTHER", label: "Other" },
];

export const LEAD_JOB_TYPE_OPTIONS: Array<{ value: LeadJobType; label: string }> = [
  ...JOB_TYPE_OPTIONS,
  { value: "NOT_SURE", label: "Not sure" },
];

export const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "logistics", label: "Logistics" },
  { value: "hotel", label: "Hotel" },
  { value: "cleaning", label: "Cleaning" },
  { value: "delivery", label: "Delivery" },
  { value: "office", label: "Office" },
  { value: "customer_service", label: "Customer service" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export const LANGUAGE_OPTIONS = [
  { value: "english_friendly", label: "English friendly" },
  { value: "german_required", label: "German required" },
  { value: "german_basic", label: "German basic" },
  { value: "unknown", label: "No language information" },
];

export const SALARY_OPTIONS = [
  { value: "under_13", label: "Under €13" },
  { value: "13_15", label: "€13–15" },
  { value: "15_20", label: "€15–20" },
  { value: "20_plus", label: "€20+" },
];

export const KIND_LABEL: Record<Kind, string> = {
  job: "Job listing",
  community_lead: "Community lead",
  nearby_business: "Nearby business",
};

export function jobTypeLabel(value: string): string {
  return (
    LEAD_JOB_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
