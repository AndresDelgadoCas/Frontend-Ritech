
const API_BASE = "/api/producers";

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

function getCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return cookie
    ? decodeURIComponent(cookie.substring(prefix.length))
    : null;
}

async function request<T>(
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const csrfToken = getCookie("XSRF-TOKEN");

    if (csrfToken) {
      headers.set("X-XSRF-TOKEN", csrfToken);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    credentials: "same-origin",
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
