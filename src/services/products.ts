
const API_BASE = "/api/products";

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

async function request<T>(
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
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
