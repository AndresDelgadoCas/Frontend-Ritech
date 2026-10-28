
export type UserRole =
  | "ADMINISTRADOR"
  | "COMPRAS"
  | "INVENTARIO"
  | "EXPORTADOR"
  | "VENTAS"
  | "GERENCIA";

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
}

interface CsrfResponse {
  token: string;
}

interface ApiError {
  message?: string;
}

const API_BASE = "/api";

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el token de seguridad.");
  }

  const data = (await response.json()) as CsrfResponse;
  return data.token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(
      () => ({}),
    )) as ApiError;

    if (response.status === 401) {
      throw new Error("Tu sesión no está autenticada o tus credenciales son incorrectas.");
    }

    if (response.status === 403) {
      throw new Error("No tienes permiso para realizar esta operación.");
    }

    throw new Error(error.message ?? `Error HTTP ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(
  username: string,
  password: string,
): Promise<AuthUser> {
  const token = await getCsrfToken();

  return request<AuthUser>("/auth/login", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": token,
    },
    body: JSON.stringify({ username, password }),
  });
}

export async function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export async function logout(): Promise<void> {
  const token = await getCsrfToken();

  await request<{ message: string }>("/auth/logout", {
    method: "POST",
    headers: {
      "X-XSRF-TOKEN": token,
    },
  });
}
