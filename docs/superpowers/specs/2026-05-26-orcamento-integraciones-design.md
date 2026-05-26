# Diseño — Conectar Orçamento con Clientes, Calculadora y Pedidos

**Fecha:** 2026-05-26
**Estado:** Aprobado para implementación
**Alcance:** Cerrar las 4 integraciones cruzadas del Gerador de Orçamento (item 2.4 de `FEATURES.md`) para que el flujo Calc → Quote → Pedido funcione con un par de clicks y los datos de empresa / cliente no se retipeen.

---

## 1. Problema

El módulo `/orcamento` (ver `backend/app/routes/quotes.py`, `frontend/src/admin/orcamento/`) ya tiene preview live, numeración `ORC-YYYY-NNN`, PDF con Playwright y link público `/q/<token>`. Pero hoy es una **isla**:

- **Branding** (logo, nombre, slogan, email, teléfono) se retipea en cada presupuesto nuevo.
- **Cliente** (`client_name`, `client_email`, `client_phone`) se retipea aunque ya esté en el CRM (`Contact`).
- **Calculadora → Orçamento:** no existe. Solo hay Calc → Pedido. El total cotizado hay que pasarlo a mano.
- **Orçamento → Pedido:** no existe. Cuando el cliente acepta, el pedido se arma de cero.

`AdminPage.tsx:284` instancia `<OrcamentoPage />` sin pasarle el `pendingQuote` que sí recibe `PedidosPage` (`AdminPage.tsx:288`) — el bridge para entrar desde otra pestaña ya tiene la mitad del cableado mental, pero no del lado del orçamento.

## 2. Objetivo

Que el usuario, en su flujo real, pueda:

1. Configurar **una sola vez** los datos de su empresa y reusarlos en cada presupuesto.
2. **Elegir un cliente** del CRM y que los campos se autocompleten.
3. Cotizar un trabajo en la Calculadora y mandarlo al Orçamento con **un click**.
4. Cuando el cliente acepta el presupuesto, **convertirlo en pedido** sin re-tipear cliente ni items.

Métricas blandas de éxito: para un quote típico (1 empresa, 1 cliente ya cargado, 1 item desde la calc), el usuario tipea **0 campos del bloque "Tu empresa"** y **0 del bloque "Cliente"**, y el pedido se crea con cliente + items pre-cargados.

## 3. Diseño

Cuatro piezas independientes que comparten el modelo `Quote` y la tabla `quotes`. Cada pieza se puede implementar y testear sola.

### 3.1 Pieza A — Perfil de empresa (branding default)

**Modelo nuevo `BusinessProfile`** (singleton, fila única — siempre `id=1`):

```python
class BusinessProfile(Base):
    __tablename__ = "business_profile"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # siempre 1
    business_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    business_slogan: Mapped[str | None] = mapped_column(String(160), nullable=True)
    business_logo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    business_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Migración aditiva en `_ensure_legacy_columns()` (`backend/app/db.py`) — sin Alembic, como el resto del proyecto.

**Endpoints nuevos en `routes/quotes.py`** (mismo router, ruta hermana):

| Verbo | Path | Resp |
|---|---|---|
| `GET` | `/api/business-profile` | `BusinessProfileRead \| null` |
| `PUT` | `/api/business-profile` | upsert (siempre `id=1`) → `BusinessProfileRead` |

**Frontend (`OrcamentoPage.tsx`):**

- `useEffect` inicial: `getBusinessProfile()` además de `getQuotes()`. Guardar en `profile` state.
- `emptyDraft()` toma los 5 campos del `profile` si existe (sino, strings vacíos como hoy).
- En el bloque "Tu empresa" agregar arriba un botón secundario **"Guardar como datos por defecto"**:
  - `PUT /api/business-profile` con los 5 campos actuales del draft.
  - Toast/feedback inline ("Datos guardados. Se usarán en los próximos presupuestos.").
- Empty state: si `profile === null` y `quotes.length === 0`, mostrar hint en el bloque "Tu empresa": _"Llená tu marca una vez con el botón 'Guardar como datos por defecto' y la reusás en cada presupuesto."_

**Decisión de diseño:** los campos del quote individual **siguen siendo override**, no referencias. Si el usuario edita un campo dentro de un quote, queda como override de ese quote puntual — el perfil **no muta** salvo que aprieten "Guardar como datos por defecto". Razón: snapshots inmutables son la garantía de que el PDF compartido nunca cambia retroactivamente.

### 3.2 Pieza B — ContactPicker en el quote (cliente precargado)

**Schema:** agregar columna opcional en `Quote`:

```python
client_contact_id: Mapped[int | None] = mapped_column(
    ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True,
)
```

Migración aditiva en `_ensure_legacy_columns()`.

**Schemas** (`backend/app/schemas.py`):

- `QuoteCreate` y `QuoteUpdate` aceptan `client_contact_id: int | None`.
- `QuoteRead` lo expone.

**Frontend:**

- Reutilizar `ContactPicker` de `admin/caja/ContactPicker.tsx` (ya consumido por `OrderForm` y `OrderEditModal`).
- Cargar contactos con `getContacts()` en el `useEffect` inicial del `OrcamentoPage`.
- Renderizar el `ContactPicker` **arriba** del bloque "Cliente" (antes de los 3 inputs nombre/email/teléfono).
- Handler: al elegir contacto → `patch({ client_name, client_email, client_phone, ... })` y guardar `client_contact_id` en el draft.
- Sin contacto seleccionado → los 3 inputs se tipean a mano como hoy (back-compat completa).
- Si el quote fue guardado con `client_contact_id`, al re-abrirlo (vía `startEdit`) el picker arranca con ese contacto seleccionado.

### 3.3 Pieza C — Orçamento → Pedido (cierre del loop)

**Schema:** agregar columna opcional en `Order`:

```python
quote_id: Mapped[int | None] = mapped_column(
    ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True, index=True,
)
```

Migración aditiva.

**Schemas:**

- `OrderCreate` y `OrderRead` aceptan/exponen `quote_id`.
- En `routes/orders.py:POST /api/orders` aceptar `quote_id` en el payload (validar que existe; opcional, no obligatorio).

**Bridge frontend** — extender el `PendingQuote` que ya viaja Calc → Pedidos:

Hoy en `frontend/src/types.ts`:

```ts
export interface PendingQuote {
  origin: "calculator";
  total: number;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  contactId?: number;
  // ...
}
```

Cambio:

```ts
export interface PendingQuote {
  origin: "calculator" | "quote";
  source_quote_id?: number;             // nuevo, opcional
  total: number;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  contactId?: number;
  service_description?: string;          // nuevo, opcional (del quote)
}
```

**Frontend:**

- Botón nuevo en la toolbar del `OrcamentoPage` (entre "Bajar PDF" y "Eliminar"): **"Crear pedido con este presupuesto"**.
  - Solo visible cuando `editing !== null` (necesita un quote guardado).
  - Handler: construye un `PendingQuote` desde `editing` (origin="quote", `source_quote_id = editing.id`, items mapeados, `contactId = editing.client_contact_id`, `service_description = editing.service_description`, total = sum), llama a `onQuoteToOrder(pendingQuote)` que se sube a `AdminPage` y cambia el tab a "pedidos".
- Para que el handler exista, `OrcamentoPage` ahora **sí recibe** la prop `onQuoteToOrder: (q: PendingQuote) => void` desde `AdminPage`. Pasarla en `AdminPage.tsx:284`.
- `OrderForm` (en `admin/pedidos/`) ya acepta `pendingQuote` precargando items y contacto — agregar manejo de `quote_id` (si `pendingQuote.origin === "quote"`, setear `quote_id = source_quote_id` en el payload del `POST /api/orders`).
- Volver al quote: `QuoteRead` expone un campo derivado `linked_order_id: int | None` (resuelto en backend con `SELECT id FROM orders WHERE quote_id = :quote_id LIMIT 1`). Si está seteado, `OrcamentoPage` muestra arriba del form un chip **"Pedido vinculado #1234"** que cambia al tab pedidos.

**Decisión de diseño:** el botón **no crea el pedido directo, abre el form pre-cargado**. Mismo patrón que Calc → Pedido hoy (bajo riesgo, revisable). El usuario aprieta "Guardar pedido" en el OrderForm para confirmar.

### 3.4 Pieza D — Calculadora → Orçamento

Solo frontend (no toca schema ni backend).

**Cambios:**

- En `frontend/src/types.ts` agregar un tipo gemelo a `PendingQuote`:

```ts
export interface PendingQuoteDraft {
  origin: "calculator";
  client_contact_id?: number;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
}
```

- En `AdminPage.tsx`: nuevo state `const [pendingQuoteDraft, setPendingQuoteDraft] = useState<PendingQuoteDraft | null>(null);` + handler `handleCalcToQuote(draft) { setPendingQuoteDraft(draft); setTab("orcamento"); }`.
- Pasar a `<OrcamentoPage pendingQuoteDraft={pendingQuoteDraft} onPendingQuoteDraftConsumed={() => setPendingQuoteDraft(null)} />`.
- En `OrcamentoPage`, al ver `pendingQuoteDraft !== null` en su effect: `startNew()`, luego `patch({ items: draft.items, client_contact_id: draft.client_contact_id })`. Si hay `client_contact_id`, buscar el contacto en la lista de `contacts` ya cargada y autocompletar `client_name/email/phone` (mismo path que el handler del `ContactPicker` de pieza B). Finalmente llamar `onPendingQuoteDraftConsumed()` para limpiar el state en `AdminPage`.
- En `CalculadoraPage` agregar botón **"Crear presupuesto"** al lado del existente "Crear pedido":
  - Solo habilitado cuando hay un total calculado (`computeQuote` devolvió un resultado > 0), mismo gating que el botón "Crear pedido" existente.
  - Descripción del item: `"Cotización 3D"` por default — si el usuario escribió un nombre/producto en el campo de la calc, usarlo. 1 sólo item con `qty=1` y `unit_price=total` calculado.
  - Si hay cliente seleccionado en la calc (el `ContactPicker` que ya usa la pieza Calc → Pedido), lo pasa como `client_contact_id`.

**Decisión de diseño:** **1 item con el total, no desglosado**. El cliente que ve el PDF no necesita ver "material/luz/margen". Si el usuario quiere desglose, lo tipea a mano (siempre puede editar después del autoload).

## 4. Cambios por archivo (mapa)

### Backend

| Archivo | Cambio |
|---|---|
| `backend/app/models.py` | + clase `BusinessProfile`; + columna `Quote.client_contact_id` (FK Contact); + columna `Order.quote_id` (FK Quote) |
| `backend/app/db.py` | `_ensure_legacy_columns()`: agregar columnas nuevas a `quotes` y `orders`; crear tabla `business_profile` si no existe |
| `backend/app/schemas.py` | + `BusinessProfileRead/Write`; `QuoteCreate/Update/Read` aceptan `client_contact_id`; `OrderCreate/Read` aceptan `quote_id` |
| `backend/app/routes/quotes.py` | + `GET/PUT /api/business-profile`; el create/update de quote persiste `client_contact_id` |
| `backend/app/routes/orders.py` | el create de order acepta y persiste `quote_id`; opcionalmente `GET /api/orders?quote_id=` para el chip "pedido vinculado" |

### Frontend

| Archivo | Cambio |
|---|---|
| `frontend/src/types.ts` | extender `PendingQuote` (`origin: "calculator" \| "quote"`, `source_quote_id?`, `service_description?`); + `PendingQuoteDraft` |
| `frontend/src/api/client.ts` | + `getBusinessProfile()`, `putBusinessProfile()` |
| `frontend/src/admin/AdminPage.tsx` | wire `<OrcamentoPage>` con `onQuoteToOrder`, `pendingQuoteDraft`, `onPendingQuoteDraftConsumed` |
| `frontend/src/admin/orcamento/OrcamentoPage.tsx` | usar `profile` en `emptyDraft`; botón "Guardar como datos por defecto"; `ContactPicker` arriba del bloque cliente; botón "Crear pedido con este presupuesto"; consumir `pendingQuoteDraft` al montar; mostrar chip "Pedido vinculado" si aplica |
| `frontend/src/admin/orcamento/QuotePreview.tsx` | sin cambios funcionales (se sigue alimentando del draft) |
| `frontend/src/admin/orcamento/orcamento.css` | estilos para botón "Guardar como default", chip "Pedido vinculado", hint del empty state |
| `frontend/src/admin/calculadora/CalculadoraPage.tsx` | botón nuevo "Crear presupuesto" + handler que arma `PendingQuoteDraft` |
| `frontend/src/admin/pedidos/OrderForm.tsx` | si `pendingQuote.origin === "quote"`, persistir `quote_id = source_quote_id` y `service_description` en el create |

## 5. Migración / compatibilidad

- Todas las columnas nuevas son `nullable`. Quotes y orders existentes no se rompen.
- Tabla `business_profile` se crea vacía. La UI maneja `null` como "sin perfil aún".
- El `pendingQuote` existente (origen calculator → pedidos) sigue funcionando: el `origin` arranca en `"calculator"`, se agregan más casos.
- El logo del perfil reusa el endpoint existente `POST /api/quotes/upload-logo` (no necesita uno nuevo) — devuelve `{path, url}` que se guardan en `business_profile.business_logo_path`.

## 6. Testing manual (acceptance)

1. **Branding default:** crear quote A → llenar empresa → "Guardar como datos por defecto". Crear quote B → los 5 campos arrancan con los valores de A. Editar uno en B → guardar B → quote A no cambia.
2. **ContactPicker:** crear contacto en Clientes → en Orçamento elegirlo en el picker → nombre/email/teléfono se autocompletan. Guardar quote → re-abrir → picker arranca con el contacto seleccionado.
3. **Quote → Pedido:** quote con contacto + 2 items → "Crear pedido con este presupuesto" → cambia a tab Pedidos con form pre-cargado (cliente + 2 cost items + total). Guardar pedido → volver al quote → ver chip "Pedido vinculado #N".
4. **Calc → Quote:** en calculadora cotizar algo → "Crear presupuesto" → cambia a tab Orçamento con un item (descripción "Cotización 3D" o el nombre que se haya puesto, qty 1, unit_price = total) y branding pre-cargado del perfil.
5. **Back-compat:** quote viejo (sin `client_contact_id`) abre sin romper. Pedido viejo (sin `quote_id`) abre sin romper.

## 7. Fuera de alcance

- Estado del quote (enviado / aceptado / rechazado) — no se modela todavía. La "aceptación" es implícita: si el usuario aprieta "Crear pedido", asumimos aceptado.
- Notificación al cliente cuando se genera el quote (email / whatsapp) — out of scope.
- Templates / múltiples perfiles de empresa — singleton es suficiente para el caso 1 usuario / 1 marca.
- Versionado de quotes (revisión 2, revisión 3) — out of scope. Si hay cambios, hoy se crea quote nuevo.
- Descuentos / impuestos por item — el modelo actual de `QuoteItem` (description, quantity, unit_price) se mantiene sin tocar.
