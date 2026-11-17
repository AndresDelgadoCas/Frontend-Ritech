import type { AuthUser, UserRole } from "./auth";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

export interface ProductOption { id: number; name: string; productType: string; description: string | null }
export interface ProducerContact { id: number; name: string; contact: string | null; email: string | null; phone: string | null }
export interface ClientContact { id: number; companyName: string; contactName: string; email: string | null; phone: string | null; country: string; address: string | null }
export interface LotOption { id: number; lotCode: string; quantity: number; status: string; harvestDate: string | null; productId: number; productName: string }
export interface ListingView { id: number; title: string; description: string | null; priceUsdPerKg: number; minimumOrderKg: number; status: string; createdAt: string | null; product: ProductOption; producer: ProducerContact; inventoryLot: LotOption }
export interface CartItemView { id: number; listing: ListingView; quantityKg: number; lineTotalUsd: number }
export interface CartView { id: number; status: string; items: CartItemView[]; totalUsd: number; sellerName: string | null }
export interface OrderLineView { id: number; productName: string; productType: string; lotCode: string; quantityKg: number; priceUsdPerKg: number; totalUsd: number }
export interface OrderView { id: number; orderCode: string; orderDate: string; status: string; destinationCountry: string; destinationAddress: string | null; notes: string | null; totalUsd: number; buyer: ClientContact; seller: ProducerContact | null; items: OrderLineView[] }
export interface UserRecord { id: number; fullName: string; username: string; email: string; role: UserRole; roles: UserRole[]; active: boolean; profileId: number | null; profileLabel: string | null; clientProfileLabel: string | null; producerProfileLabel: string | null }
export interface ProfileOption { id: number; label: string; secondary: string | null; linkedUserId: number | null }
export interface AuditRecord { id: number; actorUserId: number | null; action: string; entityType: string; entityId: number | null; details: Record<string, unknown> | null; createdAt: string | null }

async function csrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo obtener el token CSRF.");
  const data = await response.json() as { token?: string };
  if (!data.token) throw new Error("El backend no devolvió el token CSRF.");
  return data.token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-XSRF-TOKEN", await csrfToken());
  const response = await fetch(`${API_BASE}/api${path}`, { ...options, method, headers, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message || body.error || `Error del servidor (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  const raw = await response.text();
  return raw ? JSON.parse(raw) as T : undefined as T;
}

export const getCatalog = () => request<ListingView[]>("/marketplace/catalog");
export const getProducts = () => request<ProductOption[]>("/marketplace/products");
export const getMyListings = () => request<ListingView[]>("/marketplace/seller/listings");
export const createListing = (data: { inventoryLotId: number; title: string; description: string; priceUsdPerKg: number; minimumOrderKg: number; status: string }) => request<ListingView>("/marketplace/seller/listings", { method: "POST", body: JSON.stringify(data) });
export const updateListing = (id: number, data: Partial<{ title: string; description: string; priceUsdPerKg: number; minimumOrderKg: number; status: string }>) => request<ListingView>(`/marketplace/seller/listings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const getMyLots = () => request<LotOption[]>("/marketplace/seller/lots");
export const createLot = (data: { productId: number; lotCode: string; quantity: number; harvestDate: string | null }) => request<LotOption>("/marketplace/seller/lots", { method: "POST", body: JSON.stringify(data) });
export const getCart = () => request<CartView>("/marketplace/cart");
export const addCartItem = (listingId: number, quantityKg: number) => request<CartView>("/marketplace/cart/items", { method: "POST", body: JSON.stringify({ listingId, quantityKg }) });
export const updateCartItem = (id: number, quantityKg: number) => request<CartView>(`/marketplace/cart/items/${id}`, { method: "PUT", body: JSON.stringify({ quantityKg }) });
export const removeCartItem = (id: number) => request<CartView>(`/marketplace/cart/items/${id}`, { method: "DELETE" });
export const checkout = (notes: string) => request<OrderView>("/marketplace/checkout", { method: "POST", body: JSON.stringify({ notes }) });
export const getMyOrders = (role?: UserRole) => request<OrderView[]>(`/marketplace/orders${role ? `?role=${encodeURIComponent(role)}` : ""}`);
export const updateOrderStatus = (id: number, status: string) => request<OrderView>(`/marketplace/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const getUsers = () => request<UserRecord[]>("/users");
export const createUser = (data: { fullName: string; username: string; email: string; password: string; role: UserRole; companyName?: string; contactName?: string; country?: string; phone?: string; address?: string }) => request<AuthUser>("/users", { method: "POST", body: JSON.stringify(data) });
export const createBuyerProfile = (userId: number, data: { companyName: string; contactName: string; country: string; email?: string; phone?: string; address?: string }) => request<void>(`/admin/users/${userId}/client-profile`, { method: "POST", body: JSON.stringify(data) });
export const getAvailableProfiles = (role: UserRole) => request<ProfileOption[]>(`/admin/profiles?role=${encodeURIComponent(role)}`);
export const assignProfile = (userId: number, profileType: "PRODUCER" | "CLIENT", profileId: number) => request<void>(`/admin/users/${userId}/profile`, { method: "PATCH", body: JSON.stringify({ profileType, profileId }) });
export const setUserActive = (userId: number, active: boolean) => request<void>(`/admin/users/${userId}/active`, { method: "PATCH", body: JSON.stringify({ active }) });
export const setUserRole = (userId: number, role: UserRole) => request<void>(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
export const resetUserPassword = (userId: number, password: string) => request<void>(`/admin/users/${userId}/password`, { method: "PATCH", body: JSON.stringify({ password }) });
export const getAuditLogs = () => request<AuditRecord[]>("/admin/audit");

export interface SellerApplication { id:number; userId:number; username:string; businessName:string; contactName:string; email:string; phone:string|null; country:string; productType:string; businessDescription:string|null; status:string; rejectionReason:string|null; producerId:number|null; createdAt:string|null }
export const submitSellerApplication = (data: {businessName:string;contactName:string;email:string;phone?:string;country:string;productType:string;businessDescription?:string}) => request<SellerApplication>("/seller-applications", {method:"POST",body:JSON.stringify(data)});
export const getMySellerApplications = () => request<SellerApplication[]>("/seller-applications/mine");
export const getSellerApplications = () => request<SellerApplication[]>("/seller-applications/admin");
export const reviewSellerApplication = (id:number, decision:"APPROVE"|"REJECT", rejectionReason?:string) => request<SellerApplication>(`/seller-applications/admin/${id}/review`, {method:"PATCH",body:JSON.stringify({decision,rejectionReason})});
