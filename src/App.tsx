import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity, ArrowRight, Boxes, ChartNoAxesCombined, ClipboardList,
  Coffee, FileText, Globe2, LayoutDashboard, Leaf, LogOut, Package,
  Search, ShieldCheck, Ship, ShoppingCart, Sprout, Users, Warehouse, Pencil, Plus, RefreshCw, Trash2, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getCurrentUser, login, logout } from "./services/auth";
import type { AuthUser, UserRole } from "./services/auth";
import { getProducts } from "./services/products";
import type { Product } from "./services/products";
import {
  createInventoryLot, deleteInventoryLot, getInventoryLots, updateInventoryLot,
} from "./services/inventory";
import type { InventoryLot, InventoryLotInput, InventoryLotStatus } from "./services/inventory";
import {
  createProducer, deleteProducer, getProducers, updateProducer,
} from "./services/producers";
import type { Producer, ProducerInput } from "./services/producers";
import { createClient, deleteClient, getClients, updateClient } from "./services/clients";
import type { Client, ClientInput } from "./services/clients";
import {
  createPurchase, deletePurchase, getPurchases, updatePurchase,
} from "./services/purchases";
import type { Purchase, PurchaseInput } from "./services/purchases";
import {
  createExportOrder, deleteExportOrder, getExportOrders, updateExportOrder,
} from "./services/exportOrders";
import type { ExportOrder, ExportOrderInput, ExportOrderStatus } from "./services/exportOrders";
import { createShipment, deleteShipment, getShipments, updateShipment } from "./services/shipments";
import type { Shipment, ShipmentInput, ShipmentStatus } from "./services/shipments";
import {
  createCertification, deleteCertification, getCertifications, updateCertification,
} from "./services/certifications";
import type {
  Certification, CertificationInput, CertificationStatus,
} from "./services/certifications";
import {
  createExportDocument, deleteExportDocument, getExportDocuments, updateExportDocument,
} from "./services/exportDocuments";
import type {
  ExportDocument, ExportDocumentInput, DocumentStatus,
} from "./services/exportDocuments";
import { getTraceabilityReport } from "./services/traceability";
import type { TraceabilityReport } from "./services/traceability";
import { getMonthlyExportedVolume, getStockReport } from "./services/reports";
import type { ExportedVolumeItem, StockReportItem } from "./services/reports";
import "./App.css";

type Section =
  | "Panel principal" | "Productos" | "Productores" | "Inventario"
  | "Clientes" | "Compras" | "Órdenes de exportación" | "Envíos"
  | "Certificaciones" | "Documentos" | "Trazabilidad" | "Reportes";

type StockRow = { productType: string; availableStockKg: number };

const groups = [
  {
    title: "ESPACIO DE TRABAJO",
    items: [
      { label: "Panel principal" as Section, icon: LayoutDashboard, roles: ["ADMINISTRADOR", "COMPRAS", "INVENTARIO", "EXPORTADOR", "VENTAS", "GERENCIA"] },
      { label: "Productos" as Section, icon: Package, roles: ["ADMINISTRADOR", "COMPRAS", "INVENTARIO", "EXPORTADOR", "VENTAS", "GERENCIA"] },
      { label: "Productores" as Section, icon: Sprout, roles: ["ADMINISTRADOR", "COMPRAS", "GERENCIA"] },
      { label: "Inventario" as Section, icon: Warehouse, roles: ["ADMINISTRADOR", "COMPRAS", "INVENTARIO", "EXPORTADOR", "VENTAS", "GERENCIA"] },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      { label: "Clientes" as Section, icon: Users, roles: ["ADMINISTRADOR", "EXPORTADOR", "VENTAS", "GERENCIA"] },
      { label: "Compras" as Section, icon: ShoppingCart, roles: ["ADMINISTRADOR", "COMPRAS", "GERENCIA"] },
      { label: "Órdenes de exportación" as Section, icon: ClipboardList, roles: ["ADMINISTRADOR", "INVENTARIO", "EXPORTADOR", "VENTAS", "GERENCIA"] },
      { label: "Envíos" as Section, icon: Ship, roles: ["ADMINISTRADOR", "EXPORTADOR", "GERENCIA"] },
    ],
  },
  {
    title: "CUMPLIMIENTO",
    items: [
      { label: "Certificaciones" as Section, icon: ShieldCheck, roles: ["ADMINISTRADOR", "INVENTARIO", "EXPORTADOR", "GERENCIA"] },
      { label: "Documentos" as Section, icon: FileText, roles: ["ADMINISTRADOR", "EXPORTADOR", "GERENCIA"] },
      { label: "Trazabilidad" as Section, icon: Globe2, roles: ["ADMINISTRADOR", "EXPORTADOR", "GERENCIA"] },
      { label: "Reportes" as Section, icon: ChartNoAxesCombined, roles: ["ADMINISTRADOR", "GERENCIA"] },
    ],
  },
] satisfies { title: string; items: { label: Section; icon: typeof Leaf; roles: string[] }[] }[];

const exportDemo = [
  { month: "May", volume: 6200 },
  { month: "Jun", volume: 7800 },
  { month: "Jul", volume: 6900 },
  { month: "Ago", volume: 9400 },
  { month: "Sep", volume: 8100 },
  { month: "Oct", volume: 10800 },
];

const roleLabels: Record<UserRole, string> = {
  ADMINISTRADOR: "Administrador",
  COMPRAS: "Compras",
  INVENTARIO: "Inventario",
  EXPORTADOR: "Exportaciones",
  VENTAS: "Ventas",
  GERENCIA: "Gerencia",
};

function formatKg(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
  }).format(value);
}

function parseStockResponse(data: unknown): StockRow[] {
  let rows: unknown[] = [];

  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const result = data as { value?: unknown; content?: unknown };
    if (Array.isArray(result.value)) rows = result.value;
    else if (Array.isArray(result.content)) rows = result.content;
  }

  return rows
    .filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null,
    )
    .map((row) => ({
      productType: String(row.productType ?? "OTRO"),
      availableStockKg: Number(row.availableStockKg ?? 0),
    }))
    .filter((row) => Number.isFinite(row.availableStockKg));
}

function productTypeLabel(value: string): string {
  if (value === "COFFEE") return "Café";
  if (value === "COCOA") return "Cacao";
  return value;
}

function LoginScreen({
  onLogin,
  busy,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onLogin(username.trim(), password);
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><Leaf size={25} /></div>
          <div className="brand-copy">
            <strong>ritech<span>sas</span></strong>
            <small>COMERCIO Y TRAZABILIDAD</small>
          </div>
        </div>

        <div className="login-heading">
          <div className="eyebrow"><span /> ACCESO EMPRESARIAL</div>
          <h1>Bienvenido de nuevo</h1>
          <p>Inicia sesión para entrar al espacio de trabajo de RiTech SAS.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Tu nombre de usuario"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tu contraseña"
            required
          />

          {error && (
            <div className="error-banner login-error" role="alert">{error}</div>
          )}

          <button className="primary-button login-submit" type="submit" disabled={busy}>
            {busy ? "Verificando..." : "Iniciar sesión"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        <p className="login-footnote">Acceso protegido · RiTech SAS</p>
      </section>
    </main>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [section, setSection] = useState<Section>("Panel principal");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockError, setStockError] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [producers, setProducers] = useState<Producer[]>([]);
  const [loadingProducers, setLoadingProducers] = useState(false);
  const [producersError, setProducersError] = useState("");
  const [producerSuccess, setProducerSuccess] = useState("");
  const [producerSaving, setProducerSaving] = useState(false);
  const [producerFormOpen, setProducerFormOpen] = useState(false);
  const [editingProducerId, setEditingProducerId] = useState<number | null>(null);
  const [producerForm, setProducerForm] = useState<ProducerInput>({
    name: "",
    contact: "",
    phone: "",
    email: "",
    productType: "COFFEE",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState("");
  const [clientSuccess, setClientSuccess] = useState("");
  const [clientSaving, setClientSaving] = useState(false);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientInput>({
    companyName: "",
    contactName: "",
    country: "",
    email: "",
    phone: "",
    address: "",
  });

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchasesError, setPurchasesError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseInput>({
    producerId: 0,
    productId: 0,
    inventoryLotId: null,
    purchaseDate: new Date().toISOString().slice(0, 10),
    quantityKg: 1,
    purchasePriceUsdPerKg: 0,
    notes: "",
  });

  const [exportOrders, setExportOrders] = useState<ExportOrder[]>([]);
  const [loadingExportOrders, setLoadingExportOrders] = useState(false);
  const [exportOrdersError, setExportOrdersError] = useState("");
  const [exportOrderSuccess, setExportOrderSuccess] = useState("");
  const [exportOrderSaving, setExportOrderSaving] = useState(false);
  const [exportOrderFormOpen, setExportOrderFormOpen] = useState(false);
  const [editingExportOrderId, setEditingExportOrderId] = useState<number | null>(null);
  const [exportOrderForm, setExportOrderForm] = useState<ExportOrderInput>({
    orderCode: "",
    clientId: 0,
    destinationCountry: "",
    destinationAddress: "",
    orderDate: new Date().toISOString().slice(0, 10),
    status: "DRAFT",
    notes: "",
  });

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [shipmentsError, setShipmentsError] = useState("");
  const [shipmentSuccess, setShipmentSuccess] = useState("");
  const [shipmentSaving, setShipmentSaving] = useState(false);
  const [shipmentFormOpen, setShipmentFormOpen] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<number | null>(null);
  const [shipmentForm, setShipmentForm] = useState<ShipmentInput>({
    exportOrderId: 0,
    trackingNumber: "",
    carrier: "",
    shipmentDate: "",
    estimatedDeliveryDate: "",
    actualDeliveryDate: "",
    status: "PENDING",
    notes: "",
  });

  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);
  const [certificationsError, setCertificationsError] = useState("");
  const [certificationSuccess, setCertificationSuccess] = useState("");
  const [certificationSaving, setCertificationSaving] = useState(false);
  const [certificationFormOpen, setCertificationFormOpen] = useState(false);
  const [editingCertificationId, setEditingCertificationId] = useState<number | null>(null);
  const [certificationForm, setCertificationForm] = useState<CertificationInput>({
    inventoryLotId: 0,
    certificationType: "",
    certificateCode: "",
    issuingOrganization: "",
    issueDate: "",
    expirationDate: "",
    status: "PENDING",
  });

  const [exportDocuments, setExportDocuments] = useState<ExportDocument[]>([]);
  const [loadingExportDocuments, setLoadingExportDocuments] = useState(false);
  const [exportDocumentsError, setExportDocumentsError] = useState("");
  const [exportDocumentSuccess, setExportDocumentSuccess] = useState("");
  const [exportDocumentSaving, setExportDocumentSaving] = useState(false);
  const [exportDocumentFormOpen, setExportDocumentFormOpen] = useState(false);
  const [editingExportDocumentId, setEditingExportDocumentId] = useState<number | null>(null);
  const [exportDocumentForm, setExportDocumentForm] = useState<ExportDocumentInput>({
    exportOrderId: 0,
    documentType: "",
    documentNumber: "",
    fileUrl: "",
    status: "PENDING",
  });

  const [traceabilityReport, setTraceabilityReport] = useState<TraceabilityReport | null>(null);
  const [traceabilityOrderId, setTraceabilityOrderId] = useState<number | "">("");
  const [loadingTraceability, setLoadingTraceability] = useState(false);
  const [traceabilityError, setTraceabilityError] = useState("");
  const [stockReport, setStockReport] = useState<StockReportItem[]>([]);
  const [monthlyVolume, setMonthlyVolume] = useState<ExportedVolumeItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");

  const canViewReports =
    user?.role === "ADMINISTRADOR" || user?.role === "GERENCIA";

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setLoginBusy(true);
    setLoginError("");

    try {
      const authenticatedUser = await login(username, password);
      setUser(authenticatedUser);
      setSection("Panel principal");
      setSearch("");
      setLogoutError("");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError("");

    try {
      await logout();
      setUser(null);
      setSection("Panel principal");
      setSearch("");
      setStock([]);
      setStockError("");
      setProducts([]);
      setProducers([]);
      setClients([]);
      setPurchases([]);
      setExportOrders([]);
      setShipments([]);
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
    }
  };

  const loadStock = useCallback(async () => {
    if (!canViewReports) return;

    setLoadingStock(true);
    setStockError("");

    try {
      const response = await fetch("/api/reports/stock-by-product-type", {
        credentials: "same-origin",
      });

      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

      const data: unknown = await response.json();
      setStock(parseStockResponse(data));
    } catch {
      setStockError(
        "No se pudo consultar el inventario. Verifica que el backend esté funcionando.",
      );
    } finally {
      setLoadingStock(false);
    }
  }, [canViewReports]);

  useEffect(() => {
    if (
      user &&
      canViewReports &&
      (section === "Panel principal" || section === "Inventario")
    ) {
      void loadStock();
    }
  }, [user, canViewReports, section, refreshKey, loadStock]);

  useEffect(() => {
    if (!user || section !== "Productos") return;

    let cancelled = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setProductsError("");

      try {
        const data = await getProducts();
        if (!cancelled) setProducts(data);
      } catch (error) {
        if (!cancelled) {
          setProductsError(
            error instanceof Error
              ? error.message
              : "No se pudieron consultar los productos.",
          );
        }
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    void loadProducts();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Productores") return;

    let cancelled = false;

    async function loadProducers() {
      setLoadingProducers(true);
      setProducersError("");

      try {
        const data = await getProducers();
        if (!cancelled) setProducers(data);
      } catch (error) {
        if (!cancelled) {
          setProducersError(
            error instanceof Error
              ? error.message
              : "No se pudieron consultar los productores.",
          );
        }
      } finally {
        if (!cancelled) setLoadingProducers(false);
      }
    }

    void loadProducers();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Clientes") return;

    let cancelled = false;

    async function loadClients() {
      setLoadingClients(true);
      setClientsError("");

      try {
        const data = await getClients();
        if (!cancelled) setClients(data);
      } catch (error) {
        if (!cancelled) {
          setClientsError(
            error instanceof Error ? error.message : "No se pudieron consultar los clientes.",
          );
        }
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    }

    void loadClients();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Compras") return;

    let cancelled = false;
    async function loadPurchases() {
      setLoadingPurchases(true);
      setPurchasesError("");
      try {
        const data = await getPurchases();
        if (!cancelled) setPurchases(data);
      } catch (error) {
        if (!cancelled) {
          setPurchasesError(error instanceof Error ? error.message : "No se pudieron consultar las compras.");
        }
      } finally {
        if (!cancelled) setLoadingPurchases(false);
      }
    }
    void loadPurchases();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Compras") return;
    let cancelled = false;
    getProducers()
      .then((data) => { if (!cancelled) setProducers(data); })
      .catch(() => { if (!cancelled) setProducersError("No se pudieron cargar los productores para Compras."); });
    getProducts()
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch(() => { if (!cancelled) setProductsError("No se pudieron cargar los productos para Compras."); });
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Órdenes de exportación") return;

    let cancelled = false;
    async function loadExportOrders() {
      setLoadingExportOrders(true);
      setExportOrdersError("");
      try {
        const data = await getExportOrders();
        if (!cancelled) setExportOrders(data);
      } catch (error) {
        if (!cancelled) {
          setExportOrdersError(
            error instanceof Error ? error.message : "No se pudieron consultar las órdenes de exportación.",
          );
        }
      } finally {
        if (!cancelled) setLoadingExportOrders(false);
      }
    }

    void loadExportOrders();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Órdenes de exportación") return;
    let cancelled = false;
    getClients()
      .then((data) => { if (!cancelled) setClients(data); })
      .catch(() => {
        if (!cancelled) setClientsError("No se pudieron cargar los clientes para las órdenes de exportación.");
      });
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Envíos") return;
    let cancelled = false;
    async function loadShipments() {
      setLoadingShipments(true);
      setShipmentsError("");
      try {
        const data = await getShipments();
        if (!cancelled) setShipments(data);
      } catch (error) {
        if (!cancelled) setShipmentsError(
          error instanceof Error ? error.message : "No se pudieron consultar los envíos.",
        );
      } finally {
        if (!cancelled) setLoadingShipments(false);
      }
    }
    void loadShipments();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Envíos") return;
    let cancelled = false;
    getExportOrders()
      .then((data) => { if (!cancelled) setExportOrders(data); })
      .catch(() => {
        if (!cancelled) setShipmentsError("No se pudieron cargar las órdenes de exportación.");
      });
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Certificaciones") return;

    let cancelled = false;
    async function loadCertifications() {
      setLoadingCertifications(true);
      setCertificationsError("");
      try {
        const data = await getCertifications();
        if (!cancelled) setCertifications(data);
      } catch (error) {
        if (!cancelled) {
          setCertificationsError(
            error instanceof Error
              ? error.message
              : "No se pudieron consultar las certificaciones.",
          );
        }
      } finally {
        if (!cancelled) setLoadingCertifications(false);
      }
    }

    void loadCertifications();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Documentos") return;

    let cancelled = false;

    async function loadDocuments() {
      setLoadingExportDocuments(true);
      setExportDocumentsError("");

      try {
        const data = await getExportDocuments();
        if (!cancelled) setExportDocuments(data);
      } catch (error) {
        if (!cancelled) {
          setExportDocumentsError(
            error instanceof Error
              ? error.message
              : "No se pudieron consultar los documentos.",
          );
        }
      } finally {
        if (!cancelled) setLoadingExportDocuments(false);
      }
    }

    void loadDocuments();
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Documentos") return;

    let cancelled = false;

    getExportOrders()
      .then((data) => {
        if (!cancelled) setExportOrders(data);
      })
      .catch(() => {
        if (!cancelled) {
          setExportDocumentsError(
            "No se pudieron cargar las órdenes de exportación.",
          );
        }
      });

    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Trazabilidad") return;
    let cancelled = false;
    setTraceabilityError("");
    getExportOrders()
      .then((data) => {
        if (cancelled) return;
        setExportOrders(data);
        setTraceabilityOrderId((current) => {
          if (current && data.some((order) => order.id === current)) return current;
          return data[0]?.id ?? "";
        });
      })
      .catch((error) => {
        if (!cancelled) setTraceabilityError(
          error instanceof Error ? error.message : "No se pudieron cargar las órdenes."
        );
      });
    return () => { cancelled = true; };
  }, [user, section, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Trazabilidad" || !traceabilityOrderId) {
      setTraceabilityReport(null);
      return;
    }
    let cancelled = false;
    setLoadingTraceability(true);
    setTraceabilityError("");
    getTraceabilityReport(Number(traceabilityOrderId))
      .then((data) => { if (!cancelled) setTraceabilityReport(data); })
      .catch((error) => {
        if (!cancelled) {
          setTraceabilityReport(null);
          setTraceabilityError(error instanceof Error ? error.message : "No se pudo consultar la trazabilidad.");
        }
      })
      .finally(() => { if (!cancelled) setLoadingTraceability(false); });
    return () => { cancelled = true; };
  }, [user, section, traceabilityOrderId, refreshKey]);

  useEffect(() => {
    if (!user || section !== "Reportes" || !canViewReports) return;

    let cancelled = false;
    setLoadingReports(true);
    setReportsError("");

    async function loadReports() {
      const [stockResult, volumeResult] = await Promise.allSettled([
        getStockReport(),
        getMonthlyExportedVolume(),
      ]);

      if (cancelled) return;

      const errors: string[] = [];

      if (stockResult.status === "fulfilled") {
        setStockReport(stockResult.value);
      } else {
        errors.push(
          `Stock por producto: ${stockResult.reason instanceof Error
            ? stockResult.reason.message
            : "no se pudo consultar el inventario."}`,
        );
      }

      if (volumeResult.status === "fulfilled") {
        setMonthlyVolume(volumeResult.value);
      } else {
        errors.push(
          `Volumen mensual: ${volumeResult.reason instanceof Error
            ? volumeResult.reason.message
            : "no se pudo consultar el volumen exportado."}`,
        );
      }

      setReportsError(errors.join(" "));
    }

    void loadReports()
      .catch((error) => {
        if (!cancelled) {
          setReportsError(
            error instanceof Error ? error.message : "No se pudieron cargar los reportes.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });

    return () => { cancelled = true; };
  }, [user, section, canViewReports, refreshKey]);

  const resetExportDocumentForm = () => {
    setExportDocumentForm({
      exportOrderId: exportOrders[0]?.id ?? 0,
      documentType: "",
      documentNumber: "",
      fileUrl: "",
      status: "PENDING",
    });
    setEditingExportDocumentId(null);
    setExportDocumentFormOpen(false);
  };

  const startExportDocumentEdit = (document: ExportDocument) => {
    setExportDocumentForm({
      exportOrderId: document.exportOrder?.id ?? 0,
      documentType: document.documentType ?? "",
      documentNumber: document.documentNumber ?? "",
      fileUrl: document.fileUrl ?? "",
      status: document.status ?? "PENDING",
    });
    setEditingExportDocumentId(document.id);
    setExportDocumentFormOpen(true);
    setExportDocumentsError("");
    setExportDocumentSuccess("");
  };

  const handleExportDocumentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExportDocumentSaving(true);
    setExportDocumentsError("");
    setExportDocumentSuccess("");

    const payload: ExportDocumentInput = {
      exportOrderId: Number(exportDocumentForm.exportOrderId),
      documentType: exportDocumentForm.documentType.trim(),
      documentNumber: exportDocumentForm.documentNumber.trim(),
      fileUrl: exportDocumentForm.fileUrl.trim(),
      status: exportDocumentForm.status,
    };

    try {
      if (!payload.exportOrderId) throw new Error("Selecciona una orden de exportación.");
      if (!payload.documentType) throw new Error("El tipo de documento es obligatorio.");
      if (payload.documentType.length > 100) throw new Error("El tipo de documento no puede superar 100 caracteres.");
      if (payload.documentNumber.length > 100) throw new Error("El número de documento no puede superar 100 caracteres.");
      if (payload.fileUrl.length > 500) throw new Error("La URL no puede superar 500 caracteres.");

      if (editingExportDocumentId === null) {
        await createExportDocument(payload);
        setExportDocumentSuccess("Documento registrado correctamente.");
      } else {
        await updateExportDocument(editingExportDocumentId, payload);
        setExportDocumentSuccess("Documento actualizado correctamente.");
      }

      resetExportDocumentForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setExportDocumentsError(
        error instanceof Error ? error.message : "No se pudo guardar el documento.",
      );
    } finally {
      setExportDocumentSaving(false);
    }
  };

  const handleExportDocumentDelete = async (document: ExportDocument) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el documento "${document.documentType}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setExportDocumentsError("");
    setExportDocumentSuccess("");

    try {
      await deleteExportDocument(document.id);
      setExportDocuments((current) => current.filter((item) => item.id !== document.id));
      setExportDocumentSuccess("Documento eliminado correctamente.");
    } catch (error) {
      setExportDocumentsError(
        error instanceof Error ? error.message : "No se pudo eliminar el documento.",
      );
    }
  };

  const resetCertificationForm = () => {
    setCertificationForm({
      inventoryLotId: 0,
      certificationType: "",
      certificateCode: "",
      issuingOrganization: "",
      issueDate: "",
      expirationDate: "",
      status: "PENDING",
    });
    setEditingCertificationId(null);
    setCertificationFormOpen(false);
  };

  const startCertificationEdit = (certification: Certification) => {
    setCertificationForm({
      inventoryLotId: certification.inventoryLot?.id ?? 0,
      certificationType: certification.certificationType ?? "",
      certificateCode: certification.certificateCode ?? "",
      issuingOrganization: certification.issuingOrganization ?? "",
      issueDate: certification.issueDate ?? "",
      expirationDate: certification.expirationDate ?? "",
      status: certification.status ?? "PENDING",
    });
    setEditingCertificationId(certification.id);
    setCertificationFormOpen(true);
    setCertificationsError("");
    setCertificationSuccess("");
  };

  const handleCertificationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCertificationSaving(true);
    setCertificationsError("");
    setCertificationSuccess("");

    const payload: CertificationInput = {
      inventoryLotId: Number(certificationForm.inventoryLotId),
      certificationType: certificationForm.certificationType.trim(),
      certificateCode: certificationForm.certificateCode.trim(),
      issuingOrganization: certificationForm.issuingOrganization.trim(),
      issueDate: certificationForm.issueDate || null,
      expirationDate: certificationForm.expirationDate || null,
      status: certificationForm.status,
    };

    try {
      if (!payload.inventoryLotId) {
        throw new Error("Ingresa el ID de un lote de inventario válido.");
      }
      if (!payload.certificationType || !payload.certificateCode) {
        throw new Error("El tipo y el código de certificación son obligatorios.");
      }
      if (payload.issueDate && payload.expirationDate &&
          payload.expirationDate < payload.issueDate) {
        throw new Error("La fecha de vencimiento no puede ser anterior a la expedición.");
      }

      if (editingCertificationId === null) {
        await createCertification(payload);
        setCertificationSuccess("Certificación registrada correctamente.");
      } else {
        await updateCertification(editingCertificationId, payload);
        setCertificationSuccess("Certificación actualizada correctamente.");
      }
      resetCertificationForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setCertificationsError(
        error instanceof Error ? error.message : "No se pudo guardar la certificación.",
      );
    } finally {
      setCertificationSaving(false);
    }
  };

  const handleCertificationDelete = async (certification: Certification) => {
    if (!window.confirm(
      `¿Seguro que deseas eliminar la certificación "${certification.certificateCode}"? Esta acción no se puede deshacer.`,
    )) return;

    setCertificationsError("");
    setCertificationSuccess("");
    try {
      await deleteCertification(certification.id);
      setCertifications((current) =>
        current.filter((item) => item.id !== certification.id),
      );
      setCertificationSuccess("Certificación eliminada correctamente.");
    } catch (error) {
      setCertificationsError(
        error instanceof Error ? error.message : "No se pudo eliminar la certificación.",
      );
    }
  };

  const resetShipmentForm = () => {
    setShipmentForm({
      exportOrderId: exportOrders[0]?.id ?? 0,
      trackingNumber: "",
      carrier: "",
      shipmentDate: "",
      estimatedDeliveryDate: "",
      actualDeliveryDate: "",
      status: "PENDING",
      notes: "",
    });
    setEditingShipmentId(null);
    setShipmentFormOpen(false);
  };

  const startShipmentEdit = (shipment: Shipment) => {
    setShipmentForm({
      exportOrderId: shipment.exportOrder?.id ?? 0,
      trackingNumber: shipment.trackingNumber ?? "",
      carrier: shipment.carrier ?? "",
      shipmentDate: shipment.shipmentDate ?? "",
      estimatedDeliveryDate: shipment.estimatedDeliveryDate ?? "",
      actualDeliveryDate: shipment.actualDeliveryDate ?? "",
      status: shipment.status ?? "PENDING",
      notes: shipment.notes ?? "",
    });
    setEditingShipmentId(shipment.id);
    setShipmentFormOpen(true);
    setShipmentsError("");
    setShipmentSuccess("");
  };

  const handleShipmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShipmentSaving(true);
    setShipmentsError("");
    setShipmentSuccess("");
    const payload: ShipmentInput = {
      exportOrderId: Number(shipmentForm.exportOrderId),
      trackingNumber: shipmentForm.trackingNumber.trim(),
      carrier: shipmentForm.carrier.trim(),
      shipmentDate: shipmentForm.shipmentDate || null,
      estimatedDeliveryDate: shipmentForm.estimatedDeliveryDate || null,
      actualDeliveryDate: shipmentForm.actualDeliveryDate || null,
      status: shipmentForm.status,
      notes: shipmentForm.notes.trim(),
    };
    try {
      if (!payload.exportOrderId) throw new Error("Selecciona una orden de exportación.");
      if (payload.actualDeliveryDate && !payload.shipmentDate) {
        throw new Error("Registra la fecha de envío antes de la fecha de entrega real.");
      }
      if (payload.shipmentDate && payload.estimatedDeliveryDate &&
          payload.estimatedDeliveryDate < payload.shipmentDate) {
        throw new Error("La entrega estimada no puede ser anterior a la fecha de envío.");
      }
      if (editingShipmentId === null) {
        await createShipment(payload);
        setShipmentSuccess("Envío registrado correctamente.");
      } else {
        await updateShipment(editingShipmentId, payload);
        setShipmentSuccess("Envío actualizado correctamente.");
      }
      resetShipmentForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setShipmentsError(error instanceof Error ? error.message : "No se pudo guardar el envío.");
    } finally {
      setShipmentSaving(false);
    }
  };

  const handleShipmentDelete = async (shipment: Shipment) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el envío #${shipment.id}? Esta acción no se puede deshacer.`)) return;
    setShipmentsError("");
    setShipmentSuccess("");
    try {
      await deleteShipment(shipment.id);
      setShipments((current) => current.filter((item) => item.id !== shipment.id));
      setShipmentSuccess("Envío eliminado correctamente.");
    } catch (error) {
      setShipmentsError(error instanceof Error ? error.message : "No se pudo eliminar el envío.");
    }
  };

  const resetExportOrderForm = () => {
    setExportOrderForm({
      orderCode: "",
      clientId: clients[0]?.id ?? 0,
      destinationCountry: clients[0]?.country ?? "",
      destinationAddress: "",
      orderDate: new Date().toISOString().slice(0, 10),
      status: "DRAFT",
      notes: "",
    });
    setEditingExportOrderId(null);
    setExportOrderFormOpen(false);
  };

  const startExportOrderEdit = (order: ExportOrder) => {
    setExportOrderForm({
      orderCode: order.orderCode ?? "",
      clientId: order.client?.id ?? 0,
      destinationCountry: order.destinationCountry ?? "",
      destinationAddress: order.destinationAddress ?? "",
      orderDate: order.orderDate ?? new Date().toISOString().slice(0, 10),
      status: order.status ?? "DRAFT",
      notes: order.notes ?? "",
    });
    setEditingExportOrderId(order.id);
    setExportOrderFormOpen(true);
    setExportOrdersError("");
    setExportOrderSuccess("");
  };

  const handleExportOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExportOrderSaving(true);
    setExportOrdersError("");
    setExportOrderSuccess("");

    const payload: ExportOrderInput = {
      orderCode: exportOrderForm.orderCode.trim(),
      clientId: Number(exportOrderForm.clientId),
      destinationCountry: exportOrderForm.destinationCountry.trim(),
      destinationAddress: exportOrderForm.destinationAddress.trim(),
      orderDate: exportOrderForm.orderDate,
      status: exportOrderForm.status,
      notes: exportOrderForm.notes.trim(),
    };

    try {
      if (!payload.clientId) throw new Error("Selecciona un cliente.");
      if (!payload.orderCode) throw new Error("El código de la orden es obligatorio.");
      if (!payload.destinationCountry) throw new Error("El país de destino es obligatorio.");
      if (!payload.orderDate) throw new Error("La fecha de la orden es obligatoria.");

      if (editingExportOrderId === null) {
        await createExportOrder(payload);
        setExportOrderSuccess("Orden de exportación registrada correctamente.");
      } else {
        await updateExportOrder(editingExportOrderId, payload);
        setExportOrderSuccess("Orden de exportación actualizada correctamente.");
      }

      resetExportOrderForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setExportOrdersError(
        error instanceof Error ? error.message : "No se pudo guardar la orden de exportación.",
      );
    } finally {
      setExportOrderSaving(false);
    }
  };

  const handleExportOrderDelete = async (order: ExportOrder) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la orden "${order.orderCode}"? Esta acción no se puede deshacer.`)) return;
    setExportOrdersError("");
    setExportOrderSuccess("");
    try {
      await deleteExportOrder(order.id);
      setExportOrders((current) => current.filter((item) => item.id !== order.id));
      setExportOrderSuccess("Orden de exportación eliminada correctamente.");
    } catch (error) {
      setExportOrdersError(
        error instanceof Error ? error.message : "No se pudo eliminar la orden. Puede estar asociada a otros registros.",
      );
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseForm({
      producerId: producers[0]?.id ?? 0,
      productId: products[0]?.id ?? 0,
      inventoryLotId: null,
      purchaseDate: new Date().toISOString().slice(0, 10),
      quantityKg: 1,
      purchasePriceUsdPerKg: 0,
      notes: "",
    });
    setEditingPurchaseId(null);
    setPurchaseFormOpen(false);
  };

  const startPurchaseEdit = (purchase: Purchase) => {
    setPurchaseForm({
      producerId: purchase.producer?.id ?? 0,
      productId: purchase.product?.id ?? 0,
      inventoryLotId: purchase.inventoryLot?.id ?? null,
      purchaseDate: purchase.purchaseDate ?? new Date().toISOString().slice(0, 10),
      quantityKg: Number(purchase.quantityKg ?? 0),
      purchasePriceUsdPerKg: Number(purchase.purchasePriceUsdPerKg ?? 0),
      notes: purchase.notes ?? "",
    });
    setEditingPurchaseId(purchase.id);
    setPurchaseFormOpen(true);
    setPurchasesError("");
    setPurchaseSuccess("");
  };

  const handlePurchaseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPurchaseSaving(true);
    setPurchasesError("");
    setPurchaseSuccess("");
    const payload: PurchaseInput = {
      producerId: Number(purchaseForm.producerId),
      productId: Number(purchaseForm.productId),
      inventoryLotId: purchaseForm.inventoryLotId ? Number(purchaseForm.inventoryLotId) : null,
      purchaseDate: purchaseForm.purchaseDate,
      quantityKg: Number(purchaseForm.quantityKg),
      purchasePriceUsdPerKg: Number(purchaseForm.purchasePriceUsdPerKg),
      notes: purchaseForm.notes.trim(),
    };
    try {
      if (!payload.producerId || !payload.productId) {
        throw new Error("Selecciona un productor y un producto.");
      }
      if (payload.quantityKg <= 0) throw new Error("La cantidad debe ser mayor que cero.");
      if (payload.purchasePriceUsdPerKg < 0) throw new Error("El precio no puede ser negativo.");
      if (editingPurchaseId === null) {
        await createPurchase(payload);
        setPurchaseSuccess("Compra registrada correctamente.");
      } else {
        await updatePurchase(editingPurchaseId, payload);
        setPurchaseSuccess("Compra actualizada correctamente.");
      }
      resetPurchaseForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setPurchasesError(error instanceof Error ? error.message : "No se pudo guardar la compra.");
    } finally {
      setPurchaseSaving(false);
    }
  };

  const handlePurchaseDelete = async (purchase: Purchase) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la compra #${purchase.id}? Esta acción no se puede deshacer.`)) return;
    setPurchasesError("");
    setPurchaseSuccess("");
    try {
      await deletePurchase(purchase.id);
      setPurchases((current) => current.filter((item) => item.id !== purchase.id));
      setPurchaseSuccess("Compra eliminada correctamente.");
    } catch (error) {
      setPurchasesError(error instanceof Error ? error.message : "No se pudo eliminar la compra.");
    }
  };

  const resetClientForm = () => {
    setClientForm({
      companyName: "",
      contactName: "",
      country: "",
      email: "",
      phone: "",
      address: "",
    });
    setEditingClientId(null);
    setClientFormOpen(false);
  };

  const startClientEdit = (client: Client) => {
    setClientForm({
      companyName: client.companyName ?? "",
      contactName: client.contactName ?? "",
      country: client.country ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
    });
    setEditingClientId(client.id);
    setClientFormOpen(true);
    setClientsError("");
    setClientSuccess("");
  };

  const handleClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientSaving(true);
    setClientsError("");
    setClientSuccess("");

    const payload: ClientInput = {
      companyName: clientForm.companyName.trim(),
      contactName: clientForm.contactName.trim(),
      country: clientForm.country.trim(),
      email: clientForm.email.trim(),
      phone: clientForm.phone.trim(),
      address: clientForm.address.trim(),
    };

    try {
      if (editingClientId === null) {
        await createClient(payload);
        setClientSuccess("Cliente registrado correctamente.");
      } else {
        await updateClient(editingClientId, payload);
        setClientSuccess("Cliente actualizado correctamente.");
      }
      resetClientForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setClientsError(
        error instanceof Error ? error.message : "No se pudo guardar el cliente.",
      );
    } finally {
      setClientSaving(false);
    }
  };

  const handleClientDelete = async (client: Client) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar al cliente "${client.companyName}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setClientsError("");
    setClientSuccess("");
    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      setClientSuccess("Cliente eliminado correctamente.");
    } catch (error) {
      setClientsError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el cliente. Puede tener órdenes asociadas.",
      );
    }
  };

  const resetProducerForm = () => {
    setProducerForm({
      name: "",
      contact: "",
      phone: "",
      email: "",
      productType: "COFFEE",
    });
    setEditingProducerId(null);
    setProducerFormOpen(false);
  };

  const startProducerEdit = (producer: Producer) => {
    setProducerForm({
      name: producer.name ?? "",
      contact: producer.contact ?? "",
      phone: producer.phone ?? "",
      email: producer.email ?? "",
      productType: producer.productType === "COCOA" ? "COCOA" : "COFFEE",
    });
    setEditingProducerId(producer.id);
    setProducerFormOpen(true);
    setProducersError("");
    setProducerSuccess("");
  };

  const handleProducerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProducerSaving(true);
    setProducersError("");
    setProducerSuccess("");

    const payload: ProducerInput = {
      name: producerForm.name.trim(),
      contact: producerForm.contact.trim(),
      phone: producerForm.phone.trim(),
      email: producerForm.email.trim(),
      productType: producerForm.productType,
    };

    try {
      if (editingProducerId === null) {
        await createProducer(payload);
        setProducerSuccess("Productor registrado correctamente.");
      } else {
        await updateProducer(editingProducerId, payload);
        setProducerSuccess("Productor actualizado correctamente.");
      }

      resetProducerForm();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setProducersError(
        error instanceof Error ? error.message : "No se pudo guardar el productor.",
      );
    } finally {
      setProducerSaving(false);
    }
  };

  const handleProducerDelete = async (producer: Producer) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar al productor "${producer.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setProducersError("");
    setProducerSuccess("");

    try {
      await deleteProducer(producer.id);
      setProducers((current) =>
        current.filter((item) => item.id !== producer.id),
      );
      setProducerSuccess("Productor eliminado correctamente.");
    } catch (error) {
      setProducersError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el productor. Puede tener compras asociadas.",
      );
    }
  };

  const allowedGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.roles.includes(user?.role ?? ""),
          ),
        }))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.label.toLocaleLowerCase("es").includes(
              search.trim().toLocaleLowerCase("es"),
            ),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [search, user],
  );

  const totalStock = stock.reduce(
    (sum, item) => sum + item.availableStockKg,
    0,
  );
  const coffeeStock =
    stock.find((item) => item.productType === "COFFEE")?.availableStockKg ?? 0;
  const cocoaStock =
    stock.find((item) => item.productType === "COCOA")?.availableStockKg ?? 0;

  const selectSection = (nextSection: Section) => {
    setSection(nextSection);
    setSearch("");
    setLogoutError("");
  };

  if (checkingSession) {
    return (
      <main className="auth-loading">
        <div className="loading-mark"><Leaf size={25} /></div>
        <p>Comprobando sesión...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginScreen onLogin={handleLogin} busy={loginBusy} error={loginError} />
    );
  }

  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Leaf size={23} /></div>
          <div className="brand-copy">
            <strong>ritech<span>sas</span></strong>
            <small>COMERCIO Y TRAZABILIDAD</small>
          </div>
        </div>

        <div className="workspace-switch">
          <div className="workspace-avatar">R</div>
          <div className="workspace-copy">
            <strong>RiTech SAS</strong>
            <span>Espacio empresarial</span>
          </div>
        </div>

        <div className="sidebar-nav">
          {allowedGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>
              {group.items.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`nav-item ${section === label ? "active" : ""}`}
                  aria-current={section === label ? "page" : undefined}
                  onClick={() => selectSection(label)}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
          {allowedGroups.length === 0 && (
            <p className="empty-search">No se encontraron módulos.</p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">{initials || "RT"}</div>
            <div className="profile-copy">
              <strong>{user.fullName}</strong>
              <span>{roleLabels[user.role] ?? user.role}</span>
            </div>
            <button
              className="logout-icon"
              type="button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={() => void handleLogout()}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Espacio de trabajo</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar módulos..."
                aria-label="Buscar módulos"
              />
            </label>
            <div className="topbar-divider" />
            <div className="topbar-avatar">{initials || "RT"}</div>
            <button
              className="secondary-button topbar-logout"
              type="button"
              onClick={() => void handleLogout()}
            >
              <LogOut size={15} /> Salir
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {logoutError && (
            <div className="error-banner" role="alert">{logoutError}</div>
          )}

          {section === "Panel principal" ? (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span /> RESUMEN DE OPERACIONES</div>
                  <h1>Bienvenido, <span>{user.fullName.split(" ")[0]}.</span></h1>
                  <p>
                    Sesión activa como {roleLabels[user.role] ?? user.role}.
                    Accede a los módulos habilitados para tu rol.
                  </p>
                </div>
              </section>

              <section className="date-banner">
                <div className="date-banner-icon"><Activity size={19} /></div>
                <div>
                  <strong>Todo tu comercio, en un solo lugar</strong>
                  <p>Administra y consulta la información permitida para tu perfil.</p>
                </div>
                <div className="banner-status"><span /> Sesión activa</div>
              </section>

              {canViewReports ? (
                <>
                  {stockError && (
                    <div className="error-banner" role="alert">
                      {stockError}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setRefreshKey((value) => value + 1)}
                      >
                        Reintentar
                      </button>
                    </div>
                  )}

                  <section className="metrics-grid">
                    <article className="metric-card">
                      <div className="metric-top">
                        <span>Inventario disponible</span>
                        <div className="metric-icon green"><Warehouse size={19} /></div>
                      </div>
                      <div className="metric-value">
                        {loadingStock ? "…" : formatKg(totalStock)}<span> kg</span>
                      </div>
                      <div className="metric-bottom">Cantidad informada por la API</div>
                    </article>

                    <article className="metric-card">
                      <div className="metric-top">
                        <span>Tipos de producto</span>
                        <div className="metric-icon blue"><Package size={19} /></div>
                      </div>
                      <div className="metric-value">{loadingStock ? "…" : stock.length}</div>
                      <div className="metric-bottom">Tipos incluidos en el reporte</div>
                    </article>

                    <article className="metric-card">
                      <div className="metric-top">
                        <span>Café disponible</span>
                        <div className="metric-icon amber"><Coffee size={19} /></div>
                      </div>
                      <div className="metric-value">
                        {loadingStock ? "…" : formatKg(coffeeStock)}<span> kg</span>
                      </div>
                      <div className="metric-bottom">Según el reporte de inventario</div>
                    </article>

                    <article className="metric-card">
                      <div className="metric-top">
                        <span>Cacao disponible</span>
                        <div className="metric-icon purple"><Sprout size={19} /></div>
                      </div>
                      <div className="metric-value">
                        {loadingStock ? "…" : formatKg(cocoaStock)}<span> kg</span>
                      </div>
                      <div className="metric-bottom">Según el reporte de inventario</div>
                    </article>
                  </section>

                  <section className="content-grid">
                    <article className="panel chart-panel">
                      <div className="panel-header">
                        <div>
                          <h2>Volumen de exportaciones</h2>
                          <p>Datos de demostración de los últimos seis meses.</p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => selectSection("Reportes")}
                        >
                          Ver reportes <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={exportDemo}
                            margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#247a55" stopOpacity={0.17} />
                                <stop offset="100%" stopColor="#247a55" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#edf0eb" strokeDasharray="4 5" vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip
                              formatter={(value) => [
                                `${Number(value).toLocaleString("es-CO")} kg`,
                                "Volumen de demostración",
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="volume"
                              stroke="#247a55"
                              strokeWidth={2.5}
                              fill="url(#volumeFill)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="demo-note">
                        Este gráfico utiliza datos de demostración, no cifras reales de la base de datos.
                      </p>
                    </article>

                    <article className="panel inventory-panel">
                      <div className="panel-header">
                        <div>
                          <h2>Inventario disponible</h2>
                          <p>Datos recibidos del backend.</p>
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="Actualizar inventario"
                          disabled={loadingStock}
                          onClick={() => setRefreshKey((value) => value + 1)}
                        >
                          ↻
                        </button>
                      </div>

                      {loadingStock && <p>Cargando inventario…</p>}
                      {!loadingStock && !stockError && stock.map((item) => (
                        <div className="stock-item" key={item.productType}>
                          <div className="stock-item-top">
                            <div className="stock-product">
                              <div className="product-icon coffee"><Boxes size={17} /></div>
                              <div>
                                <strong>{productTypeLabel(item.productType)}</strong>
                                <span>{item.productType}</span>
                              </div>
                            </div>
                            <strong>{formatKg(item.availableStockKg)} kg</strong>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill coffee-fill"
                              style={{
                                width: `${totalStock > 0 ? (item.availableStockKg / totalStock) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => selectSection("Inventario")}
                      >
                        Consultar inventario <ArrowRight size={15} />
                      </button>
                    </article>
                  </section>
                </>
              ) : (
                <section className="panel role-home">
                  <div className="empty-module-icon"><Boxes size={25} /></div>
                  <h2>Tu espacio de trabajo está listo</h2>
                  <p>
                    Tu perfil tiene acceso a los módulos autorizados.
                    Usa el menú lateral para consultar las opciones disponibles.
                  </p>
                  <p><strong>Rol:</strong> {roleLabels[user.role] ?? user.role}</p>
                </section>
              )}
            </>
          ) : (
            <section className="module-page">
              <div className="eyebrow"><span /> GESTIÓN EMPRESARIAL</div>
              <h1>{section}</h1>
              <p className="module-description">
                Consulta y administra la información del módulo de {section.toLocaleLowerCase("es")}.
              </p>

              {section === "Productores" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de productores</h2>
                      <p>Consulta y administra los productores registrados en RiTech SAS.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={loadingProducers}
                        onClick={() => setRefreshKey((value) => value + 1)}
                      >
                        {loadingProducers ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          resetProducerForm();
                          setProducerFormOpen(true);
                          setProducersError("");
                          setProducerSuccess("");
                        }}
                      >
                        + Nuevo productor
                      </button>
                    </div>
                  </div>

                  {producersError && (
                    <div className="error-banner" role="alert">{producersError}</div>
                  )}
                  {producerSuccess && (
                    <div className="success-banner" role="status">{producerSuccess}</div>
                  )}

                  {producerFormOpen && (
                    <form className="producer-form" onSubmit={handleProducerSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingProducerId === null ? "Registrar productor" : "Editar productor"}</h2>
                          <p>Completa los datos del productor.</p>
                        </div>
                      </div>

                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="producer-name">Nombre del productor *</label>
                          <input
                            id="producer-name"
                            value={producerForm.name}
                            maxLength={150}
                            required
                            onChange={(event) => setProducerForm({ ...producerForm, name: event.target.value })}
                          />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="producer-contact">Persona de contacto</label>
                          <input
                            id="producer-contact"
                            value={producerForm.contact}
                            onChange={(event) => setProducerForm({ ...producerForm, contact: event.target.value })}
                          />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="producer-phone">Teléfono</label>
                          <input
                            id="producer-phone"
                            type="tel"
                            value={producerForm.phone}
                            onChange={(event) => setProducerForm({ ...producerForm, phone: event.target.value })}
                          />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="producer-email">Correo electrónico</label>
                          <input
                            id="producer-email"
                            type="email"
                            value={producerForm.email}
                            onChange={(event) => setProducerForm({ ...producerForm, email: event.target.value })}
                          />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="producer-type">Producto que produce *</label>
                          <select
                            id="producer-type"
                            value={producerForm.productType}
                            required
                            onChange={(event) => setProducerForm({
                              ...producerForm,
                              productType: event.target.value as ProducerInput["productType"],
                            })}
                          >
                            <option value="COFFEE">Café</option>
                            <option value="COCOA">Cacao</option>
                          </select>
                        </div>
                      </div>

                      <div className="producer-form-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={resetProducerForm}
                          disabled={producerSaving}
                        >
                          Cancelar
                        </button>
                        <button type="submit" className="primary-button" disabled={producerSaving}>
                          {producerSaving
                            ? "Guardando…"
                            : editingProducerId === null
                              ? "Registrar productor"
                              : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadingProducers ? (
                    <p>Cargando productores…</p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>NOMBRE</th>
                            <th>CONTACTO</th>
                            <th>TELÉFONO</th>
                            <th>CORREO ELECTRÓNICO</th>
                            <th>PRODUCTO</th>
                            <th>ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producers.map((producer) => (
                            <tr key={producer.id}>
                              <td>{producer.id}</td>
                              <td>{producer.name}</td>
                              <td>{producer.contact || "—"}</td>
                              <td>{producer.phone || "—"}</td>
                              <td>{producer.email || "—"}</td>
                              <td>{productTypeLabel(producer.productType)}</td>
                              <td>
                                <div className="producer-row-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => startProducerEdit(producer)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="danger-button"
                                    onClick={() => void handleProducerDelete(producer)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {producers.length === 0 && !producersError && (
                            <tr><td colSpan={7}>No hay productores registrados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Clientes" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de clientes</h2>
                      <p>Consulta y administra los clientes registrados en RiTech SAS.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={loadingClients}
                        onClick={() => setRefreshKey((value) => value + 1)}
                      >
                        {loadingClients ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          resetClientForm();
                          setClientFormOpen(true);
                          setClientsError("");
                          setClientSuccess("");
                        }}
                      >
                        + Nuevo cliente
                      </button>
                    </div>
                  </div>

                  {clientsError && <div className="error-banner" role="alert">{clientsError}</div>}
                  {clientSuccess && <div className="success-banner" role="status">{clientSuccess}</div>}

                  {clientFormOpen && (
                    <form className="producer-form" onSubmit={handleClientSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingClientId === null ? "Registrar cliente" : "Editar cliente"}</h2>
                          <p>Completa los datos de contacto del cliente.</p>
                        </div>
                      </div>
                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="client-company">Empresa *</label>
                          <input id="client-company" value={clientForm.companyName} maxLength={180} required
                            onChange={(event) => setClientForm({ ...clientForm, companyName: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="client-contact">Persona de contacto *</label>
                          <input id="client-contact" value={clientForm.contactName} maxLength={150} required
                            onChange={(event) => setClientForm({ ...clientForm, contactName: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="client-country">País *</label>
                          <input id="client-country" value={clientForm.country} maxLength={100} required
                            onChange={(event) => setClientForm({ ...clientForm, country: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="client-email">Correo electrónico</label>
                          <input id="client-email" type="email" value={clientForm.email} maxLength={150}
                            onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="client-phone">Teléfono</label>
                          <input id="client-phone" type="tel" value={clientForm.phone} maxLength={30}
                            onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="client-address">Dirección</label>
                          <input id="client-address" value={clientForm.address} maxLength={255}
                            onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })} />
                        </div>
                      </div>
                      <div className="producer-form-actions">
                        <button type="button" className="secondary-button" onClick={resetClientForm} disabled={clientSaving}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={clientSaving}>
                          {clientSaving ? "Guardando…" : editingClientId === null ? "Registrar cliente" : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadingClients ? <p>Cargando clientes…</p> : (
                    <div className="table-scroll">
                      <table>
                        <thead><tr><th>ID</th><th>EMPRESA</th><th>CONTACTO</th><th>PAÍS</th><th>CORREO</th><th>TELÉFONO</th><th>DIRECCIÓN</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                          {clients.map((client) => (
                            <tr key={client.id}>
                              <td>{client.id}</td><td>{client.companyName}</td><td>{client.contactName}</td><td>{client.country}</td>
                              <td>{client.email || "—"}</td><td>{client.phone || "—"}</td><td>{client.address || "—"}</td>
                              <td><div className="producer-row-actions">
                                <button type="button" className="secondary-button" onClick={() => startClientEdit(client)}>Editar</button>
                                <button type="button" className="danger-button" onClick={() => void handleClientDelete(client)}>Eliminar</button>
                              </div></td>
                            </tr>
                          ))}
                          {clients.length === 0 && !clientsError && <tr><td colSpan={8}>No hay clientes registrados.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Órdenes de exportación" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de órdenes de exportación</h2>
                      <p>Consulta y administra las órdenes de exportación de RiTech SAS.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button type="button" className="secondary-button" disabled={loadingExportOrders}
                        onClick={() => setRefreshKey((value) => value + 1)}>
                        {loadingExportOrders ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button type="button" className="primary-button" onClick={() => {
                        resetExportOrderForm();
                        setExportOrderForm((current) => ({
                          ...current,
                          clientId: clients[0]?.id ?? 0,
                          destinationCountry: clients[0]?.country ?? "",
                        }));
                        setExportOrderFormOpen(true);
                        setExportOrdersError("");
                        setExportOrderSuccess("");
                      }}>+ Nueva orden</button>
                    </div>
                  </div>

                  {exportOrdersError && <div className="error-banner" role="alert">{exportOrdersError}</div>}
                  {exportOrderSuccess && <div className="success-banner" role="status">{exportOrderSuccess}</div>}

                  {exportOrderFormOpen && (
                    <form className="producer-form" onSubmit={handleExportOrderSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingExportOrderId === null ? "Registrar orden" : "Editar orden"}</h2>
                          <p>Completa los datos de la orden de exportación.</p>
                        </div>
                      </div>
                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="export-order-code">Código de la orden *</label>
                          <input id="export-order-code" value={exportOrderForm.orderCode} maxLength={80} required
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, orderCode: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-client">Cliente *</label>
                          <select id="export-order-client" value={exportOrderForm.clientId || ""} required
                            onChange={(event) => {
                              const selected = clients.find((client) => client.id === Number(event.target.value));
                              setExportOrderForm({
                                ...exportOrderForm,
                                clientId: Number(event.target.value),
                                destinationCountry: selected?.country ?? exportOrderForm.destinationCountry,
                              });
                            }}>
                            <option value="" disabled>Selecciona un cliente</option>
                            {clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-country">País de destino *</label>
                          <input id="export-order-country" value={exportOrderForm.destinationCountry} maxLength={100} required
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, destinationCountry: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-address">Dirección de destino</label>
                          <input id="export-order-address" value={exportOrderForm.destinationAddress} maxLength={255}
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, destinationAddress: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-date">Fecha de la orden *</label>
                          <input id="export-order-date" type="date" value={exportOrderForm.orderDate} required
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, orderDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-status">Estado *</label>
                          <select id="export-order-status" value={exportOrderForm.status} required
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, status: event.target.value as ExportOrderStatus })}>
                            <option value="DRAFT">Borrador</option>
                            <option value="CONFIRMED">Confirmada</option>
                            <option value="IN_PREPARATION">En preparación</option>
                            <option value="SHIPPED">Enviada</option>
                            <option value="DELIVERED">Entregada</option>
                            <option value="CANCELLED">Cancelada</option>
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="export-order-notes">Notas</label>
                          <textarea id="export-order-notes" maxLength={10000} rows={3} value={exportOrderForm.notes}
                            onChange={(event) => setExportOrderForm({ ...exportOrderForm, notes: event.target.value })} />
                        </div>
                      </div>
                      <div className="producer-form-actions">
                        <button type="button" className="secondary-button" onClick={resetExportOrderForm} disabled={exportOrderSaving}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={exportOrderSaving || clients.length === 0}>
                          {exportOrderSaving ? "Guardando…" : editingExportOrderId === null ? "Registrar orden" : "Guardar cambios"}
                        </button>
                      </div>
                      {clients.length === 0 && <p>Registra un cliente antes de crear una orden.</p>}
                    </form>
                  )}

                  {loadingExportOrders ? <p>Cargando órdenes de exportación…</p> : (
                    <div className="table-scroll">
                      <table>
                        <thead><tr><th>ID</th><th>CÓDIGO</th><th>CLIENTE</th><th>DESTINO</th><th>FECHA</th><th>ESTADO</th><th>NOTAS</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                          {exportOrders.map((order) => (
                            <tr key={order.id}>
                              <td>{order.id}</td>
                              <td>{order.orderCode}</td>
                              <td>{order.client?.companyName ?? `Cliente #${order.client?.id ?? "—"}`}</td>
                              <td>{order.destinationCountry}{order.destinationAddress ? ` · ${order.destinationAddress}` : ""}</td>
                              <td>{order.orderDate}</td>
                              <td>{({
                                DRAFT: "Borrador",
                                CONFIRMED: "Confirmada",
                                IN_PREPARATION: "En preparación",
                                SHIPPED: "Enviada",
                                DELIVERED: "Entregada",
                                CANCELLED: "Cancelada",
                              } as Record<ExportOrderStatus, string>)[order.status]}</td>
                              <td>{order.notes || "—"}</td>
                              <td><div className="producer-row-actions">
                                <button type="button" className="secondary-button" onClick={() => startExportOrderEdit(order)}>Editar</button>
                                <button type="button" className="danger-button" onClick={() => void handleExportOrderDelete(order)}>Eliminar</button>
                              </div></td>
                            </tr>
                          ))}
                          {exportOrders.length === 0 && !exportOrdersError && <tr><td colSpan={8}>No hay órdenes de exportación registradas.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Compras" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de compras</h2>
                      <p>Administra compras de café y cacao con precios en dólares estadounidenses.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button type="button" className="secondary-button" disabled={loadingPurchases}
                        onClick={() => setRefreshKey((value) => value + 1)}>
                        {loadingPurchases ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button type="button" className="primary-button" onClick={() => {
                        resetPurchaseForm();
                        setPurchaseForm({
                          producerId: producers[0]?.id ?? 0,
                          productId: products[0]?.id ?? 0,
                          inventoryLotId: null,
                          purchaseDate: new Date().toISOString().slice(0, 10),
                          quantityKg: 1,
                          purchasePriceUsdPerKg: 0,
                          notes: "",
                        });
                        setPurchaseFormOpen(true);
                        setPurchasesError("");
                        setPurchaseSuccess("");
                      }}>+ Nueva compra</button>
                    </div>
                  </div>
                  {purchasesError && <div className="error-banner" role="alert">{purchasesError}</div>}
                  {purchaseSuccess && <div className="success-banner" role="status">{purchaseSuccess}</div>}
                  {purchaseFormOpen && (
                    <form className="producer-form" onSubmit={handlePurchaseSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingPurchaseId === null ? "Registrar compra" : "Editar compra"}</h2>
                          <p>Los campos marcados con * son obligatorios.</p>
                        </div>
                      </div>
                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="purchase-producer">Productor *</label>
                          <select id="purchase-producer" value={purchaseForm.producerId || ""} required
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, producerId: Number(event.target.value) })}>
                            <option value="" disabled>Selecciona un productor</option>
                            {producers.map((producer) => <option key={producer.id} value={producer.id}>{producer.name}</option>)}
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-product">Producto *</label>
                          <select id="purchase-product" value={purchaseForm.productId || ""} required
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, productId: Number(event.target.value) })}>
                            <option value="" disabled>Selecciona un producto</option>
                            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({productTypeLabel(product.productType)})</option>)}
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-lot">ID del lote de inventario (opcional)</label>
                          <input id="purchase-lot" type="number" min="1"
                            value={purchaseForm.inventoryLotId ?? ""}
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, inventoryLotId: event.target.value ? Number(event.target.value) : null })}
                            placeholder="Dejar vacío si no aplica" />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-date">Fecha de compra *</label>
                          <input id="purchase-date" type="date" value={purchaseForm.purchaseDate} required
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-quantity">Cantidad (kg) *</label>
                          <input id="purchase-quantity" type="number" min="0.001" step="0.001" value={purchaseForm.quantityKg} required
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, quantityKg: Number(event.target.value) })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-price">Precio de compra (USD/kg) *</label>
                          <input id="purchase-price" type="number" min="0" step="0.0001" value={purchaseForm.purchasePriceUsdPerKg} required
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, purchasePriceUsdPerKg: Number(event.target.value) })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="purchase-notes">Notas</label>
                          <textarea id="purchase-notes" maxLength={10000} rows={3} value={purchaseForm.notes}
                            onChange={(event) => setPurchaseForm({ ...purchaseForm, notes: event.target.value })} />
                        </div>
                      </div>
                      <div className="producer-form-actions">
                        <button type="button" className="secondary-button" onClick={resetPurchaseForm} disabled={purchaseSaving}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={purchaseSaving || producers.length === 0 || products.length === 0}>
                          {purchaseSaving ? "Guardando…" : editingPurchaseId === null ? "Registrar compra" : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  )}
                  {loadingPurchases ? <p>Cargando compras…</p> : (
                    <div className="table-scroll">
                      <table>
                        <thead><tr><th>ID</th><th>FECHA</th><th>PRODUCTOR</th><th>PRODUCTO</th><th>LOTE</th><th>CANTIDAD (KG)</th><th>PRECIO (USD/KG)</th><th>TOTAL (USD)</th><th>NOTAS</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                          {purchases.map((purchase) => (
                            <tr key={purchase.id}>
                              <td>{purchase.id}</td>
                              <td>{purchase.purchaseDate}</td>
                              <td>{purchase.producer?.name ?? `Productor #${purchase.producer?.id ?? "—"}`}</td>
                              <td>{purchase.product?.name ?? `Producto #${purchase.product?.id ?? "—"}`}</td>
                              <td>{purchase.inventoryLot?.id ?? "—"}</td>
                              <td>{formatKg(Number(purchase.quantityKg ?? 0))}</td>
                              <td>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(Number(purchase.purchasePriceUsdPerKg ?? 0))}</td>
                              <td>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(purchase.totalAmountUsd ?? Number(purchase.quantityKg ?? 0) * Number(purchase.purchasePriceUsdPerKg ?? 0)))}</td>
                              <td>{purchase.notes || "—"}</td>
                              <td><div className="producer-row-actions">
                                <button type="button" className="secondary-button" onClick={() => startPurchaseEdit(purchase)}>Editar</button>
                                <button type="button" className="danger-button" onClick={() => void handlePurchaseDelete(purchase)}>Eliminar</button>
                              </div></td>
                            </tr>
                          ))}
                          {purchases.length === 0 && !purchasesError && <tr><td colSpan={10}>No hay compras registradas.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Productos" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Catálogo de productos</h2>
                      <p>Productos consultados desde la API de RiTech SAS.</p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={loadingProducts}
                      onClick={() => setRefreshKey((value) => value + 1)}
                    >
                      {loadingProducts ? "Actualizando…" : "Actualizar"}
                    </button>
                  </div>

                  {productsError && (
                    <div className="error-banner" role="alert">{productsError}</div>
                  )}

                  {loadingProducts ? (
                    <p>Cargando productos…</p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th><th>PRODUCTO</th><th>TIPO</th>
                            <th>DESCRIPCIÓN</th><th>UNIDAD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => (
                            <tr key={product.id}>
                              <td>{product.id}</td>
                              <td>{product.name}</td>
                              <td>{productTypeLabel(product.productType)}</td>
                              <td>{product.description || "—"}</td>
                              <td>{product.unitOfMeasure || "KG"}</td>
                            </tr>
                          ))}
                          {products.length === 0 && !productsError && (
                            <tr><td colSpan={5}>No hay productos registrados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Certificaciones" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de certificaciones</h2>
                      <p>Consulta y administra las certificaciones asociadas a lotes de inventario.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button type="button" className="secondary-button" disabled={loadingCertifications}
                        onClick={() => setRefreshKey((value) => value + 1)}>
                        {loadingCertifications ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button type="button" className="primary-button" onClick={() => {
                        resetCertificationForm();
                        setCertificationFormOpen(true);
                        setCertificationsError("");
                        setCertificationSuccess("");
                      }}>+ Nueva certificación</button>
                    </div>
                  </div>

                  {certificationsError && <div className="error-banner" role="alert">{certificationsError}</div>}
                  {certificationSuccess && <div className="success-banner" role="status">{certificationSuccess}</div>}

                  {certificationFormOpen && (
                    <form className="producer-form" onSubmit={handleCertificationSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingCertificationId === null ? "Registrar certificación" : "Editar certificación"}</h2>
                          <p>Completa los datos de la certificación. El ID debe corresponder a un lote existente.</p>
                        </div>
                      </div>
                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="certification-lot">ID del lote de inventario *</label>
                          <input id="certification-lot" type="number" min="1" step="1" required
                            value={certificationForm.inventoryLotId || ""}
                            onChange={(event) => setCertificationForm({ ...certificationForm, inventoryLotId: Number(event.target.value) })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-type">Tipo de certificación *</label>
                          <input id="certification-type" maxLength={100} required
                            value={certificationForm.certificationType}
                            onChange={(event) => setCertificationForm({ ...certificationForm, certificationType: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-code">Código del certificado *</label>
                          <input id="certification-code" maxLength={100} required
                            value={certificationForm.certificateCode}
                            onChange={(event) => setCertificationForm({ ...certificationForm, certificateCode: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-organization">Entidad emisora</label>
                          <input id="certification-organization" maxLength={150}
                            value={certificationForm.issuingOrganization}
                            onChange={(event) => setCertificationForm({ ...certificationForm, issuingOrganization: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-issue-date">Fecha de expedición</label>
                          <input id="certification-issue-date" type="date" value={certificationForm.issueDate ?? ""}
                            onChange={(event) => setCertificationForm({ ...certificationForm, issueDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-expiration-date">Fecha de vencimiento</label>
                          <input id="certification-expiration-date" type="date" value={certificationForm.expirationDate ?? ""}
                            onChange={(event) => setCertificationForm({ ...certificationForm, expirationDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="certification-status">Estado *</label>
                          <select id="certification-status" required value={certificationForm.status}
                            onChange={(event) => setCertificationForm({ ...certificationForm, status: event.target.value as CertificationStatus })}>
                            <option value="PENDING">Pendiente</option>
                            <option value="VALID">Válida</option>
                            <option value="EXPIRED">Vencida</option>
                          </select>
                        </div>
                      </div>
                      <div className="producer-form-actions">
                        <button type="button" className="secondary-button" onClick={resetCertificationForm} disabled={certificationSaving}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={certificationSaving}>
                          {certificationSaving ? "Guardando…" : editingCertificationId === null ? "Registrar certificación" : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadingCertifications ? <p>Cargando certificaciones…</p> : (
                    <div className="table-scroll">
                      <table>
                        <thead><tr><th>ID</th><th>LOTE</th><th>TIPO</th><th>CÓDIGO</th><th>ENTIDAD EMISORA</th><th>EXPEDICIÓN</th><th>VENCIMIENTO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                          {certifications.map((certification) => (
                            <tr key={certification.id}>
                              <td>{certification.id}</td>
                              <td>{certification.inventoryLot?.id ?? "—"}</td>
                              <td>{certification.certificationType}</td>
                              <td>{certification.certificateCode}</td>
                              <td>{certification.issuingOrganization || "—"}</td>
                              <td>{certification.issueDate || "—"}</td>
                              <td>{certification.expirationDate || "—"}</td>
                              <td>{({
                                VALID: "Válida",
                                EXPIRED: "Vencida",
                                PENDING: "Pendiente",
                              } as Record<CertificationStatus, string>)[certification.status]}</td>
                              <td><div className="producer-row-actions">
                                <button type="button" className="secondary-button" onClick={() => startCertificationEdit(certification)}>Editar</button>
                                <button type="button" className="danger-button" onClick={() => void handleCertificationDelete(certification)}>Eliminar</button>
                              </div></td>
                            </tr>
                          ))}
                          {certifications.length === 0 && !certificationsError && <tr><td colSpan={9}>No hay certificaciones registradas.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Envíos" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Registro de envíos</h2>
                      <p>Consulta y administra los envíos asociados a las órdenes de exportación.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button type="button" className="secondary-button" disabled={loadingShipments}
                        onClick={() => setRefreshKey((value) => value + 1)}>
                        {loadingShipments ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button type="button" className="primary-button" onClick={() => {
                        resetShipmentForm();
                        setShipmentForm((current) => ({
                          ...current,
                          exportOrderId: exportOrders[0]?.id ?? 0,
                        }));
                        setShipmentFormOpen(true);
                        setShipmentsError("");
                        setShipmentSuccess("");
                      }}>+ Nuevo envío</button>
                    </div>
                  </div>

                  {shipmentsError && <div className="error-banner" role="alert">{shipmentsError}</div>}
                  {shipmentSuccess && <div className="success-banner" role="status">{shipmentSuccess}</div>}

                  {shipmentFormOpen && (
                    <form className="producer-form" onSubmit={handleShipmentSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingShipmentId === null ? "Registrar envío" : "Editar envío"}</h2>
                          <p>Completa la información de transporte y seguimiento.</p>
                        </div>
                      </div>
                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="shipment-order">Orden de exportación *</label>
                          <select id="shipment-order" value={shipmentForm.exportOrderId || ""} required
                            onChange={(event) => setShipmentForm({ ...shipmentForm, exportOrderId: Number(event.target.value) })}>
                            <option value="" disabled>Selecciona una orden</option>
                            {exportOrders.map((order) => (
                              <option key={order.id} value={order.id}>{order.orderCode} — {order.client?.companyName ?? `Cliente #${order.client?.id ?? "—"}`}</option>
                            ))}
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-tracking">Número de seguimiento</label>
                          <input id="shipment-tracking" value={shipmentForm.trackingNumber} maxLength={120}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, trackingNumber: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-carrier">Transportadora</label>
                          <input id="shipment-carrier" value={shipmentForm.carrier} maxLength={150}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, carrier: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-date">Fecha de envío</label>
                          <input id="shipment-date" type="date" value={shipmentForm.shipmentDate ?? ""}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, shipmentDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-estimated">Entrega estimada</label>
                          <input id="shipment-estimated" type="date" value={shipmentForm.estimatedDeliveryDate ?? ""}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, estimatedDeliveryDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-actual">Entrega real</label>
                          <input id="shipment-actual" type="date" value={shipmentForm.actualDeliveryDate ?? ""}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, actualDeliveryDate: event.target.value })} />
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-status">Estado *</label>
                          <select id="shipment-status" value={shipmentForm.status} required
                            onChange={(event) => setShipmentForm({ ...shipmentForm, status: event.target.value as ShipmentStatus })}>
                            <option value="PENDING">Pendiente</option>
                            <option value="PREPARING">En preparación</option>
                            <option value="IN_TRANSIT">En tránsito</option>
                            <option value="CUSTOMS">En aduanas</option>
                            <option value="DELIVERED">Entregado</option>
                            <option value="DELAYED">Retrasado</option>
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        </div>
                        <div className="producer-field">
                          <label htmlFor="shipment-notes">Notas</label>
                          <textarea id="shipment-notes" maxLength={10000} rows={3} value={shipmentForm.notes}
                            onChange={(event) => setShipmentForm({ ...shipmentForm, notes: event.target.value })} />
                        </div>
                      </div>
                      <div className="producer-form-actions">
                        <button type="button" className="secondary-button" onClick={resetShipmentForm} disabled={shipmentSaving}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={shipmentSaving || exportOrders.length === 0}>
                          {shipmentSaving ? "Guardando…" : editingShipmentId === null ? "Registrar envío" : "Guardar cambios"}
                        </button>
                      </div>
                      {exportOrders.length === 0 && <p>Registra una orden de exportación antes de crear un envío.</p>}
                    </form>
                  )}

                  {loadingShipments ? <p>Cargando envíos…</p> : (
                    <div className="table-scroll">
                      <table>
                        <thead><tr><th>ID</th><th>ORDEN</th><th>SEGUIMIENTO</th><th>TRANSPORTADORA</th><th>FECHA ENVÍO</th><th>ENTREGA ESTIMADA</th><th>ENTREGA REAL</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
                        <tbody>
                          {shipments.map((shipment) => (
                            <tr key={shipment.id}>
                              <td>{shipment.id}</td>
                              <td>{shipment.exportOrder?.orderCode ?? `Orden #${shipment.exportOrder?.id ?? "—"}`}</td>
                              <td>{shipment.trackingNumber || "—"}</td>
                              <td>{shipment.carrier || "—"}</td>
                              <td>{shipment.shipmentDate || "—"}</td>
                              <td>{shipment.estimatedDeliveryDate || "—"}</td>
                              <td>{shipment.actualDeliveryDate || "—"}</td>
                              <td>{({
                                PENDING: "Pendiente",
                                PREPARING: "En preparación",
                                IN_TRANSIT: "En tránsito",
                                CUSTOMS: "En aduanas",
                                DELIVERED: "Entregado",
                                DELAYED: "Retrasado",
                                CANCELLED: "Cancelado",
                              } as Record<ShipmentStatus, string>)[shipment.status]}</td>
                              <td><div className="producer-row-actions">
                                <button type="button" className="secondary-button" onClick={() => startShipmentEdit(shipment)}>Editar</button>
                                <button type="button" className="danger-button" onClick={() => void handleShipmentDelete(shipment)}>Eliminar</button>
                              </div></td>
                            </tr>
                          ))}
                          {shipments.length === 0 && !shipmentsError && <tr><td colSpan={9}>No hay envíos registrados.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Documentos" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Documentos de exportación</h2>
                      <p>Gestiona los documentos asociados a cada orden de exportación.</p>
                    </div>
                    <div className="producer-toolbar">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={loadingExportDocuments}
                        onClick={() => setRefreshKey((value) => value + 1)}
                      >
                        {loadingExportDocuments ? "Actualizando…" : "Actualizar"}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          resetExportDocumentForm();
                          setExportDocumentForm({
                            exportOrderId: exportOrders[0]?.id ?? 0,
                            documentType: "",
                            documentNumber: "",
                            fileUrl: "",
                            status: "PENDING",
                          });
                          setExportDocumentFormOpen(true);
                          setExportDocumentsError("");
                          setExportDocumentSuccess("");
                        }}
                      >
                        + Nuevo documento
                      </button>
                    </div>
                  </div>

                  {exportDocumentsError && (
                    <div className="error-banner" role="alert">{exportDocumentsError}</div>
                  )}
                  {exportDocumentSuccess && (
                    <div className="success-banner" role="status">{exportDocumentSuccess}</div>
                  )}

                  {exportDocumentFormOpen && (
                    <form className="producer-form" onSubmit={handleExportDocumentSubmit}>
                      <div className="panel-header">
                        <div>
                          <h2>{editingExportDocumentId === null ? "Registrar documento" : "Editar documento"}</h2>
                          <p>Completa los datos del documento de exportación.</p>
                        </div>
                      </div>

                      <div className="producer-form-grid">
                        <div className="producer-field">
                          <label htmlFor="document-order">Orden de exportación *</label>
                          <select
                            id="document-order"
                            value={exportDocumentForm.exportOrderId || ""}
                            required
                            onChange={(event) => setExportDocumentForm({
                              ...exportDocumentForm,
                              exportOrderId: Number(event.target.value),
                            })}
                          >
                            <option value="" disabled>Selecciona una orden</option>
                            {exportOrders.map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.orderCode} — {order.client?.companyName ?? `Cliente #${order.client?.id ?? "—"}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="producer-field">
                          <label htmlFor="document-type">Tipo de documento *</label>
                          <input
                            id="document-type"
                            value={exportDocumentForm.documentType}
                            maxLength={100}
                            required
                            onChange={(event) => setExportDocumentForm({
                              ...exportDocumentForm,
                              documentType: event.target.value,
                            })}
                          />
                        </div>

                        <div className="producer-field">
                          <label htmlFor="document-number">Número de documento</label>
                          <input
                            id="document-number"
                            value={exportDocumentForm.documentNumber}
                            maxLength={100}
                            onChange={(event) => setExportDocumentForm({
                              ...exportDocumentForm,
                              documentNumber: event.target.value,
                            })}
                          />
                        </div>

                        <div className="producer-field">
                          <label htmlFor="document-url">URL del archivo</label>
                          <input
                            id="document-url"
                            type="url"
                            value={exportDocumentForm.fileUrl}
                            maxLength={500}
                            placeholder="https://..."
                            onChange={(event) => setExportDocumentForm({
                              ...exportDocumentForm,
                              fileUrl: event.target.value,
                            })}
                          />
                        </div>

                        <div className="producer-field">
                          <label htmlFor="document-status">Estado *</label>
                          <select
                            id="document-status"
                            value={exportDocumentForm.status}
                            required
                            onChange={(event) => setExportDocumentForm({
                              ...exportDocumentForm,
                              status: event.target.value as DocumentStatus,
                            })}
                          >
                            <option value="PENDING">Pendiente</option>
                            <option value="GENERATED">Generado</option>
                            <option value="APPROVED">Aprobado</option>
                          </select>
                        </div>
                      </div>

                      <div className="producer-form-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={resetExportDocumentForm}
                          disabled={exportDocumentSaving}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={exportDocumentSaving || exportOrders.length === 0}
                        >
                          {exportDocumentSaving
                            ? "Guardando…"
                            : editingExportDocumentId === null
                              ? "Registrar documento"
                              : "Guardar cambios"}
                        </button>
                      </div>
                      {exportOrders.length === 0 && (
                        <p>Registra una orden de exportación antes de crear un documento.</p>
                      )}
                    </form>
                  )}

                  {loadingExportDocuments ? (
                    <p>Cargando documentos…</p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th><th>ORDEN</th><th>TIPO</th><th>NÚMERO</th>
                            <th>ARCHIVO</th><th>ESTADO</th><th>GENERADO</th><th>ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportDocuments.map((document) => (
                            <tr key={document.id}>
                              <td>{document.id}</td>
                              <td>{document.exportOrder?.orderCode ?? `Orden #${document.exportOrder?.id ?? "—"}`}</td>
                              <td>{document.documentType}</td>
                              <td>{document.documentNumber || "—"}</td>
                              <td>
                                {document.fileUrl ? (
                                  <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                                    Abrir archivo
                                  </a>
                                ) : "—"}
                              </td>
                              <td>{({
                                PENDING: "Pendiente",
                                GENERATED: "Generado",
                                APPROVED: "Aprobado",
                              } as Record<DocumentStatus, string>)[document.status]}</td>
                              <td>{document.generatedAt
                                ? new Date(document.generatedAt).toLocaleString("es-CO")
                                : "—"}</td>
                              <td>
                                <div className="producer-row-actions">
                                  <button type="button" className="secondary-button" onClick={() => startExportDocumentEdit(document)}>
                                    Editar
                                  </button>
                                  <button type="button" className="danger-button" onClick={() => void handleExportDocumentDelete(document)}>
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {exportDocuments.length === 0 && !exportDocumentsError && (
                            <tr><td colSpan={8}>No hay documentos registrados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : section === "Trazabilidad" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Trazabilidad de exportaciones</h2>
                      <p>Consulta productos, lotes, certificaciones, documentos y envíos asociados a una orden.</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingTraceability}>
                      {loadingTraceability ? "Consultando…" : "Actualizar"}
                    </button>
                  </div>

                  {traceabilityError && <div className="error-banner" role="alert">{traceabilityError}</div>}
                  <div className="producer-form-grid">
                    <div className="producer-field">
                      <label htmlFor="traceability-order">Orden de exportación</label>
                      <select id="traceability-order" value={traceabilityOrderId} onChange={(event) => setTraceabilityOrderId(event.target.value ? Number(event.target.value) : "")}>
                        <option value="">Selecciona una orden</option>
                        {exportOrders.map((order) => <option key={order.id} value={order.id}>{order.orderCode} — {order.client?.companyName ?? "Cliente"}</option>)}
                      </select>
                    </div>
                  </div>

                  {loadingTraceability ? <p>Cargando trazabilidad…</p> : traceabilityReport ? (
                    <>
                      <section className="metrics-grid">
                        <article className="metric-card"><div className="metric-top"><span>Orden</span><div className="metric-icon green"><ClipboardList size={19} /></div></div><div className="metric-value">{traceabilityReport.order.orderCode}</div><div className="metric-bottom">{traceabilityReport.order.status}</div></article>
                        <article className="metric-card"><div className="metric-top"><span>Productos / ítems</span><div className="metric-icon blue"><Package size={19} /></div></div><div className="metric-value">{traceabilityReport.itemCount}</div><div className="metric-bottom">Ítems asociados a la orden</div></article>
                        <article className="metric-card"><div className="metric-top"><span>Documentos</span><div className="metric-icon amber"><FileText size={19} /></div></div><div className="metric-value">{traceabilityReport.exportDocumentIds.length}</div><div className="metric-bottom">Documentos vinculados</div></article>
                        <article className="metric-card"><div className="metric-top"><span>Envíos</span><div className="metric-icon purple"><Ship size={19} /></div></div><div className="metric-value">{traceabilityReport.shipmentIds.length}</div><div className="metric-bottom">Envíos vinculados</div></article>
                      </section>
                      <div className="content-grid">
                        <article className="panel">
                          <div className="panel-header"><div><h2>Datos de la orden</h2><p>Información del cliente y destino.</p></div></div>
                          <p><strong>Cliente:</strong> {traceabilityReport.order.client?.companyName ?? "Sin cliente"}</p>
                          <p><strong>País de destino:</strong> {traceabilityReport.order.destinationCountry || "—"}</p>
                          <p><strong>Dirección:</strong> {traceabilityReport.order.destinationAddress || "—"}</p>
                          <p><strong>Fecha:</strong> {traceabilityReport.order.orderDate || "—"}</p>
                        </article>
                        <article className="panel">
                          <div className="panel-header"><div><h2>Registros asociados</h2><p>Identificadores devueltos por el backend.</p></div></div>
                          <p><strong>Documentos:</strong> {traceabilityReport.exportDocumentIds.length ? traceabilityReport.exportDocumentIds.join(", ") : "Ninguno"}</p>
                          <p><strong>Envíos:</strong> {traceabilityReport.shipmentIds.length ? traceabilityReport.shipmentIds.join(", ") : "Ninguno"}</p>
                        </article>
                      </div>
                      <div className="panel">
                        <div className="panel-header"><div><h2>Productos y lotes</h2><p>Detalle de cantidades, precios y certificaciones.</p></div></div>
                        <div className="table-scroll">
                          <table>
                            <thead><tr><th>PRODUCTO</th><th>LOTE</th><th>CANTIDAD (KG)</th><th>PRECIO USD/KG</th><th>TOTAL USD</th><th>ESTADO LOTE</th><th>CERTIFICACIONES</th></tr></thead>
                            <tbody>
                              {traceabilityReport.items.map((item) => (
                                <tr key={item.itemId}>
                                  <td>{item.product?.name ?? "Producto sin nombre"}<br /><small>{item.product?.productType ?? "—"}</small></td>
                                  <td>{item.inventoryLot?.lotCode ?? "Sin lote"}</td>
                                  <td>{formatKg(Number(item.quantityKg ?? 0))}</td>
                                  <td>{Number(item.salePriceUsdPerKg ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</td>
                                  <td>{Number(item.totalAmountUsd ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</td>
                                  <td>{item.inventoryLot?.status ?? "—"}</td>
                                  <td>{item.certifications?.length ? item.certifications.map((cert) => `${cert.certificationType} (${cert.status})`).join(", ") : "Ninguna"}</td>
                                </tr>
                              ))}
                              {traceabilityReport.items.length === 0 && <tr><td colSpan={7}>Esta orden no tiene ítems registrados.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : !traceabilityError && <p>Selecciona una orden para consultar su trazabilidad.</p>}
                </div>
              ) : section === "Reportes" && canViewReports ? (
                <div className="panel">
                  <div className="panel-header">
                    <div><h2>Reportes operativos</h2><p>Información real consultada desde los reportes del backend.</p></div>
                    <button type="button" className="secondary-button" disabled={loadingReports} onClick={() => setRefreshKey((value) => value + 1)}>{loadingReports ? "Actualizando…" : "Actualizar"}</button>
                  </div>
                  {reportsError && <div className="error-banner" role="alert">{reportsError}</div>}
                  {loadingReports ? <p>Cargando reportes…</p> : (
                    <>
                      <section className="metrics-grid">
                        <article className="metric-card"><div className="metric-top"><span>Stock disponible</span><div className="metric-icon green"><Warehouse size={19} /></div></div><div className="metric-value">{formatKg(stockReport.reduce((sum, row) => sum + Number(row.availableStockKg || 0), 0))}<span> kg</span></div><div className="metric-bottom">Suma del inventario disponible</div></article>
                        <article className="metric-card"><div className="metric-top"><span>Tipos de producto</span><div className="metric-icon blue"><Package size={19} /></div></div><div className="metric-value">{stockReport.length}</div><div className="metric-bottom">Tipos incluidos en el reporte</div></article>
                        <article className="metric-card"><div className="metric-top"><span>Volumen exportado</span><div className="metric-icon purple"><ChartNoAxesCombined size={19} /></div></div><div className="metric-value">{formatKg(monthlyVolume.reduce((sum, row) => sum + Number(row.exportedVolumeKg || 0), 0))}<span> kg</span></div><div className="metric-bottom">Total de los meses reportados</div></article>
                      </section>
                      <div className="content-grid">
                        <article className="panel chart-panel">
                          <div className="panel-header"><div><h2>Volumen exportado por mes</h2><p>Órdenes enviadas o entregadas, según el backend.</p></div></div>
                          <div className="chart-container">
                            {monthlyVolume.length ? <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={monthlyVolume} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                                <defs><linearGradient id="realVolumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#247a55" stopOpacity={0.17} /><stop offset="100%" stopColor="#247a55" stopOpacity={0.01} /></linearGradient></defs>
                                <CartesianGrid stroke="#edf0eb" strokeDasharray="4 5" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value) => [`${formatKg(Number(value))} kg`, "Volumen exportado"]} />
                                <Area type="monotone" dataKey="exportedVolumeKg" stroke="#247a55" strokeWidth={2.5} fill="url(#realVolumeFill)" />
                              </AreaChart>
                            </ResponsiveContainer> : <p>No hay volúmenes exportados para mostrar.</p>}
                          </div>
                        </article>
                        <article className="panel">
                          <div className="panel-header"><div><h2>Stock por producto</h2><p>Inventario disponible en kilogramos.</p></div></div>
                          <div className="table-scroll"><table><thead><tr><th>TIPO DE PRODUCTO</th><th>STOCK DISPONIBLE</th></tr></thead><tbody>
                            {stockReport.map((row) => <tr key={row.productType}><td>{productTypeLabel(row.productType)}</td><td>{formatKg(Number(row.availableStockKg))} kg</td></tr>)}
                            {!stockReport.length && <tr><td colSpan={2}>No hay datos de inventario.</td></tr>}
                          </tbody></table></div>
                        </article>
                      </div>
                      <div className="panel">
                        <div className="panel-header"><div><h2>Detalle mensual de exportaciones</h2><p>Volumen por mes reportado por el backend.</p></div></div>
                        <div className="table-scroll"><table><thead><tr><th>MES</th><th>VOLUMEN EXPORTADO (KG)</th></tr></thead><tbody>
                          {monthlyVolume.map((row) => <tr key={row.month}><td>{row.month}</td><td>{formatKg(Number(row.exportedVolumeKg))} kg</td></tr>)}
                          {!monthlyVolume.length && <tr><td colSpan={2}>No hay datos mensuales disponibles.</td></tr>}
                        </tbody></table></div>
                      </div>
                    </>
                  )}
                </div>
              ) : section === "Inventario" ? (
                <InventoryModule />
              ) : (
                <div className="panel empty-module">
                  <div className="empty-module-icon"><Boxes size={25} /></div>
                  <h2>Módulo preparado para conectar</h2>
                  <p>
                    La navegación y los permisos ya están configurados.
                    Esta pantalla todavía necesita conectarse a las operaciones
                    específicas del módulo para consultar o modificar registros.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => selectSection("Panel principal")}
                  >
                    <LayoutDashboard size={17} /> Volver al panel principal
                  </button>
                </div>
              )}
            </section>
          )}

          <footer className="dashboard-footer">
            <span>© 2026 RiTech SAS. Gestión de comercio y trazabilidad.</span>
            <span><span className="footer-online" /> Aplicación local</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;

const statusLabels: Record<InventoryLotStatus, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  EXPORTED: "Exportado",
};

const emptyForm = (): InventoryLotInput => ({
  productId: 0,
  producerId: 0,
  lotCode: "",
  quantity: 0,
  harvestDate: null,
  status: "AVAILABLE",
});

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(value) || 0);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

function InventoryModule() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | InventoryLotStatus>("ALL");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<InventoryLotInput>(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [lotData, productData, producerData] = await Promise.all([
        getInventoryLots(), getProducts(), getProducers(),
      ]);
      setLots(lotData);
      setProducts(productData);
      setProducers(producerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const filteredLots = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return lots.filter((lot) => {
      const statusMatches = filterStatus === "ALL" || lot.status === filterStatus;
      const text = `${lot.lotCode} ${lot.product?.name ?? ""} ${lot.producer?.name ?? ""}`.toLocaleLowerCase("es");
      return statusMatches && (!query || text.includes(query));
    });
  }, [lots, filterStatus, search]);

  const totalQuantity = lots
    .filter((lot) => lot.status === "AVAILABLE")
    .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), productId: products[0]?.id ?? 0, producerId: producers[0]?.id ?? 0 });
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const openEditForm = (lot: InventoryLot) => {
    setEditingId(lot.id);
    setForm({
      productId: lot.product?.id ?? 0,
      producerId: lot.producer?.id ?? 0,
      lotCode: lot.lotCode ?? "",
      quantity: Number(lot.quantity ?? 0),
      harvestDate: lot.harvestDate ? lot.harvestDate.slice(0, 10) : null,
      status: lot.status,
    });
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload: InventoryLotInput = {
      productId: Number(form.productId),
      producerId: Number(form.producerId),
      lotCode: form.lotCode.trim(),
      quantity: Number(form.quantity),
      harvestDate: form.harvestDate || null,
      status: form.status,
    };
    try {
      if (!payload.productId || !payload.producerId) throw new Error("Selecciona un producto y un productor.");
      if (!payload.lotCode) throw new Error("El código del lote es obligatorio.");
      if (payload.lotCode.length > 80) throw new Error("El código no puede superar 80 caracteres.");
      if (!Number.isFinite(payload.quantity) || payload.quantity < 0) throw new Error("La cantidad no puede ser negativa.");
      if (editingId === null) {
        await createInventoryLot(payload);
        setSuccess("Lote registrado correctamente.");
      } else {
        await updateInventoryLot(editingId, payload);
        setSuccess("Lote actualizado correctamente.");
      }
      setFormOpen(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el lote.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lot: InventoryLot) => {
    if (!window.confirm(`¿Eliminar el lote "${lot.lotCode}"? Esta acción no se puede deshacer.`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteInventoryLot(lot.id);
      setLots((current) => current.filter((item) => item.id !== lot.id));
      setSuccess("Lote eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el lote. Puede estar relacionado con otros registros.");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Gestión de inventario</h2>
          <p>Consulta, registra y administra los lotes de productos de RiTech SAS.</p>
        </div>
        <div className="producer-toolbar">
          <button type="button" className="secondary-button" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={15} /> {loading ? "Actualizando…" : "Actualizar"}
          </button>
          <button type="button" className="primary-button" onClick={openCreateForm} disabled={!products.length || !producers.length}>
            <Plus size={16} /> Registrar lote
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {success && <div className="success-banner" role="status">{success}</div>}

      <div className="summary-grid" style={{ marginBottom: 20 }}>
        <div className="summary-card"><span>Lotes registrados</span><strong>{lots.length}</strong></div>
        <div className="summary-card"><span>Lotes disponibles</span><strong>{lots.filter((lot) => lot.status === "AVAILABLE").length}</strong></div>
        <div className="summary-card"><span>Cantidad disponible</span><strong>{formatQuantity(totalQuantity)} kg</strong></div>
      </div>

      {formOpen && (
        <form className="panel" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <div><h2>{editingId === null ? "Registrar lote" : `Editar lote #${editingId}`}</h2><p>Completa los datos requeridos del lote.</p></div>
            <button type="button" className="secondary-button" onClick={() => setFormOpen(false)} aria-label="Cerrar formulario"><X size={16} /></button>
          </div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <label>Producto
              <select required value={form.productId || ""} onChange={(e) => setForm((current) => ({ ...current, productId: Number(e.target.value) }))}>
                <option value="" disabled>Selecciona un producto</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.productType === "COFFEE" ? "Café" : product.productType === "COCOA" ? "Cacao" : product.productType})</option>)}
              </select>
            </label>
            <label>Productor
              <select required value={form.producerId || ""} onChange={(e) => setForm((current) => ({ ...current, producerId: Number(e.target.value) }))}>
                <option value="" disabled>Selecciona un productor</option>
                {producers.map((producer) => <option key={producer.id} value={producer.id}>{producer.name}</option>)}
              </select>
            </label>
            <label>Código del lote
              <input required maxLength={80} value={form.lotCode} onChange={(e) => setForm((current) => ({ ...current, lotCode: e.target.value }))} placeholder="Ej. LOT-2026-001" />
            </label>
            <label>Cantidad (kg)
              <input required type="number" min="0" step="0.001" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} />
            </label>
            <label>Fecha de cosecha
              <input type="date" value={form.harvestDate ?? ""} onChange={(e) => setForm((current) => ({ ...current, harvestDate: e.target.value || null }))} />
            </label>
            <label>Estado
              <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as InventoryLotStatus }))}>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="producer-row-actions" style={{ marginTop: 18 }}>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Guardando…" : editingId === null ? "Guardar lote" : "Guardar cambios"}</button>
            <button type="button" className="secondary-button" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</button>
          </div>
        </form>
      )}

      {(!products.length || !producers.length) && !loading && (
        <p className="muted-text">Para registrar lotes necesitas tener al menos un producto y un productor registrados.</p>
      )}

      <div className="producer-toolbar" style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <input aria-label="Buscar lotes" placeholder="Buscar por código, producto o productor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filtrar por estado" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "ALL" | InventoryLotStatus)}>
          <option value="ALL">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading ? <p>Cargando lotes de inventario…</p> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>CÓDIGO</th><th>PRODUCTO</th><th>PRODUCTOR</th><th>CANTIDAD (KG)</th><th>COSECHA</th><th>RECEPCIÓN</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
            <tbody>
              {filteredLots.map((lot) => (
                <tr key={lot.id}>
                  <td>{lot.lotCode}</td>
                  <td>{lot.product?.name ?? `Producto #${lot.product?.id ?? "?"}`}</td>
                  <td>{lot.producer?.name ?? `Productor #${lot.producer?.id ?? "?"}`}</td>
                  <td>{formatQuantity(Number(lot.quantity))}</td>
                  <td>{formatDate(lot.harvestDate)}</td>
                  <td>{formatDate(lot.receivedAt)}</td>
                  <td><span className="status-badge">{statusLabels[lot.status] ?? lot.status}</span></td>
                  <td><div className="producer-row-actions">
                    <button type="button" className="secondary-button" onClick={() => openEditForm(lot)} aria-label={`Editar lote ${lot.lotCode}`}><Pencil size={14} /> Editar</button>
                    <button type="button" className="danger-button" onClick={() => void handleDelete(lot)} aria-label={`Eliminar lote ${lot.lotCode}`}><Trash2 size={14} /> Eliminar</button>
                  </div></td>
                </tr>
              ))}
              {filteredLots.length === 0 && !error && <tr><td colSpan={8}>{lots.length ? "No hay lotes que coincidan con la búsqueda." : "No hay lotes registrados."}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
