import type { AxiosRequestConfig } from 'axios';
import { httpClient } from '@ticketing/auth-client';

// Orval calls this instead of its own default axios instance, so generated
// hooks reuse httpClient's bearer-token/refresh interceptors.
export function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return httpClient(config).then((response) => response.data);
}
