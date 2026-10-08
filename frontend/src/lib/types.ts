export type CategoryRef = {
  id: number;
  name: string;
  slug: string;
};

export type Category = CategoryRef & {
  description: string;
  product_count: number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  price: string;
  stock: number;
  in_stock: boolean;
  origin: string;
  image: string | null;
  is_featured: boolean;
  category: CategoryRef;
};

export type ProductDetail = Product & {
  description: string;
  materials: string;
  dimensions: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PaymentMethod = "card" | "cod";

export type StoreConfig = {
  store_name: string;
  currency: string;
  free_shipping_threshold: number;
  flat_shipping_rate: number;
  payment_methods: PaymentMethod[];
  assistant_ai: boolean;
};

export type OrderItem = {
  product_name: string;
  product_slug: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};

export type Order = {
  public_id: string;
  number: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  status_display: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  full_name: string;
  city: string;
  country: string;
  subtotal: string;
  shipping: string;
  total: string;
  items: OrderItem[];
  created_at: string;
};

export type Role = "boss" | "operator" | "editor" | "firm" | "customer";

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_joined: string;
  role: Role;
  panel: string;
  firm_name: string | null;
};
