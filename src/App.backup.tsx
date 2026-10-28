
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  Coffee,
  FileText,
  Globe2,
  LayoutDashboard,
  Leaf,
  Package,
  Search,
  Settings2,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Sprout,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

type Section =
  | "Panel principal"
  | "Productos"
  | "Productores"
  | "Inventario"
  | "Clientes"
  | "Compras"
  | "Órdenes de exportación"
  | "Envíos"
  | "Certificaciones"
  | "Documentos"
  | "Trazabilidad"
  | "Reportes";

type StockRow = {
  productType: string;
  availableStockKg: number;
};

const groups = [
  {
    title: "ESPACIO DE TRABAJO",
    items: [
      { label: "Panel principal" as Section, icon: LayoutDashboard },
      { label: "Productos" as Section, icon: Package },
      { label: "Productores" as Section, icon: Sprout },
      { label: "Inventario" as Section, icon: Warehouse },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      { label: "Clientes" as Section, icon: Users },
      { label: "Compras" as Section, icon: ShoppingCart },
      { label: "Órdenes de exportación" as Section, icon: ClipboardList },
      { label: "Envíos" as Section, icon: Ship },
    ],
  },
  {
    title: "CUMPLIMIENTO",
    items: [
      { label: "Certificaciones" as Section, icon: ShieldCheck },
      { label: "Documentos" as Section, icon: FileText },
      { label: "Trazabilidad" as Section, icon: Globe2 },
      { label: "Reportes" as Section, icon: ChartNoAxesCombined },
    ],
  },
];

// Datos demostrativos. No representan cifras reales de MySQL.
const exportDemo = [
  { month: "May", volume: 6200 },
  { month: "Jun", volume: 7800 },
  { month: "Jul", volume: 6900 },
  { month: "Ago", volume: 9400 },
  { month: "Sep", volume: 8100 },
  { month: "Oct", volume: 10800 },
];

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
    const result = data as {
      value?: unknown;
      content?: unknown;
    };

    if (Array.isArray(result.value)) {
      rows = result.value;
    } else if (Array.isArray(result.content)) {
      rows = result.content;
    }
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

function App() {
  const [section, setSection] =
    useState<Section>("Panel principal");

  const [search, setSearch] = useState("");
  const [stock, setStock] = useState<StockRow[]>([]);
  const [stockError, setStockError] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStock = useCallback(async () => {
    setLoadingStock(true);
    setStockError("");

    try {
      const response = await fetch(
        "/api/reports/stock-by-product-type",
      );

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      setStock(parseStockResponse(data));
    } catch {
      setStockError(
        "No se pudo consultar el inventario. Verifica que el backend esté funcionando y que el proxy de Vite esté configurado.",
      );
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    if (
      section === "Panel principal" ||
      section === "Inventario"
    ) {
      void loadStock();
    }
  }, [section, refreshKey, loadStock]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLocaleLowerCase("es").includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  const totalStock = stock.reduce(
    (sum, item) => sum + item.availableStockKg,
    0,
  );

  const coffeeStock = stock.find(
    (item) => item.productType === "COFFEE",
  )?.availableStockKg ?? 0;

  const cocoaStock = stock.find(
    (item) => item.productType === "COCOA",
  )?.availableStockKg ?? 0;

  const selectSection = (nextSection: Section) => {
    setSection(nextSection);
    setSearch("");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={23} />
          </div>

          <div className="brand-copy">
            <strong>
              ritech<span>sas</span>
            </strong>
            <small>COMERCIO Y TRAZABILIDAD</small>
          </div>
        </div>

        <div className="workspace-switch">
          <div className="workspace-avatar">R</div>

          <div className="workspace-copy">
            <strong>RiTech SAS</strong>
            <span>Espacio empresarial</span>
          </div>

          <ChevronDown size={15} />
        </div>

        <div className="sidebar-nav">
          {filteredGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>

              {group.items.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`nav-item ${
                    section === label ? "active" : ""
                  }`}
                  aria-current={
                    section === label ? "page" : undefined
                  }
                  onClick={() => selectSection(label)}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <p className="empty-search">
              No se encontraron módulos.
            </p>
          )}
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className={`nav-item ${
              section === "Reportes" ? "active" : ""
            }`}
            onClick={() => selectSection("Reportes")}
          >
            <Settings2 size={18} />
            <span>Configuración y reportes</span>
          </button>

          <div className="profile">
            <div className="profile-avatar">RT</div>

            <div className="profile-copy">
              <strong>Administrador</strong>
              <span>RiTech SAS</span>
            </div>
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar módulos..."
                aria-label="Buscar módulos"
              />
            </label>

            <button
              type="button"
              className="icon-button"
              title="Consultar envíos"
              aria-label="Consultar envíos"
              onClick={() => selectSection("Envíos")}
            >
              <Bell size={19} />
            </button>

            <div className="topbar-divider" />
            <div className="topbar-avatar">RT</div>
          </div>
        </header>

        <div className="dashboard-content">
          {section === "Panel principal" ? (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <span />
                    RESUMEN DE OPERACIONES
                  </div>

                  <h1>
                    Bienvenido al <span>panel principal.</span>
                  </h1>

                  <p>
                    Consulta el estado del inventario y de tus
                    operaciones de exportación.
                  </p>
                </div>
              </section>

              <section className="date-banner">
                <div className="date-banner-icon">
                  <Activity size={19} />
                </div>

                <div>
                  <strong>
                    Todo tu comercio, en un solo lugar
                  </strong>
                  <p>
                    Administra productos, inventario, clientes y
                    exportaciones.
                  </p>
                </div>

                <div className="banner-status">
                  <span />
                  Conexión local
                </div>
              </section>

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
                    <div className="metric-icon green">
                      <Warehouse size={19} />
                    </div>
                  </div>

                  <div className="metric-value">
                    {loadingStock ? "…" : formatKg(totalStock)}
                    <span> kg</span>
                  </div>

                  <div className="metric-bottom">
                    Cantidad informada por la API
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-top">
                    <span>Tipos de producto</span>
                    <div className="metric-icon blue">
                      <Package size={19} />
                    </div>
                  </div>

                  <div className="metric-value">
                    {loadingStock ? "…" : stock.length}
                  </div>

                  <div className="metric-bottom">
                    Tipos incluidos en el reporte
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-top">
                    <span>Café disponible</span>
                    <div className="metric-icon amber">
                      <Coffee size={19} />
                    </div>
                  </div>

                  <div className="metric-value">
                    {loadingStock ? "…" : formatKg(coffeeStock)}
                    <span> kg</span>
                  </div>

                  <div className="metric-bottom">
                    Según el reporte de inventario
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-top">
                    <span>Cacao disponible</span>
                    <div className="metric-icon purple">
                      <Sprout size={19} />
                    </div>
                  </div>

                  <div className="metric-value">
                    {loadingStock ? "…" : formatKg(cocoaStock)}
                    <span> kg</span>
                  </div>

                  <div className="metric-bottom">
                    Según el reporte de inventario
                  </div>
                </article>
              </section>

              <section className="content-grid">
                <article className="panel chart-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Volumen de exportaciones</h2>
                      <p>
                        Datos de demostración de los últimos seis
                        meses.
                      </p>
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
                        margin={{
                          top: 10,
                          right: 8,
                          left: -18,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="volumeFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#247a55"
                              stopOpacity={0.17}
                            />
                            <stop
                              offset="100%"
                              stopColor="#247a55"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="#edf0eb"
                          strokeDasharray="4 5"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          axisLine={false}
                          tickLine={false}
                        />

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
                    Este gráfico aún no utiliza cifras reales de la
                    base de datos.
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
                      title="Actualizar inventario"
                      disabled={loadingStock}
                      onClick={() =>
                        setRefreshKey((value) => value + 1)
                      }
                    >
                      ↻
                    </button>
                  </div>

                  {loadingStock && <p>Cargando inventario…</p>}

                  {!loadingStock &&
                    !stockError &&
                    stock.map((item) => (
                      <div
                        className="stock-item"
                        key={item.productType}
                      >
                        <div className="stock-item-top">
                          <div className="stock-product">
                            <div className="product-icon coffee">
                              <Boxes size={17} />
                            </div>

                            <div>
                              <strong>
                                {item.productType === "COFFEE"
                                  ? "Café"
                                  : item.productType === "COCOA"
                                    ? "Cacao"
                                    : item.productType}
                              </strong>
                              <span>{item.productType}</span>
                            </div>
                          </div>

                          <strong>
                            {formatKg(item.availableStockKg)} kg
                          </strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill coffee-fill"
                            style={{
                              width: `${
                                totalStock > 0
                                  ? (item.availableStockKg / totalStock) * 100
                                  : 0
                              }%`,
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
            <section className="module-page">
              <div className="eyebrow">
                <span />
                GESTIÓN EMPRESARIAL
              </div>

              <h1>{section}</h1>

              <p className="module-description">
                Consulta y administra la información del módulo de{" "}
                {section.toLocaleLowerCase("es")}.
              </p>

              {section === "Inventario" ? (
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Stock disponible por tipo de producto</h2>
                      <p>
                        Datos consultados desde la API de RiTech SAS.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      disabled={loadingStock}
                      onClick={() =>
                        setRefreshKey((value) => value + 1)
                      }
                    >
                      {loadingStock ? "Actualizando…" : "Actualizar"}
                    </button>
                  </div>

                  {stockError && (
                    <div className="error-banner" role="alert">
                      {stockError}
                    </div>
                  )}

                  {loadingStock ? (
                    <p>Cargando inventario…</p>
                  ) : (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>TIPO DE PRODUCTO</th>
                            <th>STOCK DISPONIBLE (KG)</th>
                          </tr>
                        </thead>

                        <tbody>
                          {stock.map((item) => (
                            <tr key={item.productType}>
                              <td>
                                {item.productType === "COFFEE"
                                  ? "Café"
                                  : item.productType === "COCOA"
                                    ? "Cacao"
                                    : item.productType}
                              </td>
                              <td>
                                {formatKg(item.availableStockKg)} kg
                              </td>
                            </tr>
                          ))}

                          {stock.length === 0 && !stockError && (
                            <tr>
                              <td colSpan={2}>
                                No hay datos de inventario para mostrar.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel empty-module">
                  <div className="empty-module-icon">
                    <Boxes size={25} />
                  </div>

                  <h2>Módulo preparado para conectar</h2>

                  <p>
                    La navegación ya funciona. Esta pantalla todavía
                    necesita conectarse a las operaciones específicas
                    del backend para consultar, crear, editar o eliminar
                    registros.
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => selectSection("Panel principal")}
                  >
                    <LayoutDashboard size={17} />
                    Volver al panel principal
                  </button>
                </div>
              )}
            </section>
          )}

          <footer className="dashboard-footer">
            <span>
              © 2026 RiTech SAS. Gestión de comercio y trazabilidad.
            </span>
            <span>
              <span className="footer-online" />
              Aplicación local
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
