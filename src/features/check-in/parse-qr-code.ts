import { CheckInError, type EventCheckInQr } from './types';

export function parseQrCode(value: string): EventCheckInQr {
  let parsed: unknown;
  try {
    if (value.length > 1024) throw new Error();
    parsed = JSON.parse(value.trim());
  } catch {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  const qr = parsed as Partial<EventCheckInQr> | null;
  if (!qr || typeof qr !== 'object' || qr.type !== 'EVENT_CHECKIN'
    || !Number.isSafeInteger(qr.eventId) || (qr.eventId as number) <= 0 || (qr.eventId as number) > 2147483647
    || typeof qr.token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qr.token)) {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }
  return { type: 'EVENT_CHECKIN', eventId: qr.eventId as number, token: qr.token };
}
