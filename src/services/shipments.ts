
const API_BASE = "https://backend-ritech.onrender.com/api/shipments";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

export type ShipmentStatus =
  | "PENDING"
  | "PREPARING"
  | "IN_TRANSIT"
  | "CUSTOMS"
  | "DELIVERED"
  | "DELAYED"
  | "CANCELLED";

export interface Shipment {
  id: number;
  exportOrder: {
    id: number;
    orderCode: string;
    client?: {
      id: number;
      companyName?: string;
    };
  };
  trackingNumber: string | null;
  carrier: string | null;
  shipmentDate: string | null;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: ShipmentStatus;
  notes: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ShipmentInput {
  exportOrderId: number;
  trackingNumber: string;
  carrier: string;
  shipmentDate: string | null;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: ShipmentStatus;
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

export function getShipments(): Promise<Shipment[]> {
  return request<Shipment[]>();
}

export function getShipment(id: number): Promise<Shipment> {
  return request<Shipment>(`/${id}`);
}

export function getShipmentByTrackingNumber(
  trackingNumber: string,
): Promise<Shipment> {
  return request<Shipment>(
    `/tracking/${encodeURIComponent(trackingNumber)}`,
  );
}

export function createShipment(
  shipment: ShipmentInput,
): Promise<Shipment> {
  return request<Shipment>("", {
    method: "POST",
    body: JSON.stringify(shipment),
  });
}

export function updateShipment(
  id: number,
  shipment: ShipmentInput,
): Promise<Shipment> {
  return request<Shipment>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(shipment),
  });
}

export function deleteShipment(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
