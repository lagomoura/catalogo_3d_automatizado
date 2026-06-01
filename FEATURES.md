# Catálogo 3D Automatizado — Funcionalidades

> **Documento vivo.** Cada vez que sumamos una funcionalidad importante,
> la registramos acá con el formato del final del archivo.
> Última actualización: 2026-05-30.

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, SQLite (default) / Postgres.
- **Frontend**: React 18.3, TypeScript, Vite, react-router-dom.
- **Servicios externos**: Gemini (re-estilización de imágenes), FAL (Flux Kontext + Trellis 3D), Playwright (scraping + render PDF).
- **Migraciones**: aditivas vía `_ensure_legacy_columns()` en `backend/app/db.py`. Sin Alembic.

## Índice

1. [Catálogo automatizado](#1-catálogo-automatizado)
2. [Comercial — Caja, Pedidos, Clientes, Presupuestos](#2-comercial)
3. [Operación — Impresoras, Materiales, Producción](#3-operación)
4. [Herramientas — Calculadora, Reportes](#4-herramientas)
5. [Acceso público sin login](#5-acceso-público-sin-login)
6. [Cómo sumar nuevas funcionalidades](#6-cómo-sumar-nuevas-funcionalidades)
7. [SaaS multi-tenant](#7-saas-multi-tenant)

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
  - `POST /api/orders` (acepta `deadline`, `sale_date`, `is_draft`, `materials` — consumo por unidad que se stampa en cada `ProductionRun`).
  - `POST /api/orders/{id}/advance` (avance manual de estado) · `POST /api/orders/{id}/status` (set manual con `force`). `POST /api/orders/{id}/start` quedó **deprecado (410)**: el pedido pasa a EJECUTANDO al arrancar una pieza en Producción (ver §3.3, invariante Order↔runs). El `/status` reconcilia con `_resync_order_status` (no deja un estado que las piezas no respaldan), el cobro es **ortogonal** (no descobra al revertir), y revertir con piezas EN CURSO exige `force=true` → las cancela y devuelve su material al stock.
  - **Borrado desde cualquier columna (UI)**: el botón Eliminar está en la cola (CREADO), en "Listos para entrega" (kebab) y en "Entregados" (🗑) — antes solo aparecía en la cola, dejando "atrapados" los pedidos entregados. Backend `DELETE /api/orders/{id}` permite borrar salvo EJECUTANDO o con piezas no-terminales (flujo `cancel-runs` → delete).
  - **Cambio de estado manual (UI)**: cada card ofrece en el kebab los estados a los que se puede mover el pedido (CREADO/EJECUTADO/ENTREGADO; EJECUTANDO no se ofrece porque se deriva de las piezas). En "Entregados" hay un botón **"↩ Reabrir"** (deshacer entrega → EJECUTADO). Las reversiones con piezas en curso piden confirmación antes de cancelarlas (`changeOrderStatus` → `force`). Helper `board/statusActions.ts`.
  - **Nota visible en los listados (UI)**: la `note` del pedido (que suele ser el dato que lo distingue, ej. el nombre impreso en cada "caja de figus") se muestra como línea de detalle en cola, "listos", "entregados" y **prominente en el hero de la impresora** (lo que el operario debe imprimir). Antes solo se veía abriendo "Editar". Estilos `.pb-note`/`.pb-hero__note`.
  - **Vista "Entregados" mejorada (UI)**: cada fila muestra **nota + fecha de entrega** (`updated_at`); selector de rango **Este mes / Últimos 30 días / Todo** (`entregadosRange`, client-side) con contador. *(Escala futura: paginar/filtrar server-side con `order_status`/`start`/`end`.)*
  - **Búsqueda cross-vista "¿ya está hecho?" (UI)**: al escribir en el buscador, un banner cuenta los matches por estado sobre **todos** los pedidos (En cola/En producción/Listos/Entregados) y cada chip lleva a la vista correcta — así se ve al instante si "el pedido de Pirulo" salió, sin importar en qué vista estés. La búsqueda (`matchOrder`) ya cubre cliente, producto, **nota** e #id.
  - `POST /api/orders/{id}/payment` (vuelca al control de caja).
  - `PUT /api/orders/{id}/costs` (replace) + `POST /api/orders/{id}/costs/item` (append).
  - `POST /api/orders/{id}/reprint` (reimpresión): descuenta material del stock (un `OUT` por línea, `allow_negative`) y agrega un `OrderCostItem` "Reimpresión" (`per_unit=false`); si no se manda `amount`, se computa desde gramos × `cost_per_g`. UI: el `ExtraCostModal` suma un selector de material + gramos (modo "Calcular").

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

- **Qué hace**: inventario de materiales (PLA/PETG/ABS/TPU/RESIN/OTRO) con marca, color, modelo, stock en gramos, costo por gramo. Auditoría completa via `MaterialMovement` (IN/OUT/ADJUST). El stock se recalcula al registrar movements, con validación de no-negativo (409 si rompe; producción usa `allow_negative` para no bloquear el piso). Vinculación opcional con `Order` y `ProductionRun` (`production_run_id`) para trazabilidad de consumo.
- **Corregir stock desde "Editar"**: el form de edición tiene un campo **"Stock actual (corregir)"** precargado con el valor actual. Si se cambia, además del PATCH se crea un `MaterialMovement` ADJUST con el delta (`note="Corrección de inventario"`) — así se arregla una carga inicial errónea sin romper la auditoría (no se edita `stock_g` directo). Para entradas/salidas del día a día sigue el botón "Movimiento".
- **Backend**: `routes/materials.py`. Modelos `Material`, `MaterialMovement`. Helper reutilizable `apply_stock_movement(...)` (lo usan Producción y la reimpresión).
- **Frontend admin**: tab **Estoque** (`admin/estoque/EstoquePage.tsx`) con `MaterialForm` (prop `onAdjustStock`), `MovementForm`, `OnboardingModal`.
- **Endpoints**:
  - `GET / POST / PATCH / DELETE /api/materials`.
  - `GET / POST /api/materials/{id}/movements`.

### 3.3 Producción (tracking de impresiones)

- **Qué hace**: cada impresión es un `ProductionRun` con state machine (PENDENTE → EM_PRODUCAO ↔ PAUSADA → CONCLUIDA/CANCELADA). Acumula `total_paused_seconds` reales en cada pausa/resume. Frontend muestra **timer en vivo** del tiempo restante (refresca cada 1s client-side, congelado en PAUSADA, signo "+" si excedido). 4 KPI cards + 6 sub-tabs. Vinculación opcional con order, printer, material.
- **Inventario↔Producción (descuento por pieza)**: el consumo de material se descuenta al **iniciar** cada pieza, no al crear el pedido. Cada `ProductionRun` nace con un `consumption_snapshot` (JSON `[{material_id, grams}]` por unidad) tomado de las líneas de material de la Calculadora al crear el pedido (`OrderCreate.materials`). `start` genera un `OUT` por filamento (idempotente vía `stock_deducted`); `finish` lo deja consumido. Soporta multicolor (un movimiento por material).
  - **Devolución al cancelar**: `cancel?restock=true` devuelve el material al stock (un `IN` por línea); `restock=false` lo da por perdido. El frontend pregunta al usuario al cancelar una pieza **ya iniciada** (dos confirmaciones: cancelar la acción / devolver / no devolver). Cancelar una pieza PENDENTE no toca stock.
  - **Reabrir/Requeue**: `requeue` devuelve el material automáticamente (la pieza vuelve a la cola y se re-descuenta al re-iniciarla); `reopen` a un estado iniciado vuelve a descontar.
- **Volver a la cola (`requeue`)**: deshace el inicio de una pieza en curso/pausada (EM_PRODUCAO/PAUSADA → PENDENTE), libera la impresora, **descarta el progreso** (cronómetro a cero; conserva la impresora asignada) y **devuelve el material al stock**. Si era la última pieza activa de un pedido que había avanzado a EJECUTANDO, el pedido vuelve a CREADO (espejo de `start`). Expuesto en el kebab del hero de impresora y en "Gestionar piezas" (botón "↩ Volver a la cola", con confirmación).
- **Gestión de piezas terminadas (UI)**: el modal "Gestionar piezas" (`PiecesModal`) expone para piezas CONCLUIDA/CANCELADA los botones **"↺ Reabrir"** (`reopen`) y **"🗑 Borrar"** (`delete`, con confirmación; no devuelve stock). Antes esos endpoints existían pero la UI no los ofrecía.
- **Elegir impresora al iniciar la cola (`StartPrinterModal`)**: al "Iniciar" un pedido desde la cola, si hay **2+ impresoras libres** se abre un selector para elegir cuál; con **1 sola** se asigna automáticamente. Si la pieza ya tiene impresora, o se inicia desde el hero de una impresora concreta ("Iniciar próximo"), no pregunta.
- **Invariante de ocupación**: una impresora sostiene **una sola pieza activa (EM_PRODUCAO *o* PAUSADA)** a la vez — una pieza pausada sigue ocupando físicamente la impresora. Se garantiza en frontend (`busyPrinterIds`), backend (`start_run` y `reopen_run` rechazan con 409, con `try/except IntegrityError` ante carreras) y DB (índice único parcial `one_run_per_printer` sobre `status IN ('EM_PRODUCAO','PAUSADA')`, solo Postgres). **Prerrequisito de deploy**: si en prod ya hay impresoras con PAUSADA + EM_PRODUCAO simultáneas (bug previo), limpiar esos duplicados con requeue/cancel antes de desplegar, o el índice ampliado no se recreará.
- **Invariante Cola↔Producción (Order↔runs)**: el estado del pedido se **deriva** del de sus piezas, centralizado en `_resync_order_status(db, order)` (production.py), llamado tras **toda** transición de pieza (`start`/`finish`/`cancel`/`delete`/`requeue`/`reopen`/`cancel-runs` y al cambiar la cantidad). Reglas: ≥1 pieza activa (EM_PRODUCAO/PAUSADA) ⇒ pedido `EJECUTANDO`; al terminar la última pieza (todas terminales, ≥1 `CONCLUIDA`) **auto-avanza a `EJECUTADO`**; si se cancela/borra todo sin producir nada ⇒ vuelve a `CREADO`; `ENTREGADO` no se toca. Elimina los pedidos "fantasma" que quedaban en `EJECUTANDO` sin piezas activas (antes `finish`/`cancel`/`delete` no resincronizaban → bloqueaban el tablero). Stock: `delete` y `cancel-runs` ahora también devuelven el material descontado (paridad con `cancel`). **Saneamiento de datos viejos**: `POST /api/production/repair-consistency` (idempotente, por tienda: resincroniza pedidos colgados y siembra piezas a los `CREADO` legacy sin runs); escape hatch manual: `POST /api/orders/{id}/status` (`force` para reversas con piezas activas).
- **`start_order` deprecado (410)**: `POST /api/orders/{id}/start` responde **410 Gone** — reliquia del modelo viejo "un solo pedido en ejecución". En el tablero multi-impresora un pedido pasa a `EJECUTANDO` al arrancar **una de sus piezas** (`POST /api/production/{run_id}/start`), no por un flip a nivel pedido (que crearía un pedido EJECUTANDO sin piezas activas).
- **Backend**: `routes/production.py`. Modelo `ProductionRun`.
- **Frontend admin**: tab **Producción** (`admin/produccion/ProduccionPage.tsx`) con `ProductionRunForm`.
- **Endpoints**:
  - `GET /api/production?status=&printer_id=&order_id=`.
  - `GET /api/production/summary?start=&end=`.
  - `POST /api/production`, `PATCH /api/production/{id}`.
  - `POST /api/production/{id}/{start|pause|resume|finish|cancel|reopen|requeue}` (409 si transición inválida). `start` descuenta el material del `consumption_snapshot`. `cancel?restock=bool` devuelve (o no) el material. `reopen`: revierte una run terminal (CONCLUIDA/CANCELADA) a su estado previo (re-descuenta si vuelve a un estado iniciado; 409 si la impresora ya está ocupada). `requeue`: EM_PRODUCAO/PAUSADA → PENDENTE (devuelve material). **Todas** resincronizan el estado del pedido vía `_resync_order_status` (ver invariante Order↔runs).
  - `DELETE /api/production/{id}` (devuelve stock si la pieza lo había descontado, libera impresora y resincroniza el pedido).
  - `POST /api/production/{id}/retry` (201): **reintentar** una pieza TERMINAL (CONCLUIDA/CANCELADA) — crea una pieza nueva PENDENTE clonada (hereda `consumption_snapshot`, `piece_name`+" (reintento)", impresora) y deja la original como histórico. Sin estado "FALLIDA" nuevo (evita migrar el CheckConstraint en prod). 409 si la pieza no es terminal. UI: botón **"⟳ Reintentar"** en "Gestionar piezas".
  - `POST /api/production/repair-consistency` (admin, one-shot, idempotente): sanea inconsistencias Order↔runs de la tienda.

---

## 4. Herramientas

### 4.1 Calculadora de costos

- **Qué hace**: cálculo de precio de impresión con UX estilo Lunaro (header con título + subtítulo descriptivo, layout 2 columnas Datos / Resultado + panel educativo lateral). Incluye:
  - **Cualquier material del estoque por pieza** (multicolor + insumos): lista de `[material · qty · ✕]` + `+ Agregar material`, donde el material puede ser filamento (g), accesorio (un, ej.: imanes) o líquido (ml). Costos:
    - Filamentos: `max(precio/kg) × Σ gramos` (regla multicolor — cobramos como si todo el filamento fuera el más caro de la pieza).
    - Insumos / líquidos: `Σ (qty × costo unitario)` directo.
    - El campo "Otros insumos sueltos ($)" sigue disponible para cosas no rastreadas (pegamento, alcohol) — se suma con +30%.
    Las líneas de material viajan al pedido (`OrderCreate.materials`) y se descuentan del stock **al iniciar cada pieza** en Producción (no al crear el pedido), devolviéndose si la pieza se cancela. Ver §3.3.
  - Selección de **Impressora** del inventario (auto-completa `cost_per_hour`, reemplaza el cálculo watts × kWh + desgaste).
  - **Taxa de marketplace** (presets: Mercado Libre 14% / 17.5%, Shopee 12%, Magalu 16%, custom).
  - Margen ×3 Mayorista / ×4 Minorista / ×5 Llaveros + insumos extra +30%.
  - **Empty states accionables**: si no hay filamentos en estoque, CTA "Registrar filamento"; si no hay impresoras, CTA "Cadastrar impresora" o seguir con cálculo manual (watts × kWh).
  - **Estado vacío del Resultado**: hint "¿Listo para ver el costo y precio sugerido?" antes de cargar datos.
  - **Panel educativo "¿Qué calcula esta calculadora?"** (Material / Energía + depreciación / Margen / Taxa de marketplaces).
  - **Parámetros avanzados** plegables (`<details>`): precio filamento fallback, kWh, watts, vida útil, repuesto, % margen de error.
  - Override manual del total a cobrar.
  - Historia de últimas 5 cotizaciones (localStorage). Quotes viejas (1 sólo material) siguen abriendo via migración transparente.
  - Bridge "Crear pedido con esta cotización" → las líneas de material se mandan al pedido (`OrderCreate.materials`) y se stampan en cada `ProductionRun`; el stock se descuenta **al iniciar cada pieza** (ver §3.3), no al crear el pedido.
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

## 7. SaaS multi-tenant

Aura3D es un **SaaS multi-tienda**: N usuarios, cada uno con su login y su
tienda, con datos **completamente aislados**. (El cobro de la mensualidad es
una fase posterior; por ahora la suscripción es un flag manual por tienda.)

### 7.1 Cuentas y autenticación (signup + login con JWT)

- **Qué hace**: cualquiera crea su tienda en `/signup` (nombre + slug + email +
  password), o entra en `/login`. La sesión usa un **JWT** (Bearer) que lleva el
  usuario y su tienda; reemplaza el viejo Basic Auth single-admin.
- **Backend**: `routes/auth.py` (`POST /api/auth/signup`, `POST /api/auth/login`),
  `security.py` (bcrypt + PyJWT HS256), `auth.py` (`get_current_user` + la
  dependencia `resolve_request_context`). Modelos nuevos `Tenant` y `User`.
- **Frontend**: `auth/AuthProvider.tsx` (contexto de sesión + manejo de 401/402),
  `auth/LoginPage.tsx`, `auth/SignupPage.tsx`, `auth/RequireAuth.tsx` (protege
  `/admin`), chip de cuenta + logout en `admin/AccountMenu.tsx`.
- **Endpoints**: `POST /api/auth/signup`, `POST /api/auth/login`.

### 7.2 Aislamiento de datos por tienda (`tenant_id` + auto-scoping)

- **Qué hace**: cada fila de las 20 tablas tenant-owned lleva `tenant_id`. Toda
  lectura se filtra y toda escritura se estampa al tenant del request — **sin**
  filtrar a mano las ~94 consultas. El asistente (snapshot + tools) hereda el
  aislamiento por usar la sesión del request.
- **Backend**: `app/tenancy.py` (FUENTE DE VERDAD): `ContextVar` del tenant +
  listener `do_orm_execute` (filtro de lectura, vía `with_loader_criteria` con
  `propagate_to_loaders`) + listener `before_flush` (estampa `tenant_id` y
  **lanza error** si no hay tenant en contexto) + `unscoped()` (escape hatch para
  resolver slug/token/login). `Category` queda global (taxonomía MakerWorld).
- **Notas**: `Account.name` y `Quote.number` pasan a únicos por `(tenant_id, …)`;
  `BusinessProfile` deja de ser singleton `id=1` y es uno por tenant. El pipeline
  de fondo (`services/pipeline.py`) y los flujos por token (`/c`, `/q`) fijan el
  tenant explícitamente. La migración de la instalación single-tenant existente
  crea un tenant `"default"` y backfillea todas las filas a él (`db.py:init_db`).

### 7.3 Vitrina pública por subdominio

- **Qué hace**: la vitrina de cada tienda vive en `<slug>.aura3d.com` (dev:
  `<slug>.lvh.me`). El catálogo público se resuelve al tenant del subdominio.
- **Backend**: `auth.py:resolve_request_context` resuelve el slug por header
  `X-Store-Slug` → query `?store=` → subdominio del Host. Con slug → esa tienda
  (vitrina pública). Sin slug: si hay JWT → la tienda del admin logueado (el
  back-office comparte el path GET de catálogo/categorías con la vitrina); si no,
  el tenant `default`. `BASE_DOMAIN` configurable.
- **Frontend**: `api/client.ts:storeSlug()` deriva el slug del subdominio del
  browser y lo manda como `X-Store-Slug` (la API suele vivir en otro host, así
  que el Host de la request no lo lleva).

### 7.4 Suscripción (flag manual, gate de acceso)

- **Qué hace**: `Tenant.subscription_status` (`trialing` / `active` /
  `suspended`). Con `suspended` el back-office devuelve **402** y el frontend
  muestra el estado. El cobro real (proveedor de pago + webhook) es fase
  posterior; este flag ya deja el gate listo para enchufarlo.
- **Backend**: chequeo en `auth.py:_authenticate`. **Frontend**: badge en
  `admin/AccountMenu.tsx`.

### 7.5 Fairness y aislamiento de archivos (hardening de auditoría)

- **Rate-limit por tenant** (`ratelimit.py`): límite in-memory por ventana
  deslizante en los endpoints caros — `POST /api/jobs` (pipeline) y
  `POST /api/assistant/chat` — para que una tienda no degrade a las demás
  (noisy-neighbor). Por proceso; para multi-instancia migrar a Redis.
- **Storage namespaced por tenant**: `image_service` y el upload de logo guardan
  bajo `storage/<dir>/<tenant_id>/...` (`_tenant_dir`), aislando archivos por
  tienda y habilitando el borrado por tienda. Los paths viejos planos siguen
  sirviéndose (back-compat). Nota: catálogo/3D/logos de presupuesto son contenido
  **público por diseño** (vitrina, `/q/:token`); el namespacing es organizativo,
  no confidencialidad.
- **Deprovisioning de tienda** (`routes/account.py`): `GET /api/account` (info de
  la tienda/usuario) y `DELETE /api/account` (baja irreversible — requiere
  confirmar el slug). Borra todos los datos (`delete_tenant_data`: cascada por FK
  en Postgres; explícito por tabla en SQLite) + el storage `storage/*/<tenant_id>/`.
  **Frontend**: `admin/AccountModal.tsx` (zona de peligro con confirmación de slug)
  abierto desde `admin/AccountMenu.tsx`; al borrar hace logout + redirige a `/login`.
- **Pool de conexiones acotado** (`db.py`): en Postgres `pool_size=5` +
  `max_overflow=10` (15 máx por proceso) para no agotar el tope de conexiones del
  Postgres gestionado.

### 7.6 Landing de app vs vitrina de tenant (routing host-aware de `/`)

- **Qué hace**: no existe "una vitrina sobre las demás". La ruta `/` se resuelve
  según el host: en un **subdominio de tenant** (`<slug>.aura3d.com`) muestra la
  **vitrina** de ese tenant (`ShowcasePage`); en el **dominio de app / apex**
  (`aura3d.com`, `app.aura3d.com`, `localhost`) muestra la **landing pública**, que
  no consulta el catálogo. Quien se registra todavía no tiene vitrina, así que su
  destino natural es la landing, no un catálogo placeholder.
- **Frontend**: `App.tsx:RootRoute` usa `api/client.ts:storeSlug()` (devuelve `null`
  fuera de un subdominio de tenant) para elegir `LandingPage` vs `ShowcasePage`, en
  `path="/"` y en el catch-all `path="*"`. La landing (`landing/LandingPage.tsx`) es
  hoy un **placeholder enrutado** con CTAs a `/signup` y `/login` (la landing de
  marketing definitiva se construye sobre esta misma URL).
- **Auth**: Login/Signup (`auth/{LoginPage,SignupPage}.tsx`) muestran el logo Aura3D
  enlazado a `/` (la landing), reemplazando el viejo "Volver a la vitrina".
- **Vitrina del tenant**: el header ya **no** expone el acceso "Admin" — la vitrina
  es 100% para clientes finales; el dueño ingresa desde el dominio de app (`/login`).
- **Nota**: el fallback al tenant `default` en `auth.py` sigue existiendo a nivel API
  pero queda dormido para la vitrina (la landing no llama a `/api/catalog`).

---

## Anexo — Inventario rápido

**Backend routers actuales** (`backend/app/main.py`):

```
/api/auth           → signup + login (JWT) del SaaS
/api/account        → info de la tienda + baja (deprovisioning)
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
Tenant · User
Job · Category · CatalogItem · CatalogImage
Contact · ClientLink
Account · TransactionCategory · RecurringExpense · CashTransaction
Order · OrderCostItem
Printer
Material · MaterialMovement
ProductionRun
Quote
```
