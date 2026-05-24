# Catálogo 3D Automatizado — Funcionalidades

> **Documento vivo.** Cada vez que sumamos una funcionalidad importante,
> la registramos acá con el formato del final del archivo.
> Última actualización: 2026-05-22.

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, SQLite (default) / Postgres.
- **Frontend**: React 19, TypeScript, Vite, react-router-dom.
- **Servicios externos**: Gemini (re-estilización de imágenes), FAL (Flux Kontext + Trellis 3D), Playwright (scraping + render PDF).
- **Migraciones**: aditivas vía `_ensure_legacy_columns()` en `backend/app/db.py`. Sin Alembic.

## Índice

1. [Catálogo automatizado](#1-catálogo-automatizado)
2. [Comercial — Caja, Pedidos, Clientes, Presupuestos](#2-comercial)
3. [Operación — Impresoras, Materiales, Producción](#3-operación)
4. [Herramientas — Calculadora, Reportes](#4-herramientas)
5. [Acceso público sin login](#5-acceso-público-sin-login)
6. [Cómo sumar nuevas funcionalidades](#6-cómo-sumar-nuevas-funcionalidades)

---

## 1. Catálogo automatizado

### 1.1 Pipeline MakerWorld → catálogo estilizado

- **Qué hace**: pegás una URL de MakerWorld, el backend la scrapea con Playwright, descarga N imágenes, las re-estiliza con FAL (Flux Kontext) usando un prompt de identidad visual (`backend/config/visual_identity.txt`), y opcionalmente genera un modelo 3D con Trellis. Todo asíncrono con job tracking.
- **Backend**: `routes/jobs.py` + `services/pipeline.py` + `services/scraper.py` + `services/image_service.py`. Modelos `Job`, `CatalogItem`, `CatalogImage`, `Category`.
- **Frontend admin**: tab **Catálogo** (`admin/AdminPage.tsx`) con `SubmitForm`, `JobStatus`, `CatalogGrid`.
- **Endpoints**:
  - `POST /api/jobs` — encola un pipeline.
  - `GET /api/jobs/{id}` — estado en vivo.

### 1.2 Carga manual de productos

- **Qué hace**: alta manual de un producto con imágenes propias, sin pasar por el pipeline.
- **Backend**: `POST /api/catalog/manual` (multipart con archivos).
- **Frontend admin**: tab **Catálogo** → "Subir diseño propio" (`ManualProductForm.tsx`).

### 1.3 Edición y bulk operations sobre el catálogo

- **Qué hace**: editar nombre/categoría, borrar, bulk delete, bulk update, eliminar/restilizar imágenes específicas.
- **Endpoints**:
  - `PATCH /api/catalog/{id}`, `DELETE /api/catalog/{id}`
  - `POST /api/catalog/bulk-delete`, `POST /api/catalog/bulk-update`
  - `DELETE /api/catalog/{id}/images/{image_id}`
  - `POST /api/catalog/{id}/images/{image_id}/restyle`

### 1.4 Categorías jerárquicas i18n

- **Qué hace**: árbol de categorías con `name_en` / `name_es`, importadas desde MakerWorld. Filtrado del catálogo por categoría con descendientes incluidos.
- **Backend**: `routes/categories.py`, modelo `Category` (self-FK).
- **Endpoint**: `GET /api/categories`.

### 1.5 Vitrina pública (showcase)

- **Qué hace**: catálogo público navegable con grid, sidebar, toolbar, detalle, lightbox de imágenes y visor 3D embebido.
- **Frontend público**: `src/showcase/{ShowcasePage,ProductDetailPage,ShowcaseGrid,ShowcaseCard,ShowcaseSidebar,ShowcaseToolbar}.tsx` + `components/{ImageLightbox,Model3DLightbox}.tsx`.
- **Rutas**: `/` y `/producto/:id`.

---

## 2. Comercial

### 2.1 Control de caja

- **Qué hace**: registro de movimientos (ingresos/egresos), cuentas, contactos, categorías por tipo, gastos recurrentes, dashboard con totales y evolución mensual, cuentas por cobrar, rentabilidad por producto.
- **Backend**: `routes/cash.py`. Modelos `CashTransaction`, `Account`, `TransactionCategory`, `RecurringExpense`, `Contact`.
- **Frontend admin**: tab **Control de caja** (`admin/caja/CajaPage.tsx`) con `CajaDashboard`, `TransactionForm/List`, `ProfitabilityPanel`, `ReceivablesPanel`, `RecurringExpenses`, `ContactPicker`, `PeopleManager`, `CategoryManager`, `RangePicker`.
- **Endpoints destacados**:
  - `GET /api/cash/transactions?start=&end=&kind=&q=` (paginado).
  - `GET /api/cash/summary?start=&end=` (KPIs + monthly/daily/by_*).
  - `GET /api/cash/profitability?start=&end=`.
  - `GET /api/cash/receivables`.
  - `GET /api/cash/transactions/export` (CSV).
  - `POST /api/cash/recurring/{id}/post` (materializa un gasto fijo).

### 2.2 Pedidos (Central de Pedidos)

- **Qué hace**: gestión de pedidos con estados (CREADO/EJECUTANDO/EJECUTADO/ENTREGADO) + pago (PENDIENTE/PAGADO) + prioridad (1/2/3) + deadline + sale_date + flag de rascunho. KPIs consolidadas en 6 cards (em aberto, próximos del prazo, atrasados, em produção, entregues, valor pendente). Búsqueda transversal y 6 sub-tabs.
- **Backend**: `routes/orders.py`. Modelos `Order`, `OrderCostItem`.
- **Frontend admin**: tab **Pedidos** (`admin/pedidos/PedidosPage.tsx`) con `OrderForm`, `OrderQueue`, `OrderEditModal`, `ExtraCostModal`.
- **Endpoints destacados**:
  - `GET /api/orders?status=&payment_status=&include_drafts=`.
  - `GET /api/orders/summary?start=&end=&prazo_window_days=`.
  - `POST /api/orders` (acepta `deadline`, `sale_date`, `is_draft`).
  - `POST /api/orders/{id}/start | /advance` (transiciones de estado, con índice único para máx 1 EJECUTANDO).
  - `POST /api/orders/{id}/payment` (vuelca al control de caja).
  - `PUT /api/orders/{id}/costs` (replace) + `POST /api/orders/{id}/costs/item` (append).

### 2.3 Clientes (CRM)

- **Qué hace**: cadastro extendido (nombre + email + teléfono + tipo de documento DNI/CUIT/CPF/CNPJ + número + dirección completa). Buscador transversal. Generación de **link público de auto-cadastro** que el cliente abre y completa él mismo.
- **Backend**: extensión de `Contact` + nuevo modelo `ClientLink` + `routes/public.py`.
- **Frontend admin**: tab **Clientes** (`admin/clientes/ClientesPage.tsx`) con `ClientForm`.
- **Frontend público**: ruta `/c/:token` (`public/ClientRegisterPage.tsx`).
- **Endpoints destacados**:
  - `POST /api/cash/contacts`, `PATCH /api/cash/contacts/{id}`.
  - `POST /api/public/clients/links` — genera token (TTL 14 días default).
  - `GET /api/public/clients/info?token=...` — estado del link (expirado/consumido/pedido vinculado).
  - `POST /api/public/clients/register?token=...` — el cliente completa sus datos.

### 2.4 Gerador de Orçamento (PDF)

- **Qué hace**: editor 2 columnas con preview live. Branding completo (logo + nombre + slogan + contacto). Numeración automática `ORC-YYYY-NNN`. Validez 30 días default. Items con qty + precio unit. Render PDF server-side con Playwright. Link público compartible.
- **Backend**: `routes/quotes.py`. Modelo `Quote`. Render con Playwright headless.
- **Frontend admin**: tab **Orçamento** (`admin/orcamento/OrcamentoPage.tsx`) + `QuotePreview` reutilizable.
- **Frontend público**: ruta `/q/:token` (`public/QuotePublicPage.tsx`).
- **Endpoints destacados**:
  - `POST /api/quotes` (asigna número + token).
  - `GET /api/quotes/{id}/pdf` — descarga PDF A4 generado por Playwright.
  - `POST /api/quotes/upload-logo` (PNG/JPG/SVG/WEBP, max 2MB).
  - `GET /api/quotes/public/{token}` — vista pública read-only.

---

## 3. Operación

### 3.1 Impresoras

- **Qué hace**: inventario de impresoras del negocio con marca, modelo, ambiente, costo de compra, fecha, costo de kWh, costo por hora. Alimenta el cálculo de luz/depreciación de la calculadora. Soft-delete via `archived`.
- **Backend**: `routes/printers.py`. Modelo `Printer`.
- **Frontend admin**: tab **Impressoras** (`admin/impressoras/ImpressorasPage.tsx`) con `PrinterForm` y `OnboardingModal` ("Como preencher" mascot-style).
- **Endpoints**: `GET / POST / PATCH / DELETE /api/printers`.

### 3.2 Estoque (Materiales)

- **Qué hace**: inventario de materiales (PLA/PETG/ABS/TPU/RESIN/OTRO) con marca, color, modelo, stock en gramos, costo por gramo. Auditoría completa via `MaterialMovement` (IN/OUT/ADJUST). El stock se recalcula al registrar movements, con validación de no-negativo (409 si rompe). Vinculación opcional con `Order` para trazabilidad de consumo.
- **Backend**: `routes/materials.py`. Modelos `Material`, `MaterialMovement`.
- **Frontend admin**: tab **Estoque** (`admin/estoque/EstoquePage.tsx`) con `MaterialForm`, `MovementForm`, `OnboardingModal`.
- **Endpoints**:
  - `GET / POST / PATCH / DELETE /api/materials`.
  - `GET / POST /api/materials/{id}/movements`.

### 3.3 Producción (tracking de impresiones)

- **Qué hace**: cada impresión es un `ProductionRun` con state machine (PENDENTE → EM_PRODUCAO ↔ PAUSADA → CONCLUIDA/CANCELADA). Acumula `total_paused_seconds` reales en cada pausa/resume. Frontend muestra **timer en vivo** del tiempo restante (refresca cada 1s client-side, congelado en PAUSADA, signo "+" si excedido). 4 KPI cards + 6 sub-tabs. Vinculación opcional con order, printer, material.
- **Backend**: `routes/production.py`. Modelo `ProductionRun`.
- **Frontend admin**: tab **Producción** (`admin/produccion/ProduccionPage.tsx`) con `ProductionRunForm`.
- **Endpoints**:
  - `GET /api/production?status=&printer_id=&order_id=`.
  - `GET /api/production/summary?start=&end=`.
  - `POST /api/production`, `PATCH /api/production/{id}`.
  - `POST /api/production/{id}/{start|pause|resume|finish|cancel}` (409 si transición inválida).

---

## 4. Herramientas

### 4.1 Calculadora de costos

- **Qué hace**: cálculo de precio de impresión con UX estilo Lunaro (header con título + subtítulo descriptivo, layout 2 columnas Datos / Resultado + panel educativo lateral). Incluye:
  - **Cualquier material del estoque por pieza** (multicolor + insumos): lista de `[material · qty · ✕]` + `+ Agregar material`, donde el material puede ser filamento (g), accesorio (un, ej.: imanes) o líquido (ml). Costos:
    - Filamentos: `max(precio/kg) × Σ gramos` (regla multicolor — cobramos como si todo el filamento fuera el más caro de la pieza).
    - Insumos / líquidos: `Σ (qty × costo unitario)` directo.
    - El campo "Otros insumos sueltos ($)" sigue disponible para cosas no rastreadas (pegamento, alcohol) — se suma con +30%.
    Cada material se descuenta del stock con su propio movement OUT trazado al pedido.
  - Selección de **Impressora** del inventario (auto-completa `cost_per_hour`, reemplaza el cálculo watts × kWh + desgaste).
  - **Taxa de marketplace** (presets: Mercado Libre 14% / 17.5%, Shopee 12%, Magalu 16%, custom).
  - Margen ×3 Mayorista / ×4 Minorista / ×5 Llaveros + insumos extra +30%.
  - **Empty states accionables**: si no hay filamentos en estoque, CTA "Registrar filamento"; si no hay impresoras, CTA "Cadastrar impresora" o seguir con cálculo manual (watts × kWh).
  - **Estado vacío del Resultado**: hint "¿Listo para ver el costo y precio sugerido?" antes de cargar datos.
  - **Panel educativo "¿Qué calcula esta calculadora?"** (Material / Energía + depreciación / Margen / Taxa de marketplaces).
  - **Parámetros avanzados** plegables (`<details>`): precio filamento fallback, kWh, watts, vida útil, repuesto, % margen de error.
  - Override manual del total a cobrar.
  - Historia de últimas 5 cotizaciones (localStorage). Quotes viejas (1 sólo material) siguen abriendo via migración transparente.
  - Bridge "Crear pedido con esta cotización" → al guardar el pedido, **descuenta automáticamente del stock** un OUT por filamento, todos trazados al `order_id` recién creado.
- **Frontend admin**: tab **Calculadora** (`admin/calculadora/CalculadoraPage.tsx`) + `calc.ts` (función pura — `MaterialLine`, `materialsTotals()`, `computeQuote()` con `resolveCostPerG` opcional) + `storage.ts` (persistencia local con `materialLines[]`).
- **Notas**: el cálculo es pure function; multicolor se modela arriba del cálculo "1 precio × 1 gramaje" inyectando `(Σ g, max $/kg)` antes de llamar a `computeQuote`. Mantiene back-compat con cotizaciones viejas (`materialId` único → primera línea legacy).

### 4.2 Reportes (Dashboard de KPIs)

- **Qué hace**: tablero estilo Lunaro con todos los KPIs operativos en una vista, filtrable por rango de fechas (presets Hoy/Semana/Mes/Año/Todo).
- **KPIs (12+)**:
  - Faturamento total, Lucro líquido, Margen, Ticket medio, Valor pendente, Productos en catálogo.
  - Pedidos del mes, Atrasados, En producción, Listos para entrega, Entregados en el mes, Horas impresas (con tempo médio).
- **Paneles**:
  - Facturación y lucro (mini chart credit/debit por día).
  - Estado de pedidos (barras por estado).
  - Top productos por margen.
  - **Stock por material** (barras por tipo de filamento).
- **Frontend admin**: tab **Reportes** (`admin/reportes/ReportesPage.tsx`) + componente reutilizable `KpiCard.tsx` (tones: neutral/blue/green/orange/red/purple).

---

## 5. Acceso público sin login

| Ruta | Qué hace | Documento backend |
|---|---|---|
| `/` | Vitrina pública del catálogo | `routes/catalog.py:GET /api/catalog` |
| `/producto/:id` | Detalle de un producto (imágenes + modelo 3D) | `routes/catalog.py:GET /api/catalog/{id}` |
| `/c/:token` | Auto-cadastro de cliente desde link | `routes/public.py` |
| `/q/:token` | Visualización pública de un presupuesto + bajar PDF | `routes/quotes.py:GET /public/{token}` |

---

## 6. Cómo sumar nuevas funcionalidades

Cuando agreguemos una funcionalidad importante, **siempre** sumamos una entrada acá con este formato:

```markdown
### X.Y Nombre corto de la funcionalidad

- **Qué hace**: 2-4 líneas describiendo el comportamiento desde la perspectiva del usuario, no del código.
- **Backend**: archivos clave en `backend/app/` (modelos + rutas + servicios). Mencioná los nuevos modelos si los hay.
- **Frontend admin**: tab nueva o cambios en una existente, con paths `frontend/src/...`.
- **Frontend público** *(si aplica)*: nueva ruta en `App.tsx` + página en `src/public/`.
- **Endpoints** *(si suma nuevos)*:
  - `METHOD /api/...` — descripción de 1 línea.
- **Notas** *(si hay decisiones técnicas no obvias)*: por ejemplo, "reusa Playwright del scraper" o "lógica X intencionalmente client-side".
```

### Reglas de actualización

1. **Cada PR / merge que toca user-facing** debería actualizar este archivo. No esperar al cierre de un milestone.
2. **Una sola entrada por funcionalidad**. Si una mejora extiende una existente, editá la entrada original; agregá un sub-bullet `**Cambios:**` solo si es un cambio de comportamiento visible.
3. **Mantener orden estable**: las secciones (1–5) no se renumeran. Si una funcionalidad nueva no cabe en las secciones existentes, sumá una sección 7+ al final.
4. **No documentar funcionalidades planeadas pero no implementadas** acá. Para eso está `.planning/` o `FEATURES_BACKLOG.md` si lo creamos.
5. **Actualizar la fecha** "Última actualización" en el header cada vez que se edita.

### Convenciones del proyecto que ya aplican

- **Modelos**: `created_at` + `updated_at` por default, `archived: bool` para soft-delete, `sort_order: int` cuando hace falta orden manual, `kind: str` como discriminator.
- **Schemas Pydantic**: sufijos `*Create / *Update / *Read / *Ref`. Flags `clear_*` para anular nullable en updates.
- **API client**: `get* / create* / update* / delete* / replace*`. Querystring vía `buildQuery()`.
- **UI**:
  - Tabs en `admin/AdminPage.tsx` (editar el `type Tab` + sumar `<button>` + sumar rama del render condicional).
  - `Modal` reutilizable (`components/Modal.tsx`) con `Modal.Header / Body / Footer`.
  - `KpiCard` reutilizable (`components/KpiCard.tsx`).
  - CSS scoped por feature (`admin/<feature>/<feature>.css`); globales en `styles.css` cuando son compartibles (botones, modal base, etc.).
- **Migraciones aditivas**: nuevas columnas sobre tablas existentes se agregan en `backend/app/db.py:_ensure_legacy_columns()` con `ALTER TABLE ... ADD COLUMN` idempotente (SQLite + Postgres). No usar Alembic.

---

## Anexo — Inventario rápido

**Backend routers actuales** (`backend/app/main.py`):

```
/api/jobs           → catálogo (pipeline async)
/api/catalog        → CRUD de items
/api/categories     → árbol de categorías
/api/cash           → caja (transacciones, contactos, cuentas, recurrentes, summary)
/api/orders         → pedidos + summary
/api/printers       → impresoras
/api/materials      → materiales + movements
/api/production     → tracking de impresiones
/api/quotes         → presupuestos (incluye PDF render)
/api/public/clients → auto-cadastro público
```

**Admin tabs** (`frontend/src/admin/AdminPage.tsx`):

```
catalogo · reportes · caja · pedidos · calculadora ·
impressoras · estoque · clientes · produccion · orcamento
```

**Modelos SQLAlchemy** (`backend/app/models.py`):

```
Job · Category · CatalogItem · CatalogImage
Contact · ClientLink
Account · TransactionCategory · RecurringExpense · CashTransaction
Order · OrderCostItem
Printer
Material · MaterialMovement
ProductionRun
Quote
```
