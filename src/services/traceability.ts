
const API_BASE_URL = "/api";

export interface TraceabilityClient {
  id: number;
  companyName: string;
  country: string;
}

export interface TraceabilityOrder {
  id: number;
  orderCode: string;
  orderDate: string | null;
  status: string;
  destinationCountry: string;
  destinationAddress: string;
  client: TraceabilityClient | null;
}

export interface TraceabilityProduct {
  id: number;
  name: string;
  productType: string;
  unitOfMeasure: string;
}

export interface TraceabilityInventoryLot {
  id: number;
  lotCode: string;
  quantity: number;
  harvestDate: string | null;
  receivedAt: string | null;
  status: string;
  producerId: number | null;
}

export interface TraceabilityCertification {
  id: number;
  certificationType: string;
  certificateCode: string;
  issuingOrganization: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: string;
}

export interface TraceabilityItem {
  itemId: number;
  quantityKg: number;
  salePriceUsdPerKg: number;
  totalAmountUsd: number;
  product?: TraceabilityProduct;
  inventoryLot: TraceabilityInventoryLot | null;
  certifications: TraceabilityCertification[];
}

export interface TraceabilityReport {
  reportType: string;
  order: TraceabilityOrder;
  items: TraceabilityItem[];
  exportDocumentIds: number[];
  shipmentIds: number[];
  itemCount: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Error ${response.status}: ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getTraceabilityReport(
  orderId: number
): Promise<TraceabilityReport> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error("El ID de la orden de exportación no es válido.");
  }

  const response = await fetch(
    `${API_BASE_URL}/reports/traceability/${orderId}`,
    {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return handleResponse<TraceabilityReport>(response);
}
