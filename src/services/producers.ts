
const API_BASE = "https://backend-ritech.onrender.com/api/producers";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

export interface Producer {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  productType: string;
  createdAt?: string | null;
}

export interface ProducerInput {
  name: string;
  contact: string;
  phone: string;
  email: string;
  productType: "COFFEE" | "COCOA";
}

interface CsrfResponse {
  token: string;
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${AUTH_BASE}/csrf`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el token CSRF.");
  }

  const data = (await response.json()) as CsrfResponse;

  if (!data.token) {
    throw new Error("El backend no devolvió un token CSRF válido.");
  }

  return data.token;
}

async function request<T>(
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const csrfToken = await getCsrfToken();
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);

    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.detail === "string"
          ? body.detail
          : `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getProducers(): Promise<Producer[]> {
  return request<Producer[]>();
}

export function createProducer(
  producer: ProducerInput,
): Promise<Producer> {
  return request<Producer>("", {
    method: "POST",
    body: JSON.stringify(producer),
  });
}

export function updateProducer(
  id: number,
  producer: ProducerInput,
): Promise<Producer> {
  return request<Producer>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(producer),
  });
}

export function deleteProducer(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
