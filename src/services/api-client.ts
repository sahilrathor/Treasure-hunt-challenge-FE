import axios, { AxiosError } from 'axios';

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 12_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data?.error;
    return Promise.reject(
      new ApiError(
        status,
        body?.code ?? (status === 0 ? 'NETWORK_ERROR' : 'REQUEST_FAILED'),
        body?.message ??
          (status === 0 ? 'Unable to reach the event server.' : 'The request failed.'),
        body?.details,
      ),
    );
  },
);

export function idempotencyHeaders() {
  return { 'Idempotency-Key': crypto.randomUUID() };
}
