
const API_BASE = "/api/shipments";

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
