import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './token-store';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const httpClient = axios.create({
  baseURL: process.env.NX_PUBLIC_API_URL,
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  refreshPromise ??= httpClient
    .post<{ accessToken: string }>('/auth/refresh')
    .then((response) => response.data.accessToken)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isRefreshCall = originalRequest?.url === '/auth/refresh';

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      isRefreshCall ||
      originalRequest._retried
    ) {
      if (isRefreshCall) setAccessToken(null);
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      setAccessToken(newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return httpClient(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  },
);
