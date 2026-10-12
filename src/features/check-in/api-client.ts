import { Platform } from 'react-native';

import { CheckInError, CheckInFailureCode } from './types';

const defaultApiUrl = Platform.select({
  android: 'http://10.0.2.2:8080/api',
  default: 'http://localhost:8080/api',
}) ?? 'http://localhost:8080/api';

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '');
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

function toFailureCode(value: unknown): CheckInFailureCode {
  const knownCodes: CheckInFailureCode[] = [
    'ALREADY_CHECKED_IN',
    'CHECK_IN_NOT_AVAILABLE',
    'EVENT_NOT_FOUND',
    'INVALID_EVENT_TOKEN',
    'INVALID_QR',
    'AUTH_REQUIRED',
    'INVALID_CREDENTIALS',
    'FORBIDDEN',
    'INVALID_REQUEST',
  ];
  return typeof value === 'string' && knownCodes.includes(value as CheckInFailureCode)
    ? (value as CheckInFailureCode)
    : 'UNKNOWN';
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new CheckInError(
      'NETWORK_ERROR',
      'Não foi possível conectar à API. Verifique se ela está em execução.',
    );
  }

  const rawBody = await response.text();
  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body as { code?: unknown; message?: unknown } | null;
    const code = toFailureCode(errorBody?.code);
    const message = typeof errorBody?.message === 'string'
      ? errorBody.message
      : response.status === 401
        ? 'Sua sessão expirou. Faça login novamente.'
        : 'Não foi possível concluir a operação.';
    if (response.status === 401) {
      setAccessToken(null);
    }
    throw new CheckInError(code === 'UNKNOWN' && response.status === 401 ? 'AUTH_REQUIRED' : code, message, response.status);
  }

  return body as T;
}
