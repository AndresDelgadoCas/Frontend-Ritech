
const API_BASE = "https://backend-ritech.onrender.com/api/purchases";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

export interface Purchase {
  id: number;
  producer: {
    id: number;
    name: string;
  };
  product: {
    id: number;
    name: string;
    productType: "COFFEE" | "COCOA";
  };
  inventoryLot: {
    id: number;
  } | null;
  purchaseDate: string;
  quantityKg: number;
  purchasePriceUsdPerKg: number;
  totalAmountUsd: number;
  notes: string | null;
}

export interface PurchaseInput {
  producerId: number;
  productId: number;
  inventoryLotId: number | null;
  purchaseDate: string;
  quantityKg: number;
  purchasePriceUsdPerKg: number;
  notes: string;
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

export function getPurchases(): Promise<Purchase[]> {
  return request<Purchase[]>();
}

export function createPurchase(
  purchase: PurchaseInput,
): Promise<Purchase> {
  return request<Purchase>("", {
    method: "POST",
    body: JSON.stringify(purchase),
  });
}

export function updatePurchase(
  id: number,
  purchase: PurchaseInput,
): Promise<Purchase> {
  return request<Purchase>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(purchase),
  });
}

export function deletePurchase(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
