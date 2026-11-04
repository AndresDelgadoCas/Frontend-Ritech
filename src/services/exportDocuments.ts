
const API_BASE = "https://backend-ritech.onrender.com/api/export-documents";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

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
