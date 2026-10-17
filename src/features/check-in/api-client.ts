import BASE_URL from '@/services/api';
import { CheckInError, type CheckInFailureCode } from './types';

const knownCodes: CheckInFailureCode[] = [
  'ALREADY_CHECKED_IN', 'CHECK_IN_NOT_AVAILABLE', 'EVENT_NOT_FOUND',
  'INVALID_EVENT_TOKEN', 'INVALID_QR', 'AUTH_REQUIRED', 'FORBIDDEN', 'INVALID_REQUEST',
];

// A credencial vem do AuthContext em cada chamada. Este módulo não mantém sessão.
export async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  if (!token) throw new CheckInError('AUTH_REQUIRED', 'Faça login para continuar.');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new CheckInError('NETWORK_ERROR', 'Não foi possível conectar à API. Verifique sua conexão e tente novamente.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CheckInError(response.status === 401 ? 'AUTH_REQUIRED' : 'UNKNOWN',
      'O servidor retornou uma resposta inválida. Tente novamente.', response.status);
  }
  if (!response.ok) {
    const error = body as { code?: unknown; mensagem?: unknown } | null;
    const code = response.status === 401 ? 'AUTH_REQUIRED'
      : response.status === 403 ? 'FORBIDDEN'
      : knownCodes.includes(error?.code as CheckInFailureCode) ? error!.code as CheckInFailureCode : 'UNKNOWN';
    throw new CheckInError(code, typeof error?.mensagem === 'string' ? error.mensagem
      : 'Não foi possível concluir a operação.', response.status);
  }
  if (!body || typeof body !== 'object') {
    throw new CheckInError('UNKNOWN', 'O servidor retornou uma resposta inválida.');
  }
  return body as T;
}
