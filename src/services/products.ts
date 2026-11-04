
const API_BASE = "https://backend-ritech.onrender.com/api/products";
const AUTH_BASE = "https://backend-ritech.onrender.com/api/auth";

export interface Product {
  id: number;
  name: string;
  productType: "COFFEE" | "COCOA";
  description: string | null;
  unitOfMeasure: string;
  createdAt?: string | null;
}

export interface ProductInput {
  name: string;
  productType: "COFFEE" | "COCOA";
  description: string;
  unitOfMeasure: string;
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
    const body = await response.json().catch(() => ({}));

    const message =
      typeof body.message === "string"
        ? body.message
        : `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>();
}

export function createProduct(
  product: ProductInput,
): Promise<Product> {
  return request<Product>("", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function updateProduct(
  id: number,
  product: ProductInput,
): Promise<Product> {
  return request<Product>(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id: number): Promise<void> {
  return request<void>(`/${id}`, {
    method: "DELETE",
  });
}
