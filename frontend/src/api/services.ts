import api from './client';
import {
  Brand,
  BrandCreatePayload,
  BrandUpdatePayload,
  CurrentStock,
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  DailyEntryReport,
  DailyProductSale,
  DailySummaryReport,
  DetailedEntry,
  DetailedSale,
  Entry,
  EntryScanPayload,
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
  Sale,
  SaleCreatePayload,
  StaffCreatePayload,
  StockReceivePayload,
  StockTransaction,
  TokenResponse,
  User,
} from '../types';

export interface LoginRequestPayload {
  email: string;
  password: string;
}

export const authApi = {
  login: async (credentials: LoginRequestPayload): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export const usersApi = {
  createStaff: async (data: StaffCreatePayload): Promise<User> => {
    const response = await api.post<User>('/users/staff', data);
    return response.data;
  },
  getStaff: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users/staff');
    return response.data;
  },
};

export const customerApi = {
  createCustomer: async (data: CustomerCreatePayload): Promise<Customer> => {
    const response = await api.post<Customer>('/customers', data);
    return response.data;
  },
  updateCustomer: async (customerId: number, data: CustomerUpdatePayload): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${customerId}`, data);
    return response.data;
  },
  getCustomers: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },
  lookupCustomer: async (query: string): Promise<Customer> => {
    const response = await api.get<Customer>(`/customers/lookup?query=${encodeURIComponent(query)}`);
    return response.data;
  },
  getQRUrl: (customerId: number): string => {
    const token = localStorage.getItem('token');
    return `/api/customers/${customerId}/qr`;
  },
  getQRBlob: async (customerId: number): Promise<Blob> => {
    const response = await api.get(`/customers/${customerId}/qr`, {
      responseType: 'blob',
    });
    return response.data;
  },
  deleteCustomer: async (customerId: number): Promise<void> => {
    await api.delete(`/customers/${customerId}`);
  },
  deleteAllCustomers: async (): Promise<void> => {
    await api.delete('/customers/all');
  },
  bulkImportCustomers: async (items: any[]): Promise<any> => {
    const response = await api.post('/customers/bulk', items);
    return response.data;
  },
};

export const entryApi = {
  scanQR: async (payload: EntryScanPayload): Promise<Entry> => {
    const response = await api.post<Entry>('/entries/scan', payload);
    return response.data;
  },
  getRecentEntries: async (limit: number = 100): Promise<DetailedEntry[]> => {
    const response = await api.get<DetailedEntry[]>(`/entries/recent?limit=${limit}`);
    return response.data;
  },
};

export const brandApi = {
  createBrand: async (data: BrandCreatePayload): Promise<Brand> => {
    const response = await api.post<Brand>('/brands', data);
    return response.data;
  },
  getBrands: async (): Promise<Brand[]> => {
    const response = await api.get<Brand[]>('/brands');
    return response.data;
  },
  getBrand: async (id: number): Promise<Brand> => {
    const response = await api.get<Brand>(`/brands/${id}`);
    return response.data;
  },
  updateBrand: async (id: number, data: BrandUpdatePayload): Promise<Brand> => {
    const response = await api.put<Brand>(`/brands/${id}`, data);
    return response.data;
  },
  deleteBrand: async (id: number): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
};

export const productApi = {
  createProduct: async (data: ProductCreatePayload): Promise<Product> => {
    const response = await api.post<Product>('/products', data);
    return response.data;
  },
  getProducts: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/products');
    return response.data;
  },
  getProductsByBrand: async (brandId: number): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/brand/${brandId}`);
    return response.data;
  },
  updateProduct: async (productId: number, data: ProductUpdatePayload): Promise<Product> => {
    const response = await api.put<Product>(`/products/${productId}`, data);
    return response.data;
  },
  updateProductPrice: async (productId: number, sellingPrice: number): Promise<Product> => {
    const response = await api.put<Product>(`/products/${productId}/price`, {
      selling_price: sellingPrice,
    });
    return response.data;
  },
  deleteProduct: async (productId: number): Promise<void> => {
    await api.delete(`/products/${productId}`);
  },
  getProductsByCategory: async (category: string): Promise<Product[]> => {
    const response = await api.get<Product[]>(`/products/category/${category}`);
    return response.data;
  },
};

export const stockApi = {
  receiveStock: async (data: StockReceivePayload): Promise<StockTransaction> => {
    const response = await api.post<StockTransaction>('/stock/receive', data);
    return response.data;
  },
  getTransactions: async (): Promise<StockTransaction[]> => {
    const response = await api.get<StockTransaction[]>('/stock/transactions');
    return response.data;
  },
  getCurrentStock: async (productId: number): Promise<CurrentStock> => {
    const response = await api.get<CurrentStock>(`/stock/current/${productId}`);
    return response.data;
  },
  getAllCurrentStock: async (): Promise<CurrentStock[]> => {
    const response = await api.get<CurrentStock[]>('/stock/current');
    return response.data;
  },
};

export const saleApi = {
  createSale: async (data: SaleCreatePayload): Promise<Sale> => {
    const response = await api.post<Sale>('/sales', data);
    return response.data;
  },
  getSales: async (): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/sales');
    return response.data;
  },
  getDetailedSales: async (limit: number = 500): Promise<DetailedSale[]> => {
    const response = await api.get<DetailedSale[]>(`/sales/detailed?limit=${limit}`);
    return response.data;
  },
  getCustomerSales: async (customerId: number): Promise<DetailedSale[]> => {
    const response = await api.get<DetailedSale[]>(`/sales/customer/${customerId}`);
    return response.data;
  },
  getDailySales: async (dateStr: string): Promise<DailyProductSale[]> => {
    const response = await api.get<DailyProductSale[]>(`/sales/daily?report_date=${dateStr}`);
    return response.data;
  },
};

export const reportApi = {
  getDailyEntryReport: async (dateStr?: string): Promise<DailyEntryReport> => {
    const url = dateStr ? `/reports/daily-entry?report_date=${dateStr}` : '/reports/daily-entry';
    const response = await api.get<DailyEntryReport>(url);
    return response.data;
  },
  getDailySummary: async (dateStr: string): Promise<DailySummaryReport> => {
    const response = await api.get<DailySummaryReport>(`/reports/daily-summary?report_date=${dateStr}`);
    return response.data;
  },
  getEntriesReport: async (params: { period: string; report_date?: string; year?: number; month?: number }): Promise<any> => {
    const response = await api.get('/reports/entries', { params });
    return response.data;
  },
  getStockReport: async (params: { period: string; report_date?: string; year?: number; month?: number }): Promise<any> => {
    const response = await api.get('/reports/stock', { params });
    return response.data;
  },
  getSalesReport: async (params: { period: string; report_date?: string; year?: number; month?: number }): Promise<any> => {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },
};
