import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// Convert snake_case keys to camelCase recursively
function camelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// Special renames after camelCase conversion
const KEY_REMAP: Record<string, string> = {
  billItems: 'items', // bill_items → items (matches TypeScript Bill.items)
};

function transformKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(transformKeys);
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const camel = camelKey(k);
      const key = KEY_REMAP[camel] ?? camel;
      out[key] = transformKeys(v);
    }
    return out;
  }
  return val;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor – attach JWT
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('billetra_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – transform snake_case → camelCase, handle 401
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeys(response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('billetra_token');
      localStorage.removeItem('billetra_auth');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
