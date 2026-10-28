
const API_BASE = "/api/export-documents";

export type DocumentStatus = "PENDING" | "GENERATED" | "APPROVED";

export interface ExportDocument {
  id: number;
  exportOrder: {
    id: number;
    orderCode?: string;
    client?: {
      id: number;
      companyName?: string;
    };
  };
  documentType: string;
  documentNumber: string | null;
  fileUrl: string | null;
  status: DocumentStatus;
  generatedAt: string | null;
  createdAt: string | null;
}

export interface ExportDocumentInput {
  exportOrderId: number;
  documentType: string;
  documentNumber: string;
  fileUrl: string;
  status: DocumentStatus;
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

    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : typeof body?.detail === "string"
          ? body.detail
          : `Error HTTP ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getExportDocuments(): Promise<ExportDocument[]> {
  return request<ExportDocument[]>();
}

export function createExportDocument(
  document: ExportDocumentInput,
): Promise<ExportDocument> {
  return request<ExportDocument>("", {
    method: "POST",
    body: JSON.stringify(document),
  });
}

export function updateExportDocument(
  id: number,
  document: ExportDocumentInput,
): Promise<ExportDocument> {
  return request<ExportDocument>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(document),
  });
}

export function deleteExportDocument(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
