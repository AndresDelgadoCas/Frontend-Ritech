export type UserRole = "ADMINISTRADOR" | "VENDEDOR" | "COMPRADOR";

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

async function csrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/csrf`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo obtener el token de seguridad.");
  const body = (await response.json()) as { token?: string };
  if (!body.token) throw new Error("El servidor no entregó el token CSRF.");
  return body.token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && path !== "/auth/login") {
    headers.set("X-XSRF-TOKEN", await csrfToken());
  }
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
    if (response.status === 401) throw new Error("La sesión ha expirado o los datos de acceso son incorrectos.");
    if (response.status === 403) throw new Error("Tu cuenta no tiene permisos para realizar esta acción.");
    throw new Error(data.message || data.error || `Error del servidor (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export function registerBuyer(data: { fullName: string; username: string; email: string; password: string; companyName: string; country: string; phone?: string; address?: string }): Promise<{message:string}> {
  return request<{message:string}>("/auth/register", { method: "POST", body: JSON.stringify(data) });
}
export function login(username: string, password: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}
export function getCurrentUser(): Promise<AuthUser> { return request<AuthUser>("/auth/me"); }
export function logout(): Promise<void> { return request<void>("/auth/logout", { method: "POST" }); }
