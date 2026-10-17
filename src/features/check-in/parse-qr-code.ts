import { CheckInError, type CheckInQr, type CheckInContext } from './types';

export function parseQrCode(value: string): CheckInQr {
  let parsed: unknown;
  try {
    if (value.length > 1024) throw new Error();
    parsed = JSON.parse(value.trim());
  } catch {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  const qr = parsed as { type?: unknown; eventId?: unknown; lectureId?: unknown; token?: unknown } | null;
  const id = qr?.type === 'LECTURE_CHECKIN' ? qr.lectureId : qr?.eventId;
  if (!qr || typeof qr !== 'object' || !['EVENT_CHECKIN', 'LECTURE_CHECKIN'].includes(qr.type as string)
    || !Number.isSafeInteger(id) || (id as number) <= 0
    || (qr.type === 'EVENT_CHECKIN' && (id as number) > 2147483647)
    || (qr.type === 'EVENT_CHECKIN' && qr.lectureId !== undefined)
    || (qr.type === 'LECTURE_CHECKIN' && qr.eventId !== undefined)
    || typeof qr.token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qr.token)) {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  return qr.type === 'LECTURE_CHECKIN'
    ? { type: 'LECTURE_CHECKIN', lectureId: id as number, token: qr.token }
    : { type: 'EVENT_CHECKIN', eventId: id as number, token: qr.token };
}

export function validateQrContext(qr: CheckInQr, context?: CheckInContext) {
  const id = qr.type === 'EVENT_CHECKIN' ? qr.eventId : qr.lectureId;
  if (context && (context.type !== qr.type || context.id !== id)) {
    throw new CheckInError('QR_CONTEXT_MISMATCH', 'O QR Code não corresponde à palestra selecionada. Escaneie o QR correto ou volte à lista.');
  }
}
