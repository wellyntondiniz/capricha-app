import { CheckInError } from '../check-in/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lê o QR pessoal de conexão e devolve só o token. Qualquer outra coisa vira INVALID_QR. */
export function lerQrConexao(value: string): string {
  let parsed: unknown;
  try {
    if (value.length > 1024) throw new Error();
    parsed = JSON.parse(value.trim());
  } catch {
    throw new CheckInError('INVALID_QR', 'QR Code inválido. Peça para o participante abrir o QR Code de conexão dele.');
  }
  const qr = parsed as { type?: unknown; token?: unknown } | null;
  if (qr && typeof qr === 'object' && (qr.type === 'EVENT_CHECKIN' || qr.type === 'LECTURE_CHECKIN')) {
    throw new CheckInError('INVALID_QR', 'Este é um QR Code de check-in. Para se conectar, escaneie o QR Code de outro participante.');
  }
  if (!qr || typeof qr !== 'object' || qr.type !== 'USER_CONNECT'
    || typeof qr.token !== 'string' || !UUID.test(qr.token)) {
    throw new CheckInError('INVALID_QR', 'QR Code inválido. Peça para o participante abrir o QR Code de conexão dele.');
  }
  return qr.token;
}