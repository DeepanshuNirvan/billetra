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

// Convert camelCase keys to snake_case recursively (request bodies → Go json tags)
function snakeKey(s: string): string {
  return s.replace(/([A-Z])/g, (_, c: string) => '_' + c.toLowerCase());
}

function snakeKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(snakeKeys);
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[snakeKey(k)] = snakeKeys(v);
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
  // Convert plain-object JSON bodies to snake_case so they bind to Go json tags.
  // Skip FormData / Blob / non-plain bodies (e.g. logo upload) and top-level
  // arrays (bulk-import rows carry arbitrary Excel headers the backend matches
  // loosely — re-keying them would break it).
  const d = config.data;
  const isPlainObject =
    d !== null && typeof d === 'object' && !Array.isArray(d) &&
    !(d instanceof FormData) && !(d instanceof Blob) &&
    !(d instanceof ArrayBuffer) && d.constructor === Object;
  if (isPlainObject) {
    config.data = snakeKeys(d);
  }
  // For multipart uploads, clear the default JSON Content-Type so axios sets
  // the multipart boundary itself (otherwise the server can't parse the body).
  if (d instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor – transform snake_case → camelCase, handle 401
apiClient.interceptors.response.use(
  (response) => {
    // Only transform plain JSON payloads. Binary responses (PDF blobs, etc.)
    // must pass through untouched, otherwise the Blob is destroyed.
    const d = response.data;
    const isBinary =
      d instanceof Blob ||
      d instanceof ArrayBuffer ||
      (typeof d === 'object' && d !== null && d.constructor !== Object && !Array.isArray(d));
    if (d && typeof d === 'object' && !isBinary) {
      response.data = transformKeys(d);
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
