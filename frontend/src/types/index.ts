export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Customer {
  id: number;
  customer_code: string;
  full_name: string;
  phone: string;
  address?: string;
  is_active: boolean;
}

export interface CustomerCreatePayload {
  customer_code?: string;
  full_name: string;
  phone: string;
  address?: string;
}

export interface CustomerUpdatePayload {
  customer_code?: string;
  full_name?: string;
  phone?: string;
  address?: string;
}

export interface Entry {
  id: number;
  customer_id: number;
  scanned_by: number;
  entry_time: string;
  additional_guests: number;
  total_people: number;
}

export interface EntryScanPayload {
  qr_token: string;
  additional_guests: number;
}

export interface DetailedEntry {
  id: number;
  customer_code: string;
  customer_name: string;
  phone: string;
  qr_token: string;
  additional_guests: number;
  total_people: number;
  entry_time: string;
}

export interface Brand {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export interface BrandCreatePayload {
  name: string;
  category: string;
}

export interface BrandUpdatePayload {
  name?: string;
  category?: string;
  is_active?: boolean;
}

export interface Product {
  id: number;
  brand_id: number;
  name: string;
  category: string;
  volume_ml: number;
  unit: string;
  selling_price: number;
  is_active: boolean;
}

export interface ProductCreatePayload {
  brand_id: number;
  name: string;
  category: string;
  volume_ml: number;
  unit: string;
  selling_price: number;
}

export interface ProductUpdatePayload {
  brand_id?: number;
  name?: string;
  category?: string;
  volume_ml?: number;
  unit?: string;
  selling_price?: number;
  is_active?: boolean;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  quantity: number;
  transaction_type: string;
  transaction_date: string;
}

export interface StockReceivePayload {
  product_id: number;
  quantity: number;
  transaction_date?: string | null;
}

export interface CurrentStock {
  product_id: number;
  product_name: string;
  current_stock: number;
}

export interface Sale {
  id: number;
  product_id: number;
  customer_id?: number;
  quantity: number;
  total_price?: number;
  sale_date: string;
}

export interface SaleCreatePayload {
  product_id: number;
  quantity: number;
  customer_id?: number | null;
  sale_date?: string | null;
}

export interface DetailedSale {
  id: number;
  sale_date: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customer_id?: number | null;
  customer_code?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  product_id: number;
  product_name: string;
  brand_name?: string | null;
  category: string;
  volume_ml: number;
}

export interface DailyProductSale {
  product_id: number;
  product_name: string;
  quantity_sold: number;
}

export interface DailyEntryReport {
  report_date: string;
  customers_entered: number;
  additional_guests: number;
  total_people_entered: number;
}

export interface BrandSalesReport {
  brand_id: number;
  brand_name: string;
  quantity_sold: number;
}

export interface ProductSalesReport {
  product_id: number;
  product_name: string;
  brand_name: string;
  quantity_sold: number;
}

export interface DailySummaryReport {
  report_date: string;
  customers_entered: number;
  additional_guests: number;
  total_people_entered: number;
  total_bottles_sold: number;
  brands: BrandSalesReport[];
  products: ProductSalesReport[];
}

export interface StaffCreatePayload {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}
