
const API_BASE_URL = "/api";

export interface StockReportItem {
  productType: string;
  availableStockKg: number;
}

export interface ExportedVolumeItem {
  month: string;
  exportedVolumeKg: number;
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

/**
 * Obtiene el inventario disponible agrupado por tipo de producto.
 */
export async function getStockReport(): Promise<StockReportItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/reports/stock-by-product-type`
  );

  return handleResponse<StockReportItem[]>(response);
}

/**
 * Obtiene el volumen exportado mensualmente.
 */
export async function getMonthlyExportedVolume(): Promise<
  ExportedVolumeItem[]
> {
  const response = await fetch(
    `${API_BASE_URL}/reports/exported-volume/monthly`
  );

  return handleResponse<ExportedVolumeItem[]>(response);
}
