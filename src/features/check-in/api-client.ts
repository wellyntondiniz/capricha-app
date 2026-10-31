import BASE_URL from '@/services/api';
import { CheckInError, type CheckInFailureCode } from './types';

const knownCodes: CheckInFailureCode[] = [
  'ALREADY_CHECKED_IN', 'CHECK_IN_NOT_AVAILABLE', 'EVENT_NOT_FOUND',
  'INVALID_EVENT_TOKEN', 'INVALID_QR', 'AUTH_REQUIRED', 'FORBIDDEN', 'INVALID_REQUEST',
  'LECTURE_NOT_FOUND', 'INVALID_LECTURE_TOKEN', 'QR_CONTEXT_MISMATCH',
  'ALREADY_VOTED', 'VOTE_LIMIT_REACHED', 'NOT_CHECKED_IN', 'RESUMO_NOT_FOUND', 'EVENT_NOT_ACTIVE',
  'EVENT_CHECK_IN_REQUIRED',
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
    // 401 sempre é sessão expirada; nos demais casos o código enviado pela API (ex.: NOT_CHECKED_IN, 403) prevalece.
    const code = response.status === 401 ? 'AUTH_REQUIRED'
      : knownCodes.includes(error?.code as CheckInFailureCode) ? error!.code as CheckInFailureCode
      : response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN';
    throw new CheckInError(code, typeof error?.mensagem === 'string' ? error.mensagem
      : 'Não foi possível concluir a operação.', response.status);
  }
  if (!body || typeof body !== 'object') {
    throw new CheckInError('UNKNOWN', 'O servidor retornou uma resposta inválida.');
  }
  return body as T;
}