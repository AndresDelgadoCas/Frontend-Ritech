
const API_BASE = "/api/inventory-lots";

export type InventoryLotStatus = "AVAILABLE" | "RESERVED" | "EXPORTED";

export interface InventoryLot {
  id: number;
  product: {
    id: number;
    name: string;
    productType?: string;
    unitOfMeasure?: string;
  };
  producer: {
    id: number;
    name: string;
  };
  lotCode: string;
  quantity: number;
  harvestDate: string | null;
  receivedAt: string | null;
  status: InventoryLotStatus;
}

export interface InventoryLotInput {
  productId: number;
  producerId: number;
  lotCode: string;
  quantity: number;
  harvestDate: string | null;
  status: InventoryLotStatus;
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

  // Añadir el token CSRF a las peticiones que modifican información.
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
          : typeof body?.error === "string"
            ? body.error
            : `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getInventoryLots(): Promise<InventoryLot[]> {
  return request<InventoryLot[]>();
}

export function createInventoryLot(
  input: InventoryLotInput,
): Promise<InventoryLot> {
  return request<InventoryLot>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateInventoryLot(
  id: number,
  input: InventoryLotInput,
): Promise<InventoryLot> {
  return request<InventoryLot>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteInventoryLot(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
