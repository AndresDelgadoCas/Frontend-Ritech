
const API_BASE = "/api/export-orders";

export type ExportOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "IN_PREPARATION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface ExportOrder {
  id: number;
  orderCode: string;
  client: {
    id: number;
    companyName: string;
    contactName?: string;
    country?: string;
  };
  destinationCountry: string;
  destinationAddress: string | null;
  orderDate: string;
  status: ExportOrderStatus;
  notes: string | null;
}

export interface ExportOrderInput {
  orderCode: string;
  clientId: number;
  destinationCountry: string;
  destinationAddress: string;
  orderDate: string;
  status: ExportOrderStatus;
  notes: string;
}

function getCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.substring(prefix.length));
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

export function getExportOrders(): Promise<ExportOrder[]> {
  return request<ExportOrder[]>();
}

export function getExportOrder(
  id: number,
): Promise<ExportOrder> {
  return request<ExportOrder>(`/${id}`);
}

export function createExportOrder(
  order: ExportOrderInput,
): Promise<ExportOrder> {
  return request<ExportOrder>("", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export function updateExportOrder(
  id: number,
  order: ExportOrderInput,
): Promise<ExportOrder> {
  return request<ExportOrder>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(order),
  });
}

export function deleteExportOrder(
  id: number,
): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
