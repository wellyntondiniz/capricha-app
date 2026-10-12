import { setAccessToken } from './api-client';
import { httpCheckInService } from './http-check-in-service';
import { AuthSession } from './types';

let currentSession: AuthSession | null = null;

export function getSession() {
  return currentSession;
}

export async function login(email: string, password: string) {
  currentSession = await httpCheckInService.login(email, password);
  return currentSession;
}

export function logout() {
  currentSession = null;
  setAccessToken(null);
}
