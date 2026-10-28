
const API_BASE = "/api/clients";

export interface Client {
  id: number;
  companyName: string;
  contactName: string;
  country: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ClientInput {
  companyName: string;
  contactName: string;
  country: string;
  email: string;
  phone: string;
  address: string;
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

export function getClients(): Promise<Client[]> {
  return request<Client[]>();
}

export function createClient(
  client: ClientInput,
): Promise<Client> {
  return request<Client>("", {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export function updateClient(
  id: number,
  client: ClientInput,
): Promise<Client> {
  return request<Client>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(client),
  });
}

export function deleteClient(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
