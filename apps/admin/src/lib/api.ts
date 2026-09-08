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

type ApiResponse<T = unknown> = { success?: boolean; data?: T; meta?: unknown } | { success: false; error: { code: string; message: string } };

async function api(path: string, opts: RequestInit = {}): Promise<unknown> {
  const token = getAuthToken();
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });

  const json: ApiResponse = await res.json().catch(() => ({ success: false, error: { code: "NETWORK_ERROR", message: "Request failed" } }));

  if (!json.success && (json as any).error?.code === "UNAUTHORIZED" && res.status === 401) {
    // Try refresh once
    if (path !== "/auth/refresh" && typeof window !== "undefined") {
      const sessionRaw = localStorage.getItem("campku_token");
      if (sessionRaw) {
        try {
          const sess: SessionData = JSON.parse(sessionRaw);
          const r2 = await fetch(BASE + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: sess.refreshToken }),
          });
          if (r2.ok) {
            const refreshed: ApiResponse<SessionData> = await r2.json();
            if (refreshed.success && refreshed.data) {
              await setSession(refreshed.data);
              // Retry original request with new token
              return api(path, opts);
            }
          }
        } catch { /* fallthrough to 401 */ }
      }
    }
  }

  if (!res.ok) throw new Error(json.success ? String(res.status) : (json as any).error?.message ?? "Request failed");
  return (json as { data: unknown }).data;
}

export const $api = {
  get: <T>(path: string) => api(path, { method: "GET" }) as Promise<T>,
  post: <T>(path: string, body?: Record<string, unknown>) => api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }) as Promise<T>,
  put: <T>(path: string, body?: Record<string, unknown>) => api(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }) as Promise<T>,
  patch: <T>(path: string, body?: Record<string, unknown>) => api(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }) as Promise<T>,
  delete: <T>(path: string) => api(path, { method: "DELETE" }) as Promise<T>,
};
