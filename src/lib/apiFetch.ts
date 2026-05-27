/**
 * Thin fetch wrapper that automatically adds:
 *   - X-Requested-With: fetch  (CSRF defence-in-depth)
 *   - credentials: same-origin  (always send session cookies)
 *
 * Use this instead of raw fetch() for all API calls.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('X-Requested-With', 'fetch');
  return fetch(input, { credentials: 'same-origin', ...init, headers });
}

/** Like apiFetch but parses JSON and throws on non-OK responses. */
export async function apiJSON<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await apiFetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}
