import { API_URL } from './config';

const TOKEN_KEY = 'pos_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function loginRequest(
username: string,
password: string)
: Promise<string> {
  const res = await fetch(`${API_URL}auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid username or password');
    throw new Error('Login failed. Please try again.');
  }

  const data = await res.json();
  if (!data.access) throw new Error('Invalid response from server');

  setToken(data.access);
  return data.access;
}