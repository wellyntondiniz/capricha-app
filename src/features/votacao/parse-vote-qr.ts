import { CheckInError } from '../check-in/types';

export type VoteQr = { type: 'RESUMO_VOTE'; resumoId: number };

// O QR do pôster só aponta para o resumo; quem pode votar é decidido pela API (sessão + check-in).
export function parseVoteQr(value: string): VoteQr {
  let parsed: unknown;
  try {
    if (value.length > 1024) throw new Error();
    parsed = JSON.parse(value.trim());
  } catch {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  const qr = parsed as { type?: unknown; resumoId?: unknown } | null;
  if (qr && typeof qr === 'object' && (qr.type === 'EVENT_CHECKIN' || qr.type === 'LECTURE_CHECKIN')) {
    throw new CheckInError('INVALID_QR', 'Este é um QR Code de check-in. Escaneie o QR Code do pôster do resumo.');
  }
  if (!qr || typeof qr !== 'object' || qr.type !== 'RESUMO_VOTE'
    || !Number.isSafeInteger(qr.resumoId) || (qr.resumoId as number) <= 0 || (qr.resumoId as number) > 2147483647) {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  return { type: 'RESUMO_VOTE', resumoId: qr.resumoId as number };
}