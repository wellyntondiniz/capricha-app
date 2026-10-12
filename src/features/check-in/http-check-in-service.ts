import { request, setAccessToken } from './api-client';
import {
  AuthSession,
  CheckInError,
  CheckInEvent,
  CheckInRecord,
  CheckInService,
  EventCheckInQr,
  EventQrCode,
} from './types';

function parseQrCode(value: string): EventCheckInQr {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim());
  } catch {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }

  const candidate = parsed as Partial<EventCheckInQr>;
  if (
    candidate.type !== 'EVENT_CHECKIN' ||
    !Number.isSafeInteger(candidate.eventId) ||
    typeof candidate.token !== 'string' ||
    candidate.token.trim().length === 0
  ) {
    throw new CheckInError('INVALID_QR', 'QR Code inválido.');
  }

  return {
    type: 'EVENT_CHECKIN',
    eventId: candidate.eventId as number,
    token: candidate.token.trim(),
  };
}

export const httpCheckInService: CheckInService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const session = await request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setAccessToken(session.token);
    return session;
  },

  async getEvents() {
    return request<CheckInEvent[]>('/events');
  },

  async getEventByQrCode(value: string) {
    const qr = parseQrCode(value);
    const event = await request<CheckInEvent>(`/events/${qr.eventId}`);
    return { ...event, qrToken: qr.token };
  },

  async checkIn(eventId: number, qrToken: string) {
    return request<CheckInRecord>(`/events/${eventId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    });
  },

  async getEventQrCode(eventId: number) {
    return request<EventQrCode>(`/events/${eventId}/qr-code`);
  },
};
