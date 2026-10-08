export type KpiValue = { value: number; previous: number | null; change: number | null };
export type SeriesRow = { label: string } & Record<string, number | string>;
export type SegmentCount = { key: string; label: string; count: number };
export type Paged<T> = { count: number; page: number; page_size: number; results: T[] };

export type SalesOverview = {
  period: { key: string; label: string; granularity: "day" | "month" };
  kpis: Record<"revenue" | "orders" | "units" | "average_order" | "new_customers", KpiValue>;
  revenue_series: SeriesRow[];
  orders_series: SeriesRow[];
  top_products: { name: string; seller: string; units: number; revenue: number }[];
  by_category: { label: string; revenue: number }[];
  seller_split: { store: number; firms: number };
  recent_orders: { number: string; customer: string; city: string; total: number; status: string; created_at: string }[];
};

export type FirmsSummary = {
  total: number;
  verified: number;
  new_this_month: number;
  revenue_30d: number;
  average_revenue_30d: number;
  products: number;
  segments: SegmentCount[];
  leaders: { id: number; name: string; revenue_30d: number; units_30d: number }[];
  signups_series: SeriesRow[];
  revenue_series: SeriesRow[];
};

export type SupportSummary = {
  operators: number;
  waiting_now: number;
  open_now: number;
  conversations: KpiValue;
  customers: KpiValue;
  avg_response_seconds: KpiValue;
  resolution_rate: number;
  inflow_series: SeriesRow[];
  by_hour: SeriesRow[];
  leaders: { id: number; name: string; conversations: number; customers: number; avg_response_seconds: number | null }[];
};

export type EditorsSummary = {
  editors: number;
  uploads: KpiValue;
  today: number;
  inflow_series: SeriesRow[];
  by_category: SeriesRow[];
  leaders: { id: number; name: string; uploads: number; today: number }[];
};

export type Overview = {
  sales: SalesOverview;
  firms: FirmsSummary;
  support: SupportSummary;
  editors: EditorsSummary;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  joined: string;
  last_seen: string | null;
  orders: number | null;
  spend: number | null;
  segment: string | null;
  is_active: boolean;
  detail?: string;
};

export type FirmRow = {
  id: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  category: string;
  products: number;
  revenue_30d: number;
  revenue_change: number | null;
  units_30d: number;
  revenue_total: number;
  last_sale: string | null;
  segment: string;
  status: "active" | "suspended";
  is_verified: boolean;
  joined: string;
};

export type OperatorRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  is_active: boolean;
  joined: string;
  last_active: string | null;
  conversations_total: number;
  conversations_period: number;
  customers_served: number;
  customers_period: number;
  messages_total: number;
  messages_period: number;
  avg_response_seconds: number | null;
  resolved_period: number;
  open_now: number;
  rank: number;
};

export type EditorRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  is_active: boolean;
  joined: string;
  uploads_today: number;
  uploads_week: number;
  uploads_period: number;
  uploads_total: number;
  last_upload: string | null;
  rank: number;
};

export type FirmProfile = {
  id: number;
  name: string;
  legal_form: string;
  legal_form_display: string;
  tax_id: string;
  main_category: number | null;
  main_category_name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  owner_full_name: string;
  owner_phone: string;
  owner_email: string;
  owner_birth_date: string;
  passport_masked: string;
  passport_issued_by: string;
  passport_issue_date: string;
  status: "active" | "suspended";
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
};

export type FirmProductStat = {
  id: number;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  is_active: boolean;
  units_30d: number;
  change: number | null;
  revenue_30d: number;
  units_total: number;
  peak_month: string | null;
  pace: "fast" | "steady" | "slow";
};

export type FirmStats = {
  kpis: Record<"revenue" | "units" | "orders" | "products", KpiValue>;
  best_seller: string | null;
  revenue_series: SeriesRow[];
  units_series: SeriesRow[];
  weekday: SeriesRow[];
  products: FirmProductStat[];
};

export type MarketProduct = {
  id: number;
  name: string;
  category: string;
  seller: string;
  is_yours: boolean;
  units_30d: number;
  units_prev_30d: number;
  change: number | null;
  revenue_30d: number;
};

export type MarketStats = {
  top_products: MarketProduct[];
  declining: MarketProduct[];
  monthly_leaders: { month: string; name: string; seller: string; is_yours: boolean; units: number }[];
  categories: string[];
  category_trends: SeriesRow[];
};

export type ManagedProduct = {
  id: number;
  name: string;
  slug: string;
  category: number;
  category_name: string;
  category_slug: string;
  summary: string;
  description: string;
  price: string;
  stock: number;
  origin: string;
  materials: string;
  dimensions: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};
