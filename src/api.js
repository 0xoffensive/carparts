// Small fetch wrapper: adds the bearer token, refreshes once on 401.
const KEY = "carparts.auth";

export const loadTokens = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};
export const saveTokens = (t) =>
  t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY);

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.details = body?.details || [];
  }
}

let refreshing = null;
async function refresh() {
  const t = loadTokens();
  if (!t?.refresh_token) throw new ApiError(401, { error: "Not signed in" });
  // refresh tokens are single-use, so share one in-flight request
  refreshing ??= fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: t.refresh_token }),
  })
    .then(async (r) => {
      if (!r.ok) {
        saveTokens(null);
        window.dispatchEvent(new Event("auth:expired"));
        throw new ApiError(r.status, await r.json().catch(() => null));
      }
      const next = await r.json();
      saveTokens(next);
      window.dispatchEvent(new Event("auth:refreshed"));
      return next;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

export async function api(path, { method = "GET", body, query, retry = true } = {}) {
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== "" && v != null),
      )
    : "";
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const tokens = loadTokens();
  if (tokens?.token) headers.Authorization = `Bearer ${tokens.token}`;

  const res = await fetch(`/api${path}${qs}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && tokens?.refresh_token && !path.startsWith("/auth/")) {
    await refresh();
    return api(path, { method, body, query, retry: false });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// The list envelope comes from buildResponse; be tolerant about its shape.
export function extractRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const k of ["items", "data", "rows", "results"]) {
    if (Array.isArray(data[k])) return data[k];
  }
  if (data._embedded) {
    const arr = Object.values(data._embedded).find(Array.isArray);
    if (arr) return arr;
  }
  return Object.values(data).find(Array.isArray) || [];
}

export function decodeJwt(token) {
  try {
    const b = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b));
  } catch {
    return null;
  }
}
