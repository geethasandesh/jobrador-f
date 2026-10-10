export type Kind = "job" | "community_lead" | "nearby_business";

export type JobType =
  | "MINIJOB"
  | "WERKSTUDENT"
  | "TEILZEIT"
  | "STUDENT"
  | "TEMPORARY"
  | "INTERNSHIP"
  | "OTHER";

export type LeadJobType = JobType | "NOT_SURE";

export type Category =
  | "restaurant"
  | "cafe"
  | "retail"
  | "warehouse"
  | "logistics"
  | "hotel"
  | "cleaning"
  | "delivery"
  | "office"
  | "customer_service"
  | "event"
  | "other";

export type Opportunity = {
  id: string;
  kind: Kind;
  title: string;
  businessId?: string;
  businessName: string;
  category: Category;
  jobType: LeadJobType | null;
  summary: string;
  salaryLabel: string | null;
  languageLabel: string | null;
  hoursLabel: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  recency: string | null;
  area: string;
  address: string;
  status: string;
  confirmYes?: number;
  confirmNo?: number;
  confirmUnsure?: number;
  sourceName?: string;
  hiring?: boolean;
  linkedJobId?: string;
  linkedJobTitle?: string;
  linkedJobType?: string | null;
  linkedJobIds?: string[];
  poster?: "student" | "business";
};

export type OpportunityList = {
  dataSource: "mock" | "live";
  center: { latitude: number; longitude: number };
  radiusKm: number;
  total: number;
  items: Opportunity[];
};

export type Business = {
  id: string;
  name: string;
  category: Category;
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  postalCode?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  source: string;
  sourceId?: string;
  hiringCheckedAt?: string | null;
  distanceKm?: number | null;
};

export type JobRecord = {
  id: string;
  businessId: string;
  title: string;
  jobType: JobType;
  category: Category;
  descriptionSummary: string;
  salaryLabel?: string | null;
  languageLabel?: string | null;
  hoursLabel?: string | null;
  latitude: number;
  longitude: number;
  sourceName: string;
  sourceUrl: string;
  postedAt: string;
  status: string;
  distanceKm: number | null;
};

export type LeadRecord = {
  id: string;
  businessId?: string;
  businessName: string;
  title: string;
  description: string;
  jobType: LeadJobType;
  category: Category;
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  reportedAt: string;
  confirmYes: number;
  confirmNo: number;
  confirmUnsure: number;
  confirmDone?: number;
  status: string;
  poster?: "student" | "business";
  mine?: boolean;
  salaryLabel: string | null;
  languageLabel: string | null;
  hoursLabel: string | null;
  distanceKm: number | null;
};

export type JobDetail = {
  dataSource: "mock" | "live";
  job: JobRecord;
  business: Business | null;
};

export type LeadDetail = {
  dataSource: "mock" | "live";
  lead: LeadRecord;
  business: Business | null;
};

export type BusinessDetail = {
  dataSource: "mock" | "live";
  business: Business;
  jobs: JobRecord[];
  leads: LeadRecord[];
};

export type SearchFilters = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  q?: string;
  jobType?: string;
  category?: string;
  kinds?: string;
  language?: string;
  salary?: string;
  sort?: string;
};
