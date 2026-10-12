export type CheckInEvent = {
  id: number;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  status: 'available' | 'upcoming' | 'finished';
  canCheckIn: boolean;
  hasCheckedIn: boolean;
  checkedInAt?: string;
  qrToken?: string;
};

export type CheckInRecord = {
  id: number;
  eventId: number;
  eventName: string;
  checkedInAt: string;
  message: string;
};

export type UserRole = 'PARTICIPANT' | 'ORGANIZER' | 'ADMIN';

export type AuthSession = {
  token: string;
  userId: number;
  name: string;
  role: UserRole;
};

export type EventCheckInQr = {
  type: 'EVENT_CHECKIN';
  eventId: number;
  token: string;
};

export type EventQrCode = {
  type: 'EVENT_CHECKIN';
  eventId: number;
  eventName: string;
  qrToken: string;
  payload: string;
  imageData: string;
};

export type CheckInFailureCode =
  | 'ALREADY_CHECKED_IN'
  | 'CHECK_IN_NOT_AVAILABLE'
  | 'EVENT_NOT_FOUND'
  | 'INVALID_EVENT_TOKEN'
  | 'INVALID_QR'
  | 'AUTH_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'NETWORK_ERROR'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'UNKNOWN';

export class CheckInError extends Error {
  constructor(
    public readonly code: CheckInFailureCode,
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? code);
    this.name = 'CheckInError';
  }
}

export interface CheckInService {
  login(email: string, password: string): Promise<AuthSession>;
  getEvents(): Promise<CheckInEvent[]>;
  getEventByQrCode(qrCode: string): Promise<CheckInEvent>;
  checkIn(eventId: number, qrToken: string): Promise<CheckInRecord>;
  getEventQrCode(eventId: number): Promise<EventQrCode>;
}
