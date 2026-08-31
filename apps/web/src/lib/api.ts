import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // refresh token viaja en httpOnly cookie
});

// Adjunta el access token en cada request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  // Evita refresh concurrentes: todas las requests 401 esperan el mismo
  refreshPromise ??= api
    .post('/auth/refresh')
    .then((res) => {
      const { user, accessToken } = res.data.data;
      useAuthStore.getState().setSession(user, accessToken);
      return accessToken as string;
    })
    .catch(() => {
      useAuthStore.getState().clearSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

// En 401: intenta refresh una vez y reintenta la request original
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };
    const isAuthEndpoint = original.url?.startsWith('/auth/');

    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const token = await tryRefresh();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
