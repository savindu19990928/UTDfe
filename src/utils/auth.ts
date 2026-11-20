
import { API_URL } from './config';

const TOKEN_KEY = 'pos_access_token';
const REFRESH_KEY = 'pos_refresh_token';
const SUPERUSER_KEY = 'pos_is_superuser';
const USERNAME_KEY = 'pos_username';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(SUPERUSER_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
}

export function getUsername(): string | null {
  return sessionStorage.getItem(USERNAME_KEY);
}

export function setUsername(username: string): void {
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function isSuperUser(): boolean {
  return sessionStorage.getItem(SUPERUSER_KEY) === 'true';
}

export function setSuperUser(value: boolean): void {
  sessionStorage.setItem(SUPERUSER_KEY, value ? 'true' : 'false');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// The API runs on a serverless backend, so the very first request of a session
// pays a container cold start. Firing a throwaway request while the user is
// still typing their credentials absorbs that cost before Sign In is pressed.
let warmedUp = false;

export function warmUpApi(): void {
  if (warmedUp) return;
  warmedUp = true;
  try {
    void fetch(`${API_URL}auth/login/`, {
      method: 'OPTIONS',
      cache: 'no-store'
    }).catch(() => {});
  } catch {

    // Warm-up is best effort — never surface failures.
  }}

export async function loginRequest(
username: string,
password: string)
: Promise<{access: string;isSuperUser: boolean;}> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid username or password');
    throw new Error('Login failed. Please try again.');
  }

  const data = await res.json();
  if (!data.access) throw new Error('Invalid response from server');

  setToken(data.access);
  if (data.refresh) sessionStorage.setItem(REFRESH_KEY, data.refresh);
  const superuser = !!data.is_superuser;
  setSuperUser(superuser);
  setUsername(data.username || username.trim());

  return { access: data.access, isSuperUser: superuser };
}

function extractApiError(errData: any, fallback: string): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;
  if (errData.detail) return String(errData.detail);
  if (errData.error) return String(errData.error);
  if (errData.message) return String(errData.message);
  if (typeof errData === 'object') {
    const parts = Object.entries(errData).map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : String(v);
      return k === 'non_field_errors' ? val : `${k}: ${val}`;
    });
    if (parts.length > 0) return parts.join(' | ');
  }
  return fallback;
}

export async function changePasswordRequest(payload: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ detail: string }> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}auth/change-password/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const fallback =
      res.status === 401
        ? 'Session expired. Please sign in again.'
        : 'Failed to change password.';
    throw new Error(extractApiError(errData, fallback));
  }

  const data = await res.json().catch(() => null);
  return {
    detail: data?.detail || 'Password changed successfully.'
  };
}

export async function forgotPasswordRequest(payload: {
  username?: string;
  phone_number?: string;
}): Promise<{ detail: string; phone_number?: string }> {
  const body: Record<string, string> = {};
  if (payload.username && payload.username.trim()) {
    body.username = payload.username.trim();
  }
  if (payload.phone_number && payload.phone_number.trim()) {
    body.phone_number = payload.phone_number.trim();
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}auth/forgot-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    let fallback = 'Password reset request failed. Please try again.';
    if (res.status === 404) {
      fallback = 'No user account matches the provided username or phone number.';
    } else if (res.status === 503) {
      fallback =
        'SMS delivery failed. Your existing password was not changed. Please try again later.';
    } else if (res.status === 400) {
      fallback =
        'Unable to reset password. Please check your username or registered phone number.';
    }
    throw new Error(extractApiError(errData, fallback));
  }

  const data = await res.json().catch(() => null);
  return {
    detail:
      data?.detail ||
      'A new password has been sent via SMS to your registered phone number.',
    phone_number: data?.phone_number
  };
}