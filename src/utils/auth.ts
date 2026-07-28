
import { API_URL } from './config';

const TOKEN_KEY = 'pos_access_token';
const REFRESH_KEY = 'pos_refresh_token';
const SUPERUSER_KEY = 'pos_is_superuser';

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

  return { access: data.access, isSuperUser: superuser };
}