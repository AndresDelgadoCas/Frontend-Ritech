
const API_BASE =
  "https://backend-ritech.onrender.com/api/inventory-lots";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

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
