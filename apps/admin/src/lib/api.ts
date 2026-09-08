// Campku Ops API Client
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("campku_token");
    return raw ? JSON.parse(raw).accessToken ?? null : null;
  } catch {
    return null;
  }
}

type SessionData = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: { id: string; name: string; email: string; role: string };
};

export async function setSession(session: SessionData): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem("campku_token", JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem("campku_token");
}

// Always returns the data object directly. If meta is needed, use getList().
async function rawRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });

  const json: any = await res.json().catch(() => ({ success: false, error: { code: "NETWORK_ERROR", message: "Request failed" } }));

  if (!json.success && json.error?.code === "UNAUTHORIZED" && res.status === 401) {
    if (path !== "/auth/refresh" && typeof window !== "undefined") {
      const sessionRaw = localStorage.getItem("campku_token");
      if (sessionRaw) {
        try {
          const sess = JSON.parse(sessionRaw);
          const r2 = await fetch(BASE + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: sess.refreshToken }),
          });
          if (r2.ok) {
            const refreshed: any = await r2.json();
            if (refreshed.success && refreshed.data) {
              await setSession(refreshed.data);
              return rawRequest<T>(path, opts);
            }
          }
        } catch { /* fallthrough */ }
      }
    }
  }

  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }

  return json.data as T;
}

// List endpoints that return { data: T[], meta: {...} }
async function listRequest<T>(path: string, opts: RequestInit = {}): Promise<{ data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } | null }> {
  const token = getAuthToken();
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });

  const json: any = await res.json().catch(() => ({ success: false, error: { code: "NETWORK_ERROR", message: "Request failed" } }));

  if (!json.success && json.error?.code === "UNAUTHORIZED" && res.status === 401) {
    if (path !== "/auth/refresh" && typeof window !== "undefined") {
      const sessionRaw = localStorage.getItem("campku_token");
      if (sessionRaw) {
        try {
          const sess = JSON.parse(sessionRaw);
          const r2 = await fetch(BASE + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: sess.refreshToken }),
          });
          if (r2.ok) {
            const refreshed: any = await r2.json();
            if (refreshed.success && refreshed.data) {
              await setSession(refreshed.data);
              return listRequest<T>(path, opts);
            }
          }
        } catch { /* fallthrough */ }
      }
    }
  }

  if (!res.ok || !json.success) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }

  return { data: json.data as T[], meta: json.meta ?? null };
}

export const $api = {
  // GET single resource → returns data directly
  get: <T>(path: string) => rawRequest<T>(path, { method: "GET" }),
  // GET list with meta → returns { data, meta }
  getList: <T>(path: string) => listRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: Record<string, unknown>) => rawRequest<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: Record<string, unknown>) => rawRequest<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: Record<string, unknown>) => rawRequest<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
};