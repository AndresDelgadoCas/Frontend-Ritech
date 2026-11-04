
const API_BASE = "https://backend-ritech.onrender.com/api/certifications";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

export type CertificationStatus = "VALID" | "EXPIRED" | "PENDING";

export interface Certification {
  id: number;
  inventoryLot: {
    id: number;
  };
  certificationType: string;
  certificateCode: string;
  issuingOrganization: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: CertificationStatus;
}

export interface CertificationInput {
  inventoryLotId: number;
  certificationType: string;
  certificateCode: string;
  issuingOrganization: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: CertificationStatus;
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

export function getCertifications(): Promise<Certification[]> {
  return request<Certification[]>();
}

export function getCertification(
  id: number,
): Promise<Certification> {
  return request<Certification>(`/${id}`);
}

export function getCertificationsByStatus(
  status: CertificationStatus,
): Promise<Certification[]> {
  return request<Certification[]>(`/status/${status}`);
}

export function getCertificationsByInventoryLot(
  inventoryLotId: number,
): Promise<Certification[]> {
  return request<Certification[]>(`/inventory-lot/${inventoryLotId}`);
}

export function createCertification(
  certification: CertificationInput,
): Promise<Certification> {
  return request<Certification>("", {
    method: "POST",
    body: JSON.stringify(certification),
  });
}

export function updateCertification(
  id: number,
  certification: CertificationInput,
): Promise<Certification> {
  return request<Certification>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(certification),
  });
}

export function deleteCertification(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
