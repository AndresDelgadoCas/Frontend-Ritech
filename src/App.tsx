import { useCallback, useEffect, useMemo, useState } from "react";

import type { FormEvent, ReactNode } from "react";

import {

  Activity, ArrowRight, BadgeCheck, Check, ClipboardList,

  Coffee, Factory, FileClock, Heart, Leaf, LogOut, Menu, Package, Plus, Search,

  ShieldCheck, ShoppingBag, ShoppingCart, Sprout, Users, Warehouse, X,
  ArrowLeft, Clock3, Inbox, MessageCircle, Send, UserRound,

} from "lucide-react";

import { getCurrentUser, login, logout, registerBuyer } from "./services/auth";

import type { AuthUser, UserRole } from "./services/auth";

import {

  addCartItem, assignProfile, checkout, createBuyerProfile, createListing, createLot, createUser,

  getAuditLogs, getAvailableProfiles, getCart, getCatalog, getMyListings, getSellerApplications, reviewSellerApplication, submitSellerApplication, getMySellerApplications,

  getMyLots, getMyOrders, getProducts, getUsers, removeCartItem, resetUserPassword,

  setUserActive, updateCartItem, updateListing, updateOrderStatus, createSupportTicket, getMySupportTickets, getSupportTickets, updateSupportTicket, getSupportMessages, sendSupportMessage,
  getSupportAdmins, escalateSupportTicket, reviewEscalatedSupportTicket, getFavorites, addFavorite, removeFavorite,

} from "./services/marketplace";

import type {

  AuditRecord, CartView, ListingView, LotOption, OrderView, ProductOption,

  ProfileOption, UserRecord, SellerApplication, SupportTicket, SupportMessage, SupportStaff,

} from "./services/marketplace";

import "./App.css";



type Section = "catalog" | "favorites" | "cart" | "orders" | "listings" | "inventory" | "users" | "audit" | "seller-application" | "applications" | "support";

const roleName: Record<UserRole, string> = { ADMINISTRADOR: "Administrador", VENDEDOR: "Vendedor", COMPRADOR: "Comprador", SOPORTE: "Soporte" };

const currency = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);

const quantity = (value: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(value || 0);

const productLabel = (value: string) => value === "COFFEE" ? "Café" : value === "COCOA" ? "Cacao" : value;

const supportCategoryLabel: Record<string, string> = {
  ACCOUNT_ACCESS: "Acceso a cuenta", ACCOUNT_RECOVERY: "Recuperación de cuenta", ORDERS: "Pedidos",
  LISTINGS: "Publicaciones", INVENTORY: "Inventario", COMPLAINT: "Queja", CLAIM: "Reclamación", OTHER: "Otra consulta",
};
const supportPriorityLabel: Record<string, string> = { LOW: "Baja", NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente" };
const formatSupportDate = (value?: string | null) => {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const statusLabel: Record<string, string> = {

  PUBLISHED: "Publicado", DRAFT: "Borrador", PAUSED: "Pausado", SOLD_OUT: "Agotado",

  CONFIRMED: "Confirmado", IN_PREPARATION: "En preparación", SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado",
  NEW: "Nuevo", IN_REVIEW: "En revisión", WAITING_USER: "Esperando usuario", ESCALATED: "Escalado", RESOLVED: "Resuelto", CLOSED: "Cerrado",

  AVAILABLE: "Disponible", EXPORTED: "Agotado", RESERVED: "Reservado",

};



function LoginScreen({ onSubmit, busy, error }: { onSubmit: (username: string, password: string) => void; busy: boolean; error: string }) {

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [registerMode, setRegisterMode] = useState(false);

  const [registration, setRegistration] = useState({fullName:"",username:"",email:"",password:"",companyName:"",country:"",phone:"",address:""});

  const [registerError, setRegisterError] = useState("");

  const [registerNotice, setRegisterNotice] = useState("");

  const [registerBusy, setRegisterBusy] = useState(false);

  const submitRegistration = async (event: FormEvent) => { event.preventDefault(); setRegisterBusy(true); setRegisterError(""); setRegisterNotice(""); try { const result = await registerBuyer(registration); setRegisterNotice(result.message); setRegisterMode(false); setUsername(registration.username); setPassword(""); } catch(e) { setRegisterError(e instanceof Error ? e.message : "No fue posible crear la cuenta."); } finally { setRegisterBusy(false); } };

  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(username.trim(), password); };

  return (

    <main className="login-page">

      <div className="login-visual">

        <div className="login-visual-brand"><div className="brand-mark"><Leaf size={25} /></div><span>RiTech<span className="brand-light"> SAS</span></span></div>

        <div className="login-visual-copy"><span className="eyebrow">MARKETPLACE B2B · CAFÉ & CACAO</span><h1>El origen de los grandes negocios.</h1><p>Conectamos productores colombianos con compradores internacionales, con información clara sobre disponibilidad y pedidos.</p></div>

        <div className="login-visual-foot"><Sprout size={18} /> Comercio de origen, relaciones de confianza.</div>

      </div>

      <section className="login-panel">

        <div className="login-panel-inner">

          <div className="mobile-brand"><div className="brand-mark"><Leaf size={23} /></div><strong>RiTech SAS</strong></div>

          <span className="eyebrow">PLATAFORMA COMERCIAL</span>

          <h2>{registerMode ? "Crear cuenta de comprador" : "Inicia sesión"}</h2>

          <p className="muted">{registerMode ? "Regístrate para consultar el catálogo y realizar pedidos." : "Ingresa con las credenciales de tu cuenta RiTech."}</p>

          {registerMode ? <form className="stack-form" onSubmit={submitRegistration}>

            {([ ["fullName","Nombre completo"],["username","Usuario"],["email","Correo electrónico"],["password","Contraseña"],["companyName","Empresa o negocio"],["country","País"],["phone","Teléfono"],["address","Dirección"] ] as const).map(([key,label]) => <label key={key}>{label}<input type={key === "password" ? "password" : key === "email" ? "email" : "text"} required={!(["phone","address"] as string[]).includes(key)} minLength={key === "password" ? 12 : undefined} maxLength={key === "password" ? 72 : 180} value={registration[key]} onChange={e => setRegistration({...registration,[key]:e.target.value})}/></label>)}

            {registerError && <div className="alert error">{registerError}</div>}{registerNotice && <div className="alert success">{registerNotice}</div>}

            <button className="btn primary wide" disabled={registerBusy}>{registerBusy ? "Creando cuenta…" : "Registrarme como comprador"}</button>

            <button type="button" className="text-button" onClick={() => setRegisterMode(false)}>Volver al inicio de sesión</button>

          </form> : <form className="stack-form" onSubmit={submit}>

            <label>Usuario<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario" required /></label>

            <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" required /></label>

            {error && <div className="alert error" role="alert">{error}</div>}

            <button className="btn primary wide" disabled={busy}>{busy ? "Validando acceso…" : <>Entrar a RiTech <ArrowRight size={17} /></>}</button>

          </form>}

          {!registerMode && <button type="button" className="text-button" onClick={() => {setRegisterMode(true);setRegisterError("");}}>¿No tienes cuenta? Regístrate como comprador</button>}

          <div className="login-secure"><ShieldCheck size={16} /> Acceso protegido por autenticación segura</div>

        </div>

      </section>

    </main>

  );

}



function App() {

  const [user, setUser] = useState<AuthUser | null>(null);

  const [activeRole, setActiveRole] = useState<UserRole>("COMPRADOR");

  const [applications, setApplications] = useState<SellerApplication[]>([]);

  const [myApplications, setMyApplications] = useState<SellerApplication[]>([]);

  const [applicationForm, setApplicationForm] = useState({businessName:"",contactName:"",email:"",phone:"",country:"",productType:"BOTH",businessDescription:""});

  const [sessionLoading, setSessionLoading] = useState(true);

  const [loginBusy, setLoginBusy] = useState(false);

  const [loginError, setLoginError] = useState("");

  const [section, setSection] = useState<Section>("catalog");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [refresh, setRefresh] = useState(0);

  const [search, setSearch] = useState("");

  const [catalog, setCatalog] = useState<ListingView[]>([]);

  const [listings, setListings] = useState<ListingView[]>([]);

  const [lots, setLots] = useState<LotOption[]>([]);

  const [products, setProducts] = useState<ProductOption[]>([]);

  const [cart, setCart] = useState<CartView | null>(null);
  const [cartQuantityDrafts, setCartQuantityDrafts] = useState<Record<number, string>>({});

  const [orders, setOrders] = useState<OrderView[]>([]);

  const [users, setUsers] = useState<UserRecord[]>([]);

  const [profiles, setProfiles] = useState<Record<string, ProfileOption[]>>({});

  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketForm, setTicketForm] = useState({category:"OTHER",subject:"",description:""});
  const [selectedTicketId, setSelectedTicketId] = useState<number|null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportMessagesLoading, setSupportMessagesLoading] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [supportSearch, setSupportSearch] = useState("");
  const [supportFilter, setSupportFilter] = useState("ALL");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [supportMobileInboxVisible, setSupportMobileInboxVisible] = useState(true);
  const [supportAdmins, setSupportAdmins] = useState<SupportStaff[]>([]);
  const [escalationDrafts, setEscalationDrafts] = useState<Record<number, { adminUserId: string; reason: string }>>({});
  const [decisionDrafts, setDecisionDrafts] = useState<Record<number, { decision: "APPROVE_SUSPENSION" | "REJECT_SUSPENSION" | "REACTIVATE_SELLER" | "RESOLVE"; producerId: string; reason: string }>>({});
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const [mobileMenu, setMobileMenu] = useState(false);



  const [lotForm, setLotForm] = useState({ productId: "", lotCode: "", quantity: "", harvestDate: "" });

  const [listingForm, setListingForm] = useState({ inventoryLotId: "", title: "", description: "", priceUsdPerKg: "", minimumOrderKg: "1" });

  const [accountForm, setAccountForm] = useState({ fullName: "", username: "", email: "", password: "", role: "COMPRADOR" as UserRole, companyName: "", contactName: "", country: "", phone: "", address: "" });

  const [clientProfileTarget, setClientProfileTarget] = useState<UserRecord | null>(null);

  const [clientProfileForm, setClientProfileForm] = useState({ companyName: "", contactName: "", country: "", email: "", phone: "", address: "" });

  const [orderNotes, setOrderNotes] = useState("");

  const [profileSelection, setProfileSelection] = useState<Record<number, string>>({});



  useEffect(() => {

    getCurrentUser()

      .then(activeUser => {

        setUser(activeUser);

        const initialRole = activeUser.roles?.includes(activeUser.role) ? activeUser.role : activeUser.roles?.[0] || activeUser.role; setActiveRole(initialRole);

        setSection(initialRole === "COMPRADOR" ? "catalog" : initialRole === "VENDEDOR" ? "listings" : initialRole === "SOPORTE" ? "support" : "users");

      })

      .catch(() => setUser(null))

      .finally(() => setSessionLoading(false));

  }, []);



  const refreshData = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      if (activeRole === "COMPRADOR") {
        const [publicCatalog, nextCart, nextOrders, favorites, ownApplications, ownTickets] = await Promise.all([
          getCatalog(), getCart(), getMyOrders(activeRole), getFavorites(), getMySellerApplications(), getMySupportTickets(),
        ]);
        setCatalog(publicCatalog);
        setCart(nextCart);
        setOrders(nextOrders);
        setFavoriteIds(favorites.map(item => item.listingId));
        setMyApplications(ownApplications);
        setSupportTickets(ownTickets);
      } else if (activeRole === "VENDEDOR") {
        const [nextListings, nextLots, nextProducts, nextOrders, ownTickets] = await Promise.all([
          getMyListings(), getMyLots(), getProducts(), getMyOrders(activeRole), getMySupportTickets(),
        ]);
        setCatalog([]);
        setListings(nextListings);
        setLots(nextLots);
        setProducts(nextProducts);
        setOrders(nextOrders);
        setSupportTickets(ownTickets);
      } else if (activeRole === "SOPORTE") {
        const [nextSupport, admins] = await Promise.all([getSupportTickets(), getSupportAdmins()]);
        setCatalog([]);
        setSupportTickets(nextSupport);
        setSupportAdmins(admins);
      } else if (activeRole === "ADMINISTRADOR") {
        const [nextUsers, nextAudit, sellers, nextApplications, nextSupport] = await Promise.all([
          getUsers(), getAuditLogs(), getAvailableProfiles("VENDEDOR"), getSellerApplications(), getSupportTickets(),
        ]);
        setCatalog([]);
        setUsers(nextUsers);
        setAudit(nextAudit);
        setProfiles({ VENDEDOR: sellers });
        setApplications(nextApplications);
        setSupportTickets(nextSupport);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar la información.");
    }
  }, [user, activeRole]);


  useEffect(() => { void refreshData(); }, [refreshData, refresh]);

  useEffect(() => {
    if (section !== "support") return;
    if (!supportTickets.length) {
      setSelectedTicketId(null);
      setSupportMessages([]);
      return;
    }
    if (selectedTicketId === null || !supportTickets.some(ticket => ticket.id === selectedTicketId)) {
      setSelectedTicketId(supportTickets[0].id);
    }
  }, [section, supportTickets, selectedTicketId]);

  useEffect(() => {
    if (section !== "support" || selectedTicketId === null) {
      setSupportMessages([]);
      return;
    }
    let active = true;
    setSupportMessagesLoading(true);
    getSupportMessages(selectedTicketId)
      .then(messages => { if (active) setSupportMessages(messages); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "No fue posible cargar la conversación."); })
      .finally(() => { if (active) setSupportMessagesLoading(false); });
    return () => { active = false; };
  }, [section, selectedTicketId, user?.id, activeRole]);



  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3500); };

  const action = async (task: () => Promise<unknown>, success: string) => {

    setBusy(true); setError("");

    try { await task(); setRefresh(v => v + 1); notify(success); }

    catch (err) { setError(err instanceof Error ? err.message : "La operación no pudo completarse."); }

    finally { setBusy(false); }

  };

  const toggleFavorite = (listingId: number) => void action(async () => {
    if (favoriteIds.includes(listingId)) await removeFavorite(listingId);
    else await addFavorite(listingId);
  }, favoriteIds.includes(listingId) ? "Publicación eliminada de favoritos." : "Publicación guardada en favoritos.");

  const updateEscalationDraft = (ticketId: number, patch: Partial<{ adminUserId: string; reason: string }>) => {
    setEscalationDrafts(current => ({ ...current, [ticketId]: { ...(current[ticketId] ?? { adminUserId: "", reason: "" }), ...patch } }));
  };

  const updateDecisionDraft = (ticketId: number, patch: Partial<{ decision: "APPROVE_SUSPENSION" | "REJECT_SUSPENSION" | "REACTIVATE_SELLER" | "RESOLVE"; producerId: string; reason: string }>) => {
    setDecisionDrafts(current => ({ ...current, [ticketId]: { ...(current[ticketId] ?? { decision: "RESOLVE", producerId: "", reason: "" }), ...patch } }));
  };



  const handleLogin = async (username: string, password: string) => {

    setLoginBusy(true); setLoginError("");

    try { const signedIn = await login(username, password); setUser(signedIn); const initialRole = signedIn.roles?.includes(signedIn.role) ? signedIn.role : signedIn.roles?.[0] || signedIn.role; setActiveRole(initialRole); setSection(initialRole === "COMPRADOR" ? "catalog" : initialRole === "VENDEDOR" ? "listings" : initialRole === "SOPORTE" ? "support" : "users"); }

    catch (err) { setLoginError(err instanceof Error ? err.message : "No se pudo iniciar sesión."); }

    finally { setLoginBusy(false); }

  };



  const handleLogout = async () => {

    try { await logout(); } catch { /* Clear the local session even if the remote session already expired. */ }

    setUser(null); setSection("catalog"); setCart(null);

  };



  const menu: { id: Section; label: string; icon: typeof ShoppingBag }[] = activeRole === "ADMINISTRADOR" ? [

    { id: "support", label: "Mesa de ayuda", icon: ClipboardList }, { id: "users", label: "Cuentas y perfiles", icon: Users }, { id: "applications", label: "Solicitudes de vendedor", icon: ClipboardList }, { id: "audit", label: "Auditoría", icon: FileClock },

  ] : activeRole === "SOPORTE" ? [
    { id: "support", label: "Mesa de ayuda", icon: ClipboardList },

  ] : activeRole === "VENDEDOR" ? [

    { id: "support", label: "Mesa de ayuda", icon: ClipboardList }, { id: "listings", label: "Mis publicaciones", icon: Package }, { id: "inventory", label: "Mi inventario", icon: Warehouse }, { id: "orders", label: "Pedidos recibidos", icon: ClipboardList },

  ] : [

    { id: "support", label: "Mesa de ayuda", icon: ClipboardList }, { id: "catalog", label: "Catálogo", icon: ShoppingBag }, { id: "favorites", label: "Mis favoritos", icon: Heart }, { id: "cart", label: "Mi carrito", icon: ShoppingCart }, { id: "orders", label: "Mis pedidos", icon: ClipboardList }, { id: "seller-application", label: "Quiero ser vendedor", icon: Factory },

  ];



  const filteredCatalog = useMemo(() => catalog.filter(item => `${item.title} ${item.product.name} ${item.producer.name} ${item.product.productType}`.toLowerCase().includes(search.toLowerCase())), [catalog, search]);
  const favoriteListings = useMemo(() => catalog.filter(item => favoriteIds.includes(item.id)), [catalog, favoriteIds]);
  const sellerProducerOptions = useMemo(() => {
    // Only linked seller accounts can be suspended/reactivated from an administrative decision.
    // Unlinked legacy producer records have no account holder to whom the action can be attributed.
    return users
      .filter(account => account.active && account.roles?.includes("VENDEDOR") && account.profileId && account.producerProfileLabel)
      .map(account => ({ id: account.profileId as number, label: account.producerProfileLabel as string }));
  }, [users]);

  const selectedSupportTicket = useMemo(
    () => supportTickets.find(ticket => ticket.id === selectedTicketId) ?? null,
    [supportTickets, selectedTicketId],
  );
  const filteredSupportTickets = useMemo(() => {
    const query = supportSearch.trim().toLocaleLowerCase("es");
    return supportTickets.filter(ticket => {
      const matchesStatus = supportFilter === "ALL" || ticket.status === supportFilter;
      const searchable = `${ticket.ticketCode} ${ticket.subject} ${ticket.description} ${ticket.requesterName} ${ticket.requesterEmail}`.toLocaleLowerCase("es");
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [supportTickets, supportSearch, supportFilter]);
  const openSupportCount = supportTickets.filter(ticket => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const urgentSupportCount = supportTickets.filter(ticket => ["HIGH", "URGENT"].includes(ticket.priority) && !["RESOLVED", "CLOSED"].includes(ticket.status)).length;


  const saveLot = (event: FormEvent) => {

    event.preventDefault();

    void action(() => createLot({ productId: Number(lotForm.productId), lotCode: lotForm.lotCode, quantity: Number(lotForm.quantity), harvestDate: lotForm.harvestDate || null }), "Lote registrado correctamente.").then(() => setLotForm({ productId: "", lotCode: "", quantity: "", harvestDate: "" }));

  };

  const saveListing = (event: FormEvent) => {

    event.preventDefault();

    void action(() => createListing({ inventoryLotId: Number(listingForm.inventoryLotId), title: listingForm.title, description: listingForm.description, priceUsdPerKg: Number(listingForm.priceUsdPerKg), minimumOrderKg: Number(listingForm.minimumOrderKg), status: "PUBLISHED" }), "Publicación creada y enviada al catálogo.").then(() => setListingForm({ inventoryLotId: "", title: "", description: "", priceUsdPerKg: "", minimumOrderKg: "1" }));

  };

  const saveAccount = (event: FormEvent) => {

    event.preventDefault();

    void action(() => createUser(accountForm), accountForm.role === "COMPRADOR"
      ? "Cuenta de comprador y perfil de cliente creados correctamente."
      : accountForm.role === "SOPORTE"
        ? "Cuenta de soporte creada correctamente."
        : "Cuenta de administrador creada correctamente.")

      .then(() => setAccountForm({ fullName: "", username: "", email: "", password: "", role: "COMPRADOR", companyName: "", contactName: "", country: "", phone: "", address: "" }));

  };

  const openClientProfileForm = (account: UserRecord) => {

    setClientProfileTarget(account);

    setClientProfileForm({ companyName: "", contactName: account.fullName, country: "", email: account.email, phone: "", address: "" });

  };

  const saveExistingClientProfile = (event: FormEvent) => {

    event.preventDefault();

    if (!clientProfileTarget) return;

    void action(() => createBuyerProfile(clientProfileTarget.id, clientProfileForm), "Perfil de comprador creado y vinculado correctamente.")

      .then(() => { setClientProfileTarget(null); setClientProfileForm({ companyName: "", contactName: "", country: "", email: "", phone: "", address: "" }); });

  };

  const buyerCheckout = () => void action(async () => { const result = await checkout(orderNotes); setOrderNotes(""); setSection("orders"); return result; }, "Pedido confirmado. El contacto comercial está disponible en el detalle del pedido.");



  if (sessionLoading) return <div className="boot-screen"><div className="brand-mark"><Leaf /></div><span>Preparando RiTech…</span></div>;

  if (!user) return <LoginScreen onSubmit={handleLogin} busy={loginBusy} error={loginError} />;



  return (

    <div className="app-shell">

      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>

        <div className="sidebar-brand"><div className="brand-mark"><Leaf size={22} /></div><div><strong>RiTech<span> SAS</span></strong><small>MARKETPLACE B2B</small></div><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú"><X size={18} /></button></div>

        <div className="workspace-label">ESPACIO DE TRABAJO</div>

        <nav className="side-nav">

          {menu.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} onClick={() => { setSection(item.id); if (item.id === "support") setSupportMobileInboxVisible(true); setMobileMenu(false); }}><Icon size={18} /><span>{item.label}</span>{item.id === "cart" && cart?.items?.length ? <em>{cart.items.length}</em> : null}</button>; })}

        </nav>

        <div className="sidebar-bottom"><div className="support-note"><Leaf size={18} /><p>Comercio de origen, relaciones de confianza.</p></div><div className="user-mini"><div className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</div><div className="user-mini-text"><strong>{user.fullName}</strong><span>{roleName[activeRole]}</span></div><button className="icon-button" title="Cerrar sesión" onClick={handleLogout}><LogOut size={17} /></button></div></div>

      </aside>

      {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}

      <main className="main-area">

        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menú"><Menu /></button><div><div className="breadcrumb">RiTech SAS <span>/</span> {menu.find(m => m.id === section)?.label || "Marketplace"}</div><h1>{section === "catalog" ? "Explora el origen" : menu.find(m => m.id === section)?.label || "Marketplace"}</h1></div></div><div className="topbar-right"><div className="topbar-user"><span className="status-dot" /> Sesión activa</div>{user.roles && user.roles.length > 1 && <select className="compact-select" value={activeRole} onChange={e => {const next=e.target.value as UserRole;setActiveRole(next);setSection(next === "COMPRADOR" ? "catalog" : next === "VENDEDOR" ? "listings" : next === "SOPORTE" ? "support" : "users");setSupportMobileInboxVisible(true);}}>{user.roles.map(r => <option key={r} value={r}>{roleName[r]}</option>)}</select>}<div className="avatar small">{user.fullName.slice(0, 1).toUpperCase()}</div></div></header>

        <div className="content-area">

          {error && <div className="alert error page-alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar"><X size={16} /></button></div>}

          {notice && <div className="alert success page-alert"><Check size={16} /> {notice}</div>}

          {section === "support" && <>
            <div className="support-page-heading">
              <div>
                <span className="eyebrow">ATENCIÓN Y ACOMPAÑAMIENTO</span>
                <h2>{activeRole === "SOPORTE" ? "Centro de atención" : activeRole === "ADMINISTRADOR" ? "Casos escalados" : "Mis solicitudes de soporte"}</h2>
                <p className="muted">{activeRole === "SOPORTE" ? "Atiende cada solicitud en una conversación independiente y escala únicamente los casos que requieran una decisión administrativa." : activeRole === "ADMINISTRADOR" ? "Revisa únicamente los casos que fueron escalados a tu cuenta y registra decisiones trazables." : "Consulta tus casos y comunícate directamente con el equipo de atención de RiTech."}</p>
              </div>
              {(activeRole === "COMPRADOR" || activeRole === "VENDEDOR") && <button className="btn primary" onClick={() => setShowTicketForm(value => !value)}><Plus size={16}/>{showTicketForm ? "Cerrar formulario" : "Nueva solicitud"}</button>}
            </div>

            {(activeRole === "COMPRADOR" || activeRole === "VENDEDOR") && showTicketForm && <form className="panel support-create-panel" onSubmit={e => {
              e.preventDefault();
              void action(async () => {
                const created = await createSupportTicket(ticketForm);
                const refreshedTickets = await getMySupportTickets();
                setSupportTickets(refreshedTickets);
                setSelectedTicketId(created.id);
                setSupportMobileInboxVisible(false);
                setTicketForm({ category: "OTHER", subject: "", description: "" });
                setShowTicketForm(false);
              }, "Solicitud creada correctamente. Ya puedes conversar con soporte.");
            }}>
              <div className="support-create-title"><div className="support-icon"><MessageCircle size={19}/></div><div><h3>Cuéntanos cómo podemos ayudarte</h3><p>Se creará un caso privado vinculado a tu cuenta.</p></div></div>
              <div className="form-grid">
                <label>Categoría<select value={ticketForm.category} onChange={e=>setTicketForm({...ticketForm,category:e.target.value})}><option value="OTHER">Otra consulta</option><option value="ACCOUNT_ACCESS">Acceso a cuenta</option><option value="ACCOUNT_RECOVERY">Recuperación de cuenta</option><option value="ORDERS">Pedidos</option><option value="LISTINGS">Publicaciones</option><option value="INVENTORY">Inventario</option><option value="COMPLAINT">Queja</option><option value="CLAIM">Reclamación</option></select></label>
                <label>Asunto<input required maxLength={180} value={ticketForm.subject} onChange={e=>setTicketForm({...ticketForm,subject:e.target.value})} placeholder="Ej. No puedo acceder a mi cuenta"/></label>
                <label className="full-width">Descripción<textarea required rows={3} value={ticketForm.description} onChange={e=>setTicketForm({...ticketForm,description:e.target.value})} placeholder="Describe el problema y los pasos que realizaste..."/></label>
              </div>
              <div className="support-create-footer"><span><ShieldCheck size={14}/> No incluyas contraseñas ni datos confidenciales.</span><button className="btn primary" disabled={busy || !ticketForm.subject.trim() || !ticketForm.description.trim()}>Enviar solicitud</button></div>
            </form>}

            <div className="support-overview">
              <div className="support-stat-card"><span className="support-stat-icon"><Inbox size={17}/></span><div><strong>{supportTickets.length}</strong><small>{activeRole === "COMPRADOR" || activeRole === "VENDEDOR" ? "Mis solicitudes" : "Casos recibidos"}</small></div></div>
              <div className="support-stat-card"><span className="support-stat-icon open"><Clock3 size={17}/></span><div><strong>{openSupportCount}</strong><small>Casos pendientes</small></div></div>
              <div className="support-stat-card"><span className="support-stat-icon urgent"><Activity size={17}/></span><div><strong>{urgentSupportCount}</strong><small>Prioridad alta o urgente</small></div></div>
            </div>

            <div className={`support-workspace ${selectedSupportTicket ? "has-selection" : ""} ${supportMobileInboxVisible ? "mobile-inbox-visible" : ""}`}>
              <aside className="panel support-inbox">
                <div className="support-inbox-header"><div><h3>{activeRole === "COMPRADOR" || activeRole === "VENDEDOR" ? "Mis conversaciones" : "Bandeja de entrada"}</h3><p>{filteredSupportTickets.length} {filteredSupportTickets.length === 1 ? "caso" : "casos"}</p></div><span className="support-inbox-count">{supportTickets.length}</span></div>
                <div className="support-search"><Search size={16}/><input value={supportSearch} onChange={e=>setSupportSearch(e.target.value)} placeholder="Buscar por caso o usuario..." aria-label="Buscar solicitudes"/></div>
                <div className="support-filters" role="group" aria-label="Filtrar solicitudes">
                  {[{value:"ALL",label:"Todos"},{value:"NEW",label:"Nuevos"},{value:"IN_REVIEW",label:"En revisión"},{value:"ESCALATED",label:"Escalados"},{value:"RESOLVED",label:"Resueltos"}].filter(filter => filter.value !== "ESCALATED" || activeRole === "SOPORTE" || activeRole === "ADMINISTRADOR").map(filter=><button key={filter.value} className={supportFilter === filter.value ? "active" : ""} onClick={()=>setSupportFilter(filter.value)}>{filter.label}</button>)}
                </div>
                <div className="support-ticket-list">
                  {filteredSupportTickets.map(ticket=><button type="button" key={ticket.id} className={`support-ticket-row ${selectedTicketId === ticket.id ? "selected" : ""}`} onClick={()=>{setSelectedTicketId(ticket.id);setSupportMobileInboxVisible(false);setMessageDraft("");}}>
                    <div className="support-ticket-row-top"><span>{ticket.ticketCode}</span><StatusPill value={ticket.status}/></div>
                    <strong>{ticket.subject}</strong>
                    <p>{ticket.description}</p>
                    <div className="support-ticket-row-bottom"><span>{activeRole === "SOPORTE" || activeRole === "ADMINISTRADOR" ? ticket.requesterName : supportCategoryLabel[ticket.category] || ticket.category}</span><small>{formatSupportDate(ticket.createdAt)}</small></div>
                    <div className="support-ticket-meta"><span className={`priority-dot ${ticket.priority.toLowerCase()}`}/>{supportPriorityLabel[ticket.priority] || ticket.priority}<span>·</span>{supportCategoryLabel[ticket.category] || ticket.category}</div>
                  </button>)}
                  {!filteredSupportTickets.length && <div className="support-list-empty"><Inbox size={25}/><strong>{supportTickets.length ? "No encontramos casos" : "Tu bandeja está vacía"}</strong><span>{supportTickets.length ? "Prueba con otro filtro o término de búsqueda." : (activeRole === "COMPRADOR" || activeRole === "VENDEDOR") ? "Cuando crees una solicitud, podrás conversar aquí con soporte." : "Las solicitudes nuevas aparecerán aquí."}</span></div>}
                </div>
              </aside>

              {selectedSupportTicket ? <section className="panel support-detail">
                <div className="support-detail-header">
                  <button className="support-mobile-back" onClick={()=>setSupportMobileInboxVisible(true)} aria-label="Volver a la bandeja"><ArrowLeft size={17}/></button>
                  <div className="support-detail-title"><span className="eyebrow">{selectedSupportTicket.ticketCode}</span><h3>{selectedSupportTicket.subject}</h3><div className="support-detail-subtitle"><span>{supportCategoryLabel[selectedSupportTicket.category] || selectedSupportTicket.category}</span><span>·</span><span>{formatSupportDate(selectedSupportTicket.createdAt)}</span></div></div>
                  <div className="support-detail-status"><StatusPill value={selectedSupportTicket.status}/><span className={`priority-label ${selectedSupportTicket.priority.toLowerCase()}`}>{supportPriorityLabel[selectedSupportTicket.priority] || selectedSupportTicket.priority} prioridad</span></div>
                </div>

                {(activeRole === "SOPORTE" || activeRole === "ADMINISTRADOR") && <div className="support-requester-strip"><div className="support-avatar requester"><UserRound size={17}/></div><div><strong>{selectedSupportTicket.requesterName}</strong><span>{selectedSupportTicket.requesterEmail} · {roleName[selectedSupportTicket.requesterRole as UserRole] || selectedSupportTicket.requesterRole}</span></div><span className="support-requester-label">Solicitante</span></div>}
                {selectedSupportTicket.escalationReason && <div className="support-escalation-banner"><ShieldCheck size={16}/><div><strong>Motivo del escalamiento</strong><span>{selectedSupportTicket.escalationReason}</span></div></div>}

                <div className="support-chat-area">
                  <div className="support-chat-date"><span>Inicio de la solicitud</span></div>
                  <div className="support-message-row incoming">
                    <div className="support-avatar"><UserRound size={16}/></div>
                    <div className="support-message-content"><div className="support-message-author">{selectedSupportTicket.requesterName} <span>· Solicitante</span></div><div className="support-message-bubble">{selectedSupportTicket.description}</div><time>{formatSupportDate(selectedSupportTicket.createdAt)}</time></div>
                  </div>
                  {supportMessagesLoading && <div className="support-loading"><span className="loading-dot"/> Cargando conversación…</div>}
                  {!supportMessagesLoading && supportMessages.map(message=>{
                    const ownMessage = message.senderUserId === user.id;
                    const isRequesterMessage = message.senderType === "REQUESTER";
                    const author = message.senderName || (isRequesterMessage ? selectedSupportTicket.requesterName : message.senderType === "ADMINISTRATOR" ? "Administración" : "Equipo de soporte");
                    return <div key={message.id} className={`support-message-row ${ownMessage ? "outgoing" : "incoming"} ${message.internal ? "internal" : ""}`}>
                      {!ownMessage && <div className={`support-avatar ${isRequesterMessage ? "requester" : "staff"}`}>{isRequesterMessage ? <UserRound size={16}/> : <ShieldCheck size={16}/>}</div>}
                      <div className="support-message-content"><div className="support-message-author">{ownMessage ? "Tú" : author} <span>· {isRequesterMessage ? "Solicitante" : message.senderType === "ADMINISTRATOR" ? "Administrador" : "Soporte"}</span>{message.internal && <em>Nota interna</em>}</div><div className="support-message-bubble">{message.message}</div><time>{formatSupportDate(message.createdAt)}</time></div>
                      {ownMessage && <div className="support-avatar own"><UserRound size={16}/></div>}
                    </div>;
                  })}
                  {!supportMessagesLoading && !supportMessages.length && <div className="support-first-reply"><MessageCircle size={16}/> Aún no hay respuestas. El equipo de soporte continuará la atención por este medio.</div>}
                </div>

                {(activeRole === "SOPORTE" || activeRole === "ADMINISTRADOR" || selectedSupportTicket.status !== "CLOSED") ? <form className="support-composer" onSubmit={e=>{
                  e.preventDefault();
                  const content = messageDraft.trim();
                  if (!content) return;
                  void action(async()=>{
                    await sendSupportMessage(selectedSupportTicket.id, content);
                    setMessageDraft("");
                    setSupportMessages(await getSupportMessages(selectedSupportTicket.id));
                  },"Mensaje enviado correctamente.");
                }}>
                  <textarea rows={2} maxLength={3000} value={messageDraft} onChange={e=>setMessageDraft(e.target.value)} placeholder="Escribe una respuesta para esta conversación…" aria-label="Escribe una respuesta"/>
                  <div className="support-composer-footer"><span><ShieldCheck size={13}/> No compartas contraseñas, códigos ni datos bancarios.</span><button className="btn primary" disabled={busy || !messageDraft.trim()}><Send size={15}/> Enviar</button></div>
                </form> : <div className="support-closed-note">Este caso está cerrado. Puedes consultar el historial, pero no enviar nuevos mensajes.</div>}

                {activeRole === "SOPORTE" && <div className="support-management-panel">
                  <div className="support-management-heading"><div><span className="eyebrow">GESTIÓN INTERNA</span><h3>Administrar solicitud</h3><p>Estas acciones no forman parte de la conversación con el usuario.</p></div><span className="support-management-icon"><ClipboardList size={18}/></span></div>
                  {selectedSupportTicket.status !== "ESCALATED" && selectedSupportTicket.status !== "RESOLVED" && selectedSupportTicket.status !== "CLOSED" ? <>
                    <div className="support-inline-controls"><label>Estado<select value={selectedSupportTicket.status} onChange={e=>void action(async()=>{await updateSupportTicket(selectedSupportTicket.id,{status:e.target.value});setSupportTickets(await getSupportTickets());},"Estado actualizado.")}><option value="NEW">Nuevo</option><option value="IN_REVIEW">En revisión</option><option value="WAITING_USER">Esperando usuario</option></select></label><label>Prioridad<select value={selectedSupportTicket.priority} onChange={e=>void action(async()=>{await updateSupportTicket(selectedSupportTicket.id,{priority:e.target.value});setSupportTickets(await getSupportTickets());},"Prioridad actualizada.")}><option value="LOW">Baja</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></label></div>
                    <form className="support-escalate-form" onSubmit={e=>{e.preventDefault();const draft=escalationDrafts[selectedSupportTicket.id];if(!draft?.adminUserId||!draft.reason.trim()){setError("Selecciona un administrador y escribe el motivo del escalamiento.");return;}void action(async()=>{await escalateSupportTicket(selectedSupportTicket.id,Number(draft.adminUserId),draft.reason);setSupportTickets(await getSupportTickets());},"Caso escalado al administrador asignado.");}}>
                      <div className="support-management-subheading"><strong>¿Requiere una decisión administrativa?</strong><span>Escala este caso a un administrador específico.</span></div>
                      <label>Administrador responsable<select required value={escalationDrafts[selectedSupportTicket.id]?.adminUserId || ""} onChange={e=>updateEscalationDraft(selectedSupportTicket.id,{adminUserId:e.target.value})}><option value="">Selecciona un administrador</option>{supportAdmins.map(admin=><option key={admin.id} value={admin.id}>{admin.fullName} (@{admin.username})</option>)}</select></label>
                      <label>Motivo del escalamiento<textarea required rows={2} value={escalationDrafts[selectedSupportTicket.id]?.reason || ""} onChange={e=>updateEscalationDraft(selectedSupportTicket.id,{reason:e.target.value})} placeholder="Explica por qué este caso necesita una decisión administrativa"/></label>
                      <button className="btn secondary" disabled={busy || !supportAdmins.length}><ArrowLeft size={15}/> Escalar caso</button>
                    </form>
                  </> : <div className="support-workflow-notice"><ShieldCheck size={17}/><span>{selectedSupportTicket.status === "ESCALATED" ? "El caso está en revisión administrativa. Espera la decisión del administrador asignado." : `Este caso se encuentra ${selectedSupportTicket.status === "RESOLVED" ? "resuelto" : "cerrado"}. La gestión está finalizada.`}</span></div>}
                </div>}

                {activeRole === "ADMINISTRADOR" && selectedSupportTicket.status === "ESCALATED" && selectedSupportTicket.escalatedTo === user.id && <div className="support-management-panel admin">
                  <div className="support-management-heading"><div><span className="eyebrow">REVISIÓN ADMINISTRATIVA</span><h3>Registrar decisión</h3><p>La decisión quedará asociada al caso y registrada en auditoría.</p></div><span className="support-management-icon"><ShieldCheck size={18}/></span></div>
                  <p className="support-admin-guidance">La suspensión comercial conserva el rol VENDEDOR y el historial de la cuenta. Selecciona cuidadosamente el productor afectado.</p>
                  <form className="support-decision-form" onSubmit={e=>{e.preventDefault();const draft=decisionDrafts[selectedSupportTicket.id] || {decision:"RESOLVE" as const,producerId:"",reason:""};if(!draft.reason.trim()){setError("Escribe la justificación de la decisión.");return;}if((draft.decision === "APPROVE_SUSPENSION" || draft.decision === "REACTIVATE_SELLER") && !draft.producerId){setError("Selecciona el perfil de productor para esta decisión.");return;}void action(async()=>{await reviewEscalatedSupportTicket(selectedSupportTicket.id,draft.decision,draft.reason,draft.producerId?Number(draft.producerId):undefined);setSupportTickets(await getSupportTickets());setSelectedTicketId(null);},"Decisión registrada. El caso quedó resuelto.");}}>
                    <label>Decisión<select value={decisionDrafts[selectedSupportTicket.id]?.decision || "RESOLVE"} onChange={e=>updateDecisionDraft(selectedSupportTicket.id,{decision:e.target.value as "APPROVE_SUSPENSION"|"REJECT_SUSPENSION"|"REACTIVATE_SELLER"|"RESOLVE"})}><option value="RESOLVE">Resolver caso sin suspensión</option><option value="APPROVE_SUSPENSION">Aprobar suspensión comercial</option><option value="REJECT_SUSPENSION">Rechazar solicitud de suspensión</option><option value="REACTIVATE_SELLER">Aprobar reactivación comercial</option></select></label>
                    {(["APPROVE_SUSPENSION","REACTIVATE_SELLER"] as string[]).includes(decisionDrafts[selectedSupportTicket.id]?.decision || "RESOLVE") && <label>Vendedor / productor<select required value={decisionDrafts[selectedSupportTicket.id]?.producerId || ""} onChange={e=>updateDecisionDraft(selectedSupportTicket.id,{producerId:e.target.value})}><option value="">Selecciona un vendedor</option>{sellerProducerOptions.map(option=><option key={option.id} value={option.id}>{option.label} (ID {option.id})</option>)}</select></label>}
                    <label>Justificación de la decisión<textarea required rows={3} value={decisionDrafts[selectedSupportTicket.id]?.reason || ""} onChange={e=>updateDecisionDraft(selectedSupportTicket.id,{reason:e.target.value})} placeholder="Explica la decisión y sus fundamentos"/></label>
                    <button className="btn primary" disabled={busy}>Registrar decisión</button>
                  </form>
                </div>}
              </section> : <section className="panel support-no-selection"><div className="support-no-selection-icon"><MessageCircle size={27}/></div><h3>Selecciona una conversación</h3><p>Elige un caso de la bandeja para consultar su historial y responder de forma privada.</p></section>}
            </div>
          </>}


          {section === "catalog" && activeRole === "COMPRADOR" && <>

            <section className="welcome-banner"><div><span className="eyebrow light">PRODUCTORES COLOMBIANOS · CAFÉ Y CACAO</span><h2>Encuentra productos con<br />historia y origen.</h2><p>Consulta disponibilidad, conoce al productor y realiza tu pedido directamente desde el catálogo.</p></div><div className="banner-icon"><Coffee size={80} strokeWidth={1.1} /><Leaf size={34} /></div></section>

            <div className="section-heading"><div><span className="eyebrow">CATÁLOGO DISPONIBLE</span><h2>Productos destacados</h2><p className="muted">Publicaciones activas de vendedores registrados.</p></div><div className="search-box"><Search size={17} /><input placeholder="Buscar producto o productor" value={search} onChange={e => setSearch(e.target.value)} /></div></div>

            <div className="listing-grid">{filteredCatalog.map(item => <ListingCard key={item.id} listing={item} buyer favorite={favoriteIds.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onAdd={() => action(() => addCartItem(item.id, item.minimumOrderKg), "Producto agregado al carrito.")} busy={busy} />)}</div>

            {!filteredCatalog.length && <EmptyState icon={<Package />} title="No hay publicaciones disponibles" detail="Cuando un vendedor publique productos, aparecerán aquí." />}

            <p className="payment-note"><ShieldCheck size={16} /> RiTech registra los pedidos, pero el pago se acuerda directamente entre comprador y vendedor fuera de la plataforma.</p>

          </>}



          {section === "favorites" && activeRole === "COMPRADOR" && <>
            <div className="section-heading"><div><span className="eyebrow">PUBLICACIONES GUARDADAS</span><h2>Mis favoritos</h2><p className="muted">Guarda publicaciones para consultarlas más adelante. Solo se muestran anuncios que siguen activos y disponibles.</p></div></div>
            <div className="listing-grid">{favoriteListings.map(item => <ListingCard key={item.id} listing={item} buyer favorite onFavorite={() => toggleFavorite(item.id)} onAdd={() => action(() => addCartItem(item.id, item.minimumOrderKg), "Producto agregado al carrito.")} busy={busy}/>)}</div>
            {!favoriteListings.length && <EmptyState icon={<Heart/>} title="Todavía no tienes favoritos disponibles" detail="Guarda publicaciones desde el catálogo con el botón de corazón." action={<button className="btn primary" onClick={()=>setSection("catalog")}>Explorar catálogo <ArrowRight size={16}/></button>}/>}
          </>}

          {section === "cart" && activeRole === "COMPRADOR" && <>

            <div className="section-heading"><div><span className="eyebrow">RESUMEN DE COMPRA</span><h2>Mi carrito</h2><p className="muted">Un carrito puede incluir productos de un solo vendedor.</p></div></div>

            <div className="two-column-layout"><section className="panel cart-panel">{cart?.items?.length ? <>{cart.items.map(item => <div className="cart-row" key={item.id}><div className="product-symbol"><Coffee /></div><div className="cart-row-main"><strong>{item.listing.title}</strong><span>{item.listing.producer.name} · {currency(item.listing.priceUsdPerKg)}/kg</span><small>Disponible: {quantity(item.listing.inventoryLot.quantity)} kg</small></div><div className="cart-quantity"><input
                        aria-label="Cantidad en kilogramos"
                        type="number"
                        min={item.listing.minimumOrderKg}
                        max={item.listing.inventoryLot.quantity}
                        step="0.001"
                        value={cartQuantityDrafts[item.id] ?? String(item.quantityKg)}
                        onChange={e =>
                          setCartQuantityDrafts(prev => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onBlur={() => {
                          const raw = cartQuantityDrafts[item.id];
                          if (raw === undefined) return;

                          const nextQuantity = Number(raw);
                          const minimum = Number(item.listing.minimumOrderKg);
                          const available = Number(item.listing.inventoryLot.quantity);

                          const clearDraft = () => {
                            setCartQuantityDrafts(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          };

                          if (
                            raw.trim() === "" ||
                            !Number.isFinite(nextQuantity) ||
                            nextQuantity < minimum ||
                            nextQuantity > available
                          ) {
                            clearDraft();
                            setError(
                              `Ingresa una cantidad entre ${quantity(minimum)} y ${quantity(available)} kg.`
                            );
                            return;
                          }

                          if (nextQuantity === Number(item.quantityKg)) {
                            clearDraft();
                            return;
                          }

                          void action(async () => {
                            await updateCartItem(item.id, nextQuantity);
                            clearDraft();
                          }, "Cantidad actualizada.");
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      /><button className="text-button danger-text" onClick={() => void action(() => removeCartItem(item.id), "Producto eliminado del carrito.")}>Eliminar</button></div><strong className="cart-line-total">{currency(item.lineTotalUsd)}</strong></div>)}<div className="cart-seller"><Factory size={17} /> Vendedor: <strong>{cart.sellerName}</strong></div></> : <EmptyState icon={<ShoppingCart />} title="Tu carrito está vacío" detail="Agrega productos del catálogo para preparar tu pedido." action={<button className="btn primary" onClick={() => setSection("catalog")}>Explorar catálogo <ArrowRight size={16} /></button>} />}</section>

              <aside className="panel order-summary"><span className="eyebrow">TU PEDIDO</span><h3>Resumen</h3><div className="summary-line"><span>Productos</span><strong>{cart?.items?.length || 0}</strong></div><div className="summary-line"><span>Vendedor</span><strong className="summary-vendor">{cart?.sellerName || "—"}</strong></div><div className="summary-total"><span>Total estimado</span><strong>{currency(cart?.totalUsd || 0)}</strong></div><label className="form-label">Nota para el vendedor <textarea rows={3} placeholder="Detalles adicionales del pedido (opcional)" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} /></label><button className="btn primary wide" disabled={!cart?.items?.length || busy} onClick={buyerCheckout}>Confirmar pedido <ArrowRight size={17} /></button><p className="summary-disclaimer">No se realiza ningún cobro dentro de RiTech. El pago se coordina externamente.</p></aside></div>

          </>}



          {section === "orders" && (activeRole === "COMPRADOR" || activeRole === "VENDEDOR") && <>

            <div className="section-heading"><div><span className="eyebrow">SEGUIMIENTO COMERCIAL</span><h2>{activeRole === "VENDEDOR" ? "Pedidos de mis productos" : "Mis pedidos"}</h2><p className="muted">Consulta el estado y los datos de contacto de cada operación.</p></div><div className="stat-chip"><ClipboardList size={17} /> {orders.length} pedidos</div></div>

            <div className="orders-list">{orders.map(order => <OrderCard key={order.id} order={order} seller={activeRole === "VENDEDOR"} onStatus={(status) => action(() => updateOrderStatus(order.id, status), `Pedido ${statusLabel[status]?.toLowerCase() || "actualizado"}.`)} busy={busy} />)}</div>

            {!orders.length && <EmptyState icon={<ClipboardList />} title="Todavía no tienes pedidos" detail={activeRole === "VENDEDOR" ? "Cuando un comprador realice un pedido de tus publicaciones, aparecerá aquí." : "Cuando confirmes una compra, podrás seguirla desde esta sección."} />}

          </>}



          {section === "inventory" && activeRole === "VENDEDOR" && <>

            <div className="section-heading"><div><span className="eyebrow">CONTROL DE EXISTENCIAS</span><h2>Mi inventario</h2><p className="muted">Registra lotes propios para poder publicarlos en el Marketplace.</p></div><div className="stat-chip"><Warehouse size={17} /> {lots.length} lotes</div></div>

            <div className="panel form-panel"><div className="panel-title"><div className="panel-icon"><Plus /></div><div><h3>Registrar nuevo lote</h3><p>El lote quedará asociado a tu perfil de productor.</p></div></div><form className="form-grid" onSubmit={saveLot}><label>Producto<select value={lotForm.productId} onChange={e => setLotForm({ ...lotForm, productId: e.target.value })} required><option value="">Selecciona un producto</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {productLabel(p.productType)}</option>)}</select></label><label>Código del lote<input value={lotForm.lotCode} onChange={e => setLotForm({ ...lotForm, lotCode: e.target.value })} placeholder="Ej. NAR-COF-2026-01" required /></label><label>Cantidad disponible (kg)<input type="number" min="0.001" step="0.001" value={lotForm.quantity} onChange={e => setLotForm({ ...lotForm, quantity: e.target.value })} required /></label><label>Fecha de cosecha<input type="date" value={lotForm.harvestDate} onChange={e => setLotForm({ ...lotForm, harvestDate: e.target.value })} /></label><div className="form-actions"><button className="btn primary" disabled={busy}>Registrar lote <Plus size={16} /></button></div></form></div>

            <div className="panel table-panel"><div className="panel-title"><div><h3>Lotes registrados</h3><p>Stock que puedes utilizar en tus publicaciones.</p></div></div><div className="table-wrap"><table><thead><tr><th>Lote</th><th>Producto</th><th>Disponible</th><th>Estado</th><th>Cosecha</th></tr></thead><tbody>{lots.map(lot => <tr key={lot.id}><td className="strong-cell">{lot.lotCode}</td><td>{lot.productName}</td><td>{quantity(lot.quantity)} kg</td><td><StatusPill value={lot.status} /></td><td>{lot.harvestDate || "—"}</td></tr>)}</tbody></table>{!lots.length && <p className="table-empty">Aún no has registrado lotes.</p>}</div></div>

          </>}



          {section === "listings" && activeRole === "VENDEDOR" && <>

            <div className="section-heading"><div><span className="eyebrow">VENTA DIRECTA</span><h2>Mis publicaciones</h2><p className="muted">Publica tus productos, fija el precio por kilogramo y controla su visibilidad.</p></div><div className="stat-chip"><Package size={17} /> {listings.length} publicaciones</div></div>

            <div className="panel form-panel"><div className="panel-title"><div className="panel-icon"><Plus /></div><div><h3>Crear publicación</h3><p>Solo puedes publicar lotes vinculados a tu perfil.</p></div></div><form className="form-grid" onSubmit={saveListing}><label className="span-2">Lote de inventario<select value={listingForm.inventoryLotId} onChange={e => { const lot = lots.find(l => l.id === Number(e.target.value)); setListingForm({ ...listingForm, inventoryLotId: e.target.value, title: listingForm.title || (lot ? lot.productName : "") }); }} required><option value="">Selecciona un lote disponible</option>{lots.filter(l => l.status === "AVAILABLE" && l.quantity > 0).map(l => <option key={l.id} value={l.id}>{l.lotCode} · {l.productName} · {quantity(l.quantity)} kg</option>)}</select></label><label>Título de la publicación<input value={listingForm.title} onChange={e => setListingForm({ ...listingForm, title: e.target.value })} placeholder="Ej. Café especial de Nariño" required /></label><label>Precio por kg (USD)<input type="number" min="0.01" step="0.01" value={listingForm.priceUsdPerKg} onChange={e => setListingForm({ ...listingForm, priceUsdPerKg: e.target.value })} required /></label><label>Pedido mínimo (kg)<input type="number" min="0.01" step="0.01" value={listingForm.minimumOrderKg} onChange={e => setListingForm({ ...listingForm, minimumOrderKg: e.target.value })} required /></label><label className="span-2">Descripción<textarea rows={2} value={listingForm.description} onChange={e => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Describe origen, variedad, calidad o características del producto." /></label><div className="form-actions"><button className="btn primary" disabled={busy || !lots.some(l => l.status === "AVAILABLE" && l.quantity > 0)}>Publicar producto <ArrowRight size={16} /></button></div></form></div>

            <div className="listing-grid seller-grid">{listings.map(item => <ListingCard key={item.id} listing={item} seller onStatus={(status) => action(() => updateListing(item.id, { status }), "Estado de publicación actualizado.")} busy={busy} />)}</div>

            {!listings.length && <EmptyState icon={<Package />} title="Aún no tienes publicaciones" detail="Registra primero un lote de inventario y después crea tu primera publicación." action={<button className="btn secondary" onClick={() => setSection("inventory")}>Ir a inventario <ArrowRight size={16} /></button>} />}

          </>}



          {section === "users" && activeRole === "ADMINISTRADOR" && <>

            <div className="section-heading"><div><span className="eyebrow">ADMINISTRACIÓN DE ACCESO</span><h2>Cuentas y perfiles</h2><p className="muted">Los compradores reciben automáticamente su perfil de cliente. El rol vendedor solo se concede al aprobar una solicitud.</p></div><div className="stat-chip"><Users size={17} /> {users.length} cuentas</div></div>

            <div className="panel form-panel"><div className="panel-title"><div className="panel-icon"><Plus /></div><div><h3>Crear cuenta</h3><p>Las contraseñas se guardan cifradas. Para compradores, se crea también su perfil en clientes.</p></div></div>

              <form className="form-grid" onSubmit={saveAccount}>

                <label>Nombre completo<input value={accountForm.fullName} onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value, contactName: accountForm.contactName || e.target.value })} required maxLength={120} /></label>

                <label>Usuario<input value={accountForm.username} onChange={e => setAccountForm({ ...accountForm, username: e.target.value })} required minLength={3} maxLength={60} /></label>

                <label>Correo electrónico<input type="email" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} required maxLength={150} /></label>

                <label>Contraseña inicial<input type="password" value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} required minLength={12} maxLength={72} /></label>

                <label>Rol<select value={accountForm.role} onChange={e => setAccountForm({ ...accountForm, role: e.target.value as UserRole })}><option value="COMPRADOR">Comprador</option><option value="ADMINISTRADOR">Administrador</option><option value="SOPORTE">Soporte</option></select></label>

                {accountForm.role === "COMPRADOR" && <>

                  <label>Empresa o negocio<input value={accountForm.companyName} onChange={e => setAccountForm({ ...accountForm, companyName: e.target.value })} required maxLength={180} /></label>

                  <label>Persona de contacto<input value={accountForm.contactName} onChange={e => setAccountForm({ ...accountForm, contactName: e.target.value })} required maxLength={150} /></label>

                  <label>País<input value={accountForm.country} onChange={e => setAccountForm({ ...accountForm, country: e.target.value })} required maxLength={100} /></label>

                  <label>Teléfono<input value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} maxLength={30} /></label>

                  <label className="span-2">Dirección<input value={accountForm.address} onChange={e => setAccountForm({ ...accountForm, address: e.target.value })} maxLength={255} /></label>

                </>}

                <div className="form-actions align-end"><button className="btn primary" disabled={busy}>Crear cuenta <Plus size={16} /></button></div>

              </form>

            </div>

            {clientProfileTarget && <div className="panel form-panel"><div className="panel-title"><div><h3>Crear perfil de comprador para {clientProfileTarget.fullName}</h3><p>Esto completa una cuenta antigua que todavía no tiene registro en clientes.</p></div><button type="button" className="icon-button" onClick={() => setClientProfileTarget(null)} aria-label="Cerrar"><X size={18}/></button></div>

              <form className="form-grid" onSubmit={saveExistingClientProfile}>

                <label>Empresa o negocio<input required maxLength={180} value={clientProfileForm.companyName} onChange={e=>setClientProfileForm({...clientProfileForm,companyName:e.target.value})}/></label>

                <label>Persona de contacto<input required maxLength={150} value={clientProfileForm.contactName} onChange={e=>setClientProfileForm({...clientProfileForm,contactName:e.target.value})}/></label>

                <label>País<input required maxLength={100} value={clientProfileForm.country} onChange={e=>setClientProfileForm({...clientProfileForm,country:e.target.value})}/></label>

                <label>Correo<input type="email" maxLength={150} value={clientProfileForm.email} onChange={e=>setClientProfileForm({...clientProfileForm,email:e.target.value})}/></label>

                <label>Teléfono<input maxLength={30} value={clientProfileForm.phone} onChange={e=>setClientProfileForm({...clientProfileForm,phone:e.target.value})}/></label>

                <label>Dirección<input maxLength={255} value={clientProfileForm.address} onChange={e=>setClientProfileForm({...clientProfileForm,address:e.target.value})}/></label>

                <div className="form-actions"><button className="btn primary" disabled={busy}>Crear y vincular perfil</button><button type="button" className="btn secondary" onClick={()=>setClientProfileTarget(null)}>Cancelar</button></div>

              </form>

            </div>}

            <div className="panel table-panel"><div className="panel-title"><div><h3>Usuarios registrados</h3><p>Los clientes y productores se muestran separados. No vincules empresas históricas salvo que pertenezcan a esa cuenta.</p></div></div><div className="table-wrap"><table className="users-table"><thead><tr><th>Cuenta</th><th>Rol</th><th>Estado</th><th>Perfiles comerciales</th><th>Acción</th></tr></thead><tbody>{users.map(account => {

              const accountRoles = account.roles?.length ? account.roles : [account.role];

              const isAdmin = accountRoles.includes("ADMINISTRADOR");

              const hasBuyer = accountRoles.includes("COMPRADOR");

              const hasSeller = accountRoles.includes("VENDEDOR");

              return <tr key={account.id}><td><div className="account-cell"><div className="avatar table-avatar">{account.fullName.slice(0, 1).toUpperCase()}</div><div><strong>{account.fullName}</strong><small>@{account.username} · {account.email}</small></div></div></td>

                <td>{accountRoles.map(role => <span key={role} className="status-pill">{roleName[role]}</span>)}</td>

                <td><button className={`toggle ${account.active ? "on" : ""}`} disabled={account.id === user.id || busy} onClick={() => void action(() => setUserActive(account.id, !account.active), account.active ? "Cuenta desactivada." : "Cuenta activada.")}><span />{account.active ? "Activa" : "Inactiva"}</button></td>

                <td className="profile-cell">

                  {isAdmin ? <span className="muted">No requiere perfil</span> : <>

                    {hasBuyer && (account.clientProfileLabel ? <span className="profile-linked"><BadgeCheck size={14}/> Cliente: {account.clientProfileLabel}</span> : <button className="btn mini secondary" disabled={busy} onClick={()=>openClientProfileForm(account)}>Crear perfil de comprador</button>)}

                    {hasSeller && (account.producerProfileLabel ? <span className="profile-linked"><BadgeCheck size={14}/> Productor: {account.producerProfileLabel}</span> : <><select className="compact-select profile-select" value={profileSelection[account.id] || ""} onChange={e=>setProfileSelection({...profileSelection,[account.id]:e.target.value})}><option value="">Selecciona productor histórico…</option>{(profiles.VENDEDOR || []).map(p=><option key={p.id} value={p.id}>{p.label} · {p.secondary}</option>)}</select><button className="btn mini secondary" disabled={!profileSelection[account.id] || busy} onClick={()=>void action(()=>assignProfile(account.id,"PRODUCER",Number(profileSelection[account.id])),"Productor vinculado correctamente.")}>Vincular productor</button></>)}

                  </>}</td>

                <td><button className="text-button" onClick={() => { const value = window.prompt("Nueva contraseña (mínimo 12 caracteres):"); if (value) void action(() => resetUserPassword(account.id, value), "Contraseña restablecida."); }}>Restablecer clave</button></td></tr>;

            })}</tbody></table>{!users.length && <p className="table-empty">No hay cuentas registradas.</p>}</div></div>

            <p className="admin-note"><ShieldCheck size={16} /> El administrador no puede ver ni recuperar contraseñas, únicamente restablecerlas desde el proceso administrativo.</p>

          </>}



          {section === "seller-application" && activeRole === "COMPRADOR" && <>

            <div className="section-heading"><div><span className="eyebrow">CRECIMIENTO COMERCIAL</span><h2>Solicitar cuenta de vendedor</h2><p className="muted">El administrador revisará tu información antes de habilitar el panel de vendedor.</p></div></div>

            <div className="panel form-panel"><form className="form-grid" onSubmit={e=>{e.preventDefault();void action(()=>submitSellerApplication(applicationForm),"Solicitud enviada para revisión.");}}>

              <label>Nombre del negocio<input required maxLength={180} value={applicationForm.businessName} onChange={e=>setApplicationForm({...applicationForm,businessName:e.target.value})}/></label><label>Persona de contacto<input required maxLength={150} value={applicationForm.contactName} onChange={e=>setApplicationForm({...applicationForm,contactName:e.target.value})}/></label><label>Correo<input required type="email" value={applicationForm.email} onChange={e=>setApplicationForm({...applicationForm,email:e.target.value})}/></label><label>Teléfono<input value={applicationForm.phone} onChange={e=>setApplicationForm({...applicationForm,phone:e.target.value})}/></label><label>País<input required value={applicationForm.country} onChange={e=>setApplicationForm({...applicationForm,country:e.target.value})}/></label><label>Productos<select value={applicationForm.productType} onChange={e=>setApplicationForm({...applicationForm,productType:e.target.value})}><option value="COFFEE">Café</option><option value="COCOA">Cacao</option><option value="BOTH">Café y cacao</option></select></label><label className="full-width">Descripción del negocio<textarea value={applicationForm.businessDescription} onChange={e=>setApplicationForm({...applicationForm,businessDescription:e.target.value})}/></label><div className="form-actions"><button className="btn primary" disabled={busy}>Enviar solicitud</button></div></form></div>

            <div className="panel table-panel"><h3>Mis solicitudes</h3>{myApplications.map(a=><p key={a.id}><strong>{a.businessName}</strong> · {a.status}{a.rejectionReason ? ` · Motivo: ${a.rejectionReason}` : ""}</p>)}{!myApplications.length && <p className="muted">Todavía no has enviado solicitudes.</p>}</div>

          </>}

          {section === "applications" && activeRole === "ADMINISTRADOR" && <>

            <div className="section-heading"><div><span className="eyebrow">REVISIÓN DE SOLICITUDES</span><h2>Solicitudes para vender</h2><p className="muted">Aprobar agrega VENDEDOR sin retirar COMPRADOR.</p></div></div>

            <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Solicitante</th><th>Negocio</th><th>Contacto</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{applications.map(a=><tr key={a.id}><td>@{a.username}</td><td>{a.businessName}<small>{a.country}</small></td><td>{a.contactName}<small>{a.email} · {a.phone || "Sin teléfono"}</small></td><td>{a.productType}</td><td>{a.status}</td><td>{a.status === "PENDING" ? <><button className="btn mini primary" onClick={()=>void action(()=>reviewSellerApplication(a.id,"APPROVE"),"Vendedor aprobado.")}>Aprobar</button><button className="btn mini secondary" onClick={()=>{const reason=window.prompt("Motivo del rechazo:");if(reason?.trim())void action(()=>reviewSellerApplication(a.id,"REJECT",reason),"Solicitud rechazada.");}}>Rechazar</button></> : a.rejectionReason || "—"}</td></tr>)}</tbody></table>{!applications.length && <p className="table-empty">No hay solicitudes registradas.</p>}</div></div>

          </>}

          {section === "audit" && activeRole === "ADMINISTRADOR" && <>

            <div className="section-heading"><div><span className="eyebrow">TRAZABILIDAD DE ACCESO</span><h2>Registro de auditoría</h2><p className="muted">Historial de acciones administrativas y comerciales relevantes.</p></div><div className="stat-chip"><Activity size={17} /> {audit.length} eventos</div></div>

            <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario ID</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead><tbody>{audit.map(entry => <tr key={entry.id}><td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString("es-CO") : "—"}</td><td>{entry.actorUserId ?? "Sistema"}</td><td><span className="audit-action">{entry.action}</span></td><td>{entry.entityType}{entry.entityId ? ` #${entry.entityId}` : ""}</td><td>{entry.details ? Object.entries(entry.details).map(([k,v]) => `${k}: ${String(v)}`).join(" · ") : "—"}</td></tr>)}</tbody></table>{!audit.length && <p className="table-empty">Aún no hay eventos de auditoría.</p>}</div></div>

            <p className="admin-note"><ShieldCheck size={16} /> Los detalles de auditoría no contienen contraseñas ni hashes de contraseñas.</p>

          </>}



          <footer className="page-footer"><span>© {new Date().getFullYear()} RiTech SAS</span><span>Marketplace B2B de café y cacao · Operaciones en USD</span></footer>

        </div>

      </main>

    </div>

  );

}



function ListingCard({ listing, buyer, seller, favorite, onFavorite, onAdd, onStatus, busy }: { listing: ListingView; buyer?: boolean; seller?: boolean; favorite?: boolean; onFavorite?: () => void; onAdd?: () => void; onStatus?: (status: string) => void; busy: boolean }) {
  return <article className="listing-card"><div className={`listing-cover ${listing.product.productType === "COCOA" ? "cocoa" : "coffee"}`}><div className="cover-label"><span>{productLabel(listing.product.productType)}</span><BadgeCheck size={17} /></div><div className="cover-art">{listing.product.productType === "COCOA" ? <Sprout size={56} strokeWidth={1.1} /> : <Coffee size={56} strokeWidth={1.1} />}</div><span className="cover-origin">ORIGEN COLOMBIA</span>{buyer && <button type="button" className={`favorite-action ${favorite ? "active" : ""}`} title={favorite ? "Quitar de favoritos" : "Guardar en favoritos"} aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"} onClick={onFavorite} disabled={busy}><Heart size={18} fill={favorite ? "currentColor" : "none"}/></button>}</div><div className="listing-info"><div className="listing-title-row"><div><h3>{listing.title}</h3><span className="producer-name"><Factory size={14} /> {listing.producer.name}</span></div>{seller && <StatusPill value={listing.status} />}</div>{listing.description && <p className="listing-description">{listing.description}</p>}<div className="listing-meta"><div><small>DISPONIBLE</small><strong>{quantity(listing.inventoryLot.quantity)} kg</strong></div><div><small>PEDIDO MÍNIMO</small><strong>{quantity(listing.minimumOrderKg)} kg</strong></div></div><div className="listing-bottom"><div><small>PRECIO POR KG</small><strong className="listing-price">{currency(listing.priceUsdPerKg)}</strong></div>{buyer && <button className="btn primary" onClick={onAdd} disabled={busy || listing.inventoryLot.quantity < listing.minimumOrderKg}>Agregar <ShoppingCart size={16} /></button>}{seller && <select className="status-select" value={listing.status} disabled={busy || listing.status === "SOLD_OUT"} onChange={e => onStatus?.(e.target.value)}><option value="PUBLISHED">Publicado</option><option value="PAUSED">Pausar</option><option value="DRAFT">Borrador</option></select>}</div></div></article>;
}



function OrderCard({ order, seller, onStatus, busy }: { order: OrderView; seller: boolean; onStatus: (status: string) => void; busy: boolean }) {

  const next = order.status === "CONFIRMED" ? [{ status: "IN_PREPARATION", label: "Iniciar preparación" }, { status: "CANCELLED", label: "Cancelar pedido" }] : order.status === "IN_PREPARATION" ? [{ status: "SHIPPED", label: "Marcar como enviado" }] : order.status === "SHIPPED" ? [{ status: "DELIVERED", label: "Marcar entregado" }] : [];

  return <article className="panel order-card"><div className="order-head"><div><span className="eyebrow">PEDIDO {order.orderCode}</span><h3>{order.orderDate}</h3></div><StatusPill value={order.status} /></div><div className="order-summary-strip"><div><small>DESTINO</small><strong>{order.destinationCountry}</strong></div><div><small>ARTÍCULOS</small><strong>{order.items.length}</strong></div><div><small>VALOR TOTAL</small><strong>{currency(order.totalUsd)}</strong></div></div><div className="order-lines">{order.items.map(line => <div key={line.id}><span>{line.productName} · {quantity(line.quantityKg)} kg <small>({line.lotCode})</small></span><strong>{currency(line.totalUsd)}</strong></div>)}</div><div className="contact-grid"><div className="contact-card"><span>{seller ? "COMPRADOR" : "VENDEDOR"}</span><strong>{seller ? order.buyer.companyName : order.seller?.name || "—"}</strong><small>{seller ? order.buyer.contactName : order.seller?.contact || "Contacto no registrado"}</small><small>{seller ? order.buyer.email || "Sin correo" : order.seller?.email || "Sin correo"}</small><small>{seller ? order.buyer.phone || "Sin teléfono" : order.seller?.phone || "Sin teléfono"}</small></div><div className="contact-card"><span>ENTREGA</span><strong>{order.destinationCountry}</strong><small>{order.destinationAddress || "Dirección no registrada"}</small>{order.notes && <small>Nota: {order.notes}</small>}</div></div>{seller && next.length > 0 && <div className="order-actions">{next.map(item => <button key={item.status} className={`btn ${item.status === "CANCELLED" ? "danger-outline" : "primary"}`} disabled={busy} onClick={() => onStatus(item.status)}>{item.label} <ArrowRight size={15} /></button>)}</div>}</article>;

}



function StatusPill({ value }: { value: string }) { return <span className={`status-pill ${value.toLowerCase()}`}>{statusLabel[value] || value}</span>; }

function EmptyState({ icon, title, detail, action }: { icon: ReactNode; title: string; detail: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{detail}</p>{action}</div>; }



export default App;
