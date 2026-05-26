# Orçamento Integraciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las 4 conexiones del Gerador de Orçamento (Clientes, Calculadora, Pedidos, branding default) para que un quote típico se arme con 0 tipeo redundante y se convierta en pedido con un click.

**Architecture:** 4 piezas independientes que comparten el modelo `Quote` y el bridge `PendingQuote` ya existente. Backend: nueva tabla singleton `business_profile`, 2 columnas FK aditivas (`quotes.client_contact_id`, `orders.quote_id`), endpoints `GET/PUT /api/business-profile`. Frontend: `BusinessProfile` API client, autofill en `OrcamentoPage`, `ContactPicker` reusado, botón Orçamento→Pedido (extiende `PendingQuote`), botón Calc→Orçamento (nuevo `PendingQuoteDraft`).

**Tech Stack:** FastAPI + SQLAlchemy 2 + SQLite/Postgres (migraciones aditivas vía `_ensure_legacy_columns()`, sin Alembic). React 19 + TypeScript + Vite. Sin framework de tests (ver nota abajo).

**Spec de referencia:** `docs/superpowers/specs/2026-05-26-orcamento-integraciones-design.md`

**Sobre testing:** Este proyecto **no tiene pytest ni vitest configurados** (verificado: `requirements.txt` no incluye `pytest`, `package.json` no incluye `vitest`/`jest`, no hay carpetas `tests/` propias). El patrón del proyecto es **verificación manual con curl + browser**. Cada task termina con un paso "Verificar manualmente" que da los comandos exactos. **No agregar dependencias de testing** — está fuera del scope de este plan.

**Orden de ejecución:** Fases A → B → C → D. Las fases B y C tocan el mismo archivo (`OrcamentoPage.tsx`) — si se ejecutan en paralelo habrá conflictos. Dentro de cada fase, los tasks son secuenciales.

---

## Setup previo (una sola vez)

- [ ] **Verificar que el backend levanta y la DB es accesible**

```bash
cd /home/moura/Repos/catalog_3d_automated/backend
# Opción 1: docker compose (recomendado para dev)
docker compose -f ../docker-compose.yml up -d
# Opción 2: uvicorn local
# uvicorn app.main:app --reload --port 8000
curl -s http://localhost:8000/api/quotes | head -c 200
```

Expected: lista JSON (puede estar vacía `[]`) o un error 401/Basic Auth — en ese caso reusar el header `Authorization: Basic <base64>` con las credenciales del admin gate. Si no levanta, parar y diagnosticar antes de seguir.

- [ ] **Verificar que el frontend dev server arranca**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend
npm run dev
```

Expected: Vite reporta `Local: http://localhost:5173/`. Abrir en browser, entrar a `/admin`, ver el tab "Orçamento" — confirmar que funciona el flujo actual antes de empezar.

---

# Fase A — Perfil de empresa (branding default)

## Task A1: Modelo `BusinessProfile` + migración

**Files:**
- Modify: `backend/app/models.py` (agregar clase al final, antes del último `# ---`)
- Modify: `backend/app/db.py:_ensure_legacy_columns()` (sin nuevas ALTER statements — la tabla se crea con `Base.metadata.create_all`, que ya corre en startup)

- [ ] **Step 1: Agregar clase `BusinessProfile` a `models.py`**

Buscar el final del archivo (después de la última clase, antes de cualquier `# ---` cerrador) y agregar:

```python
class BusinessProfile(Base):
    """Perfil de empresa singleton — se reusa como default en cada Quote nuevo.

    Convención: siempre fila con `id=1`. El endpoint PUT hace upsert sobre esa fila.
    Si no existe, GET devuelve null y el frontend muestra empty state.
    """

    __tablename__ = "business_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # siempre 1
    business_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    business_slogan: Mapped[str | None] = mapped_column(String(160), nullable=True)
    business_logo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    business_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
```

Verificar que los imports al tope del archivo ya incluyen `Mapped`, `mapped_column`, `Integer`, `String`, `Text`, `DateTime`, `datetime`. Si falta alguno, agregarlo.

- [ ] **Step 2: Reiniciar backend para correr `Base.metadata.create_all`**

```bash
# Si está corriendo via docker compose:
docker compose -f /home/moura/Repos/catalog_3d_automated/docker-compose.yml restart backend
# Si es uvicorn local con --reload, ya re-arranca solo
```

Expected: el backend levanta sin errores en el log.

- [ ] **Step 3: Verificar que la tabla existe**

```bash
# Sobre SQLite local:
sqlite3 /home/moura/Repos/catalog_3d_automated/backend/catalog.db ".schema business_profile"
# Sobre Postgres (docker):
docker compose -f /home/moura/Repos/catalog_3d_automated/docker-compose.yml exec db \
  psql -U postgres -d catalog -c "\d business_profile"
```

Expected: muestra la definición con las 7 columnas (id, business_name, business_slogan, business_logo_path, business_email, business_phone, updated_at).

- [ ] **Step 4: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/backend
git add app/models.py
git commit -m "feat(orcamento): modelo BusinessProfile singleton para branding default"
```

## Task A2: Schemas + endpoints `GET/PUT /api/business-profile`

**Files:**
- Modify: `backend/app/schemas.py` (agregar al final de la sección de Quotes, cerca de `QuoteRead`)
- Create: `backend/app/routes/business_profile.py`
- Modify: `backend/app/main.py` (registrar el router)

- [ ] **Step 1: Agregar schemas a `schemas.py`**

Buscar `class QuoteRead` y agregar después de su `updated_at: datetime`:

```python
class BusinessProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    business_name: str | None = None
    business_slogan: str | None = None
    business_logo_path: str | None = None
    business_logo_url: str | None = None  # resuelto en la route
    business_email: str | None = None
    business_phone: str | None = None
    updated_at: datetime | None = None


class BusinessProfileWrite(BaseModel):
    business_name: str | None = Field(default=None, max_length=120)
    business_slogan: str | None = Field(default=None, max_length=160)
    business_logo_path: str | None = None
    clear_logo: bool = False
    business_email: str | None = Field(default=None, max_length=160)
    business_phone: str | None = Field(default=None, max_length=40)
```

- [ ] **Step 2: Crear `backend/app/routes/business_profile.py`**

```python
"""Perfil de empresa singleton — branding default reusable en cada Quote nuevo."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import BusinessProfile
from ..schemas import BusinessProfileRead, BusinessProfileWrite

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _logo_url(path: str | None) -> str | None:
    if not path:
        return None
    normalized = path.replace("\\", "/")
    if normalized.startswith("storage/"):
        return "/" + normalized
    return normalized


def _serialize(p: BusinessProfile) -> BusinessProfileRead:
    return BusinessProfileRead(
        business_name=p.business_name,
        business_slogan=p.business_slogan,
        business_logo_path=p.business_logo_path,
        business_logo_url=_logo_url(p.business_logo_path),
        business_email=p.business_email,
        business_phone=p.business_phone,
        updated_at=p.updated_at,
    )


@router.get("", response_model=BusinessProfileRead | None)
def get_profile(db: Session = Depends(get_db)) -> BusinessProfileRead | None:
    p = db.get(BusinessProfile, 1)
    if p is None:
        return None
    return _serialize(p)


@router.put("", response_model=BusinessProfileRead)
def upsert_profile(
    payload: BusinessProfileWrite, db: Session = Depends(get_db)
) -> BusinessProfileRead:
    p = db.get(BusinessProfile, 1)
    if p is None:
        p = BusinessProfile(id=1)
        db.add(p)

    data = payload.model_dump(exclude_unset=True)
    clear_logo = data.pop("clear_logo", False)
    if clear_logo:
        p.business_logo_path = None
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip() or None
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _serialize(p)
```

- [ ] **Step 3: Registrar el router en `main.py`**

Buscar el bloque `app.include_router(...)` y agregar (manteniendo orden alfabético-ish):

```python
from .routes import business_profile  # al tope con los demás imports de routes
# ...
app.include_router(business_profile.router, prefix="/api/business-profile", tags=["business-profile"])
```

- [ ] **Step 4: Reiniciar backend y verificar endpoints**

```bash
docker compose -f /home/moura/Repos/catalog_3d_automated/docker-compose.yml restart backend
# GET vacío inicial:
curl -s http://localhost:8000/api/business-profile
# Expected: "null"

# Upsert:
curl -s -X PUT http://localhost:8000/api/business-profile \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Mi Marca","business_email":"hola@mimarca.com"}'
# Expected: JSON con los campos + updated_at

# GET después del upsert:
curl -s http://localhost:8000/api/business-profile
# Expected: el mismo JSON
```

- [ ] **Step 5: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/backend
git add app/schemas.py app/routes/business_profile.py app/main.py
git commit -m "feat(orcamento): endpoints GET/PUT /api/business-profile"
```

## Task A3: Frontend API client + tipos

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Agregar tipos en `types.ts`**

Al final del archivo, después del último `export interface`:

```typescript
export interface BusinessProfile {
  business_name: string | null;
  business_slogan: string | null;
  business_logo_path: string | null;
  business_logo_url: string | null;
  business_email: string | null;
  business_phone: string | null;
  updated_at: string | null;
}

export interface BusinessProfileWritePayload {
  business_name?: string | null;
  business_slogan?: string | null;
  business_logo_path?: string | null;
  clear_logo?: boolean;
  business_email?: string | null;
  business_phone?: string | null;
}
```

- [ ] **Step 2: Agregar funciones de API en `client.ts`**

Buscar la sección de quotes (cerca de `getQuotes`, `createQuote`) y agregar al lado:

```typescript
export function getBusinessProfile(): Promise<BusinessProfile | null> {
  return request<BusinessProfile | null>(`/api/business-profile`);
}

export function putBusinessProfile(
  payload: BusinessProfileWritePayload,
): Promise<BusinessProfile> {
  return request<BusinessProfile>(`/api/business-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

Y agregar al import del top: `BusinessProfile, BusinessProfileWritePayload`.

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend
npx tsc -b --noEmit
```

Expected: sin errores. Si hay errores de import, ajustarlos.

- [ ] **Step 4: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend
git add src/types.ts src/api/client.ts
git commit -m "feat(orcamento): API client para business-profile"
```

## Task A4: `OrcamentoPage` autofill + botón "Guardar como datos por defecto"

**Files:**
- Modify: `frontend/src/admin/orcamento/OrcamentoPage.tsx`
- Modify: `frontend/src/admin/orcamento/orcamento.css` (estilo del botón secundario y hint)

- [ ] **Step 1: Importar las funciones nuevas y el tipo**

En el header de imports de `OrcamentoPage.tsx` agregar:

```typescript
import {
  // ...existentes...
  getBusinessProfile,
  putBusinessProfile,
} from "../../api/client";
import type {
  // ...existentes...
  BusinessProfile,
  BusinessProfileWritePayload,
} from "../../types";
```

- [ ] **Step 2: Agregar state `profile` y cargarlo**

Dentro del componente, junto a los demás `useState`:

```typescript
const [profile, setProfile] = useState<BusinessProfile | null>(null);
const [savingProfile, setSavingProfile] = useState(false);
const [profileMsg, setProfileMsg] = useState<string | null>(null);
```

Y dentro del `useEffect` inicial (donde ya está `getQuotes`):

```typescript
useEffect(() => {
  void getQuotes().then(setQuotes).catch(() => {});
  void getBusinessProfile().then(setProfile).catch(() => {});
}, []);
```

- [ ] **Step 3: Usar el profile como default en `emptyDraft()`**

Cambiar la función `emptyDraft` (que hoy es una función helper sin args) por una closure que cierre sobre `profile`. Más fácil: dejarla como está y modificar `startNew` para que aplique el profile encima:

Reemplazar `startNew`:

```typescript
const startNew = () => {
  setEditing(null);
  const base = emptyDraft();
  if (profile) {
    base.business_name = profile.business_name ?? "";
    base.business_slogan = profile.business_slogan;
    base.business_logo_url = profile.business_logo_url;
    base.business_email = profile.business_email;
    base.business_phone = profile.business_phone;
  }
  setDraft(base);
  setLogoPath(profile?.business_logo_path ?? null);
  setError(null);
};
```

Y también el `useState` inicial del `draft` (que hoy llama `emptyDraft()`): mover a un `useEffect` que dispare `startNew()` cuando `profile` cambie y no haya `editing`:

```typescript
useEffect(() => {
  if (!editing) startNew();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile]);
```

- [ ] **Step 4: Handler "Guardar como datos por defecto"**

Agregar la función dentro del componente:

```typescript
const handleSaveAsDefault = async () => {
  setSavingProfile(true);
  setProfileMsg(null);
  try {
    const payload: BusinessProfileWritePayload = {
      business_name: draft.business_name || null,
      business_slogan: draft.business_slogan,
      business_logo_path: logoPath,
      clear_logo: logoPath === null,
      business_email: draft.business_email,
      business_phone: draft.business_phone,
    };
    const saved = await putBusinessProfile(payload);
    setProfile(saved);
    setProfileMsg("Guardado. Se usará como default en los próximos.");
  } catch (err) {
    setProfileMsg(
      err instanceof Error ? err.message : "Error al guardar el perfil",
    );
  } finally {
    setSavingProfile(false);
    window.setTimeout(() => setProfileMsg(null), 4000);
  }
};
```

- [ ] **Step 5: Renderizar el botón y el hint en el bloque "Tu empresa"**

En el JSX, dentro de la sección `<h3>Tu empresa</h3>`, **inmediatamente debajo del `<h3>`** agregar:

```tsx
<div className="orc__profile-row">
  <button
    type="button"
    className="btn-ghost btn-ghost--sm"
    onClick={handleSaveAsDefault}
    disabled={savingProfile || !draft.business_name.trim()}
    title="Guarda estos datos como default para los próximos presupuestos"
  >
    {savingProfile ? "Guardando…" : "Guardar como datos por defecto"}
  </button>
  {profileMsg ? <span className="orc__profile-msg">{profileMsg}</span> : null}
  {!profile && !profileMsg ? (
    <span className="orc__profile-hint">
      Llená tu marca una vez y la reusás en cada presupuesto.
    </span>
  ) : null}
</div>
```

- [ ] **Step 6: Estilos en `orcamento.css`**

Agregar al final del archivo:

```css
.orc__profile-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.orc__profile-msg {
  font-size: 0.85em;
  color: #2c7a3d;
}
.orc__profile-hint {
  font-size: 0.85em;
  color: var(--text-muted, #888);
}
.btn-ghost--sm {
  padding: 4px 12px;
  font-size: 0.85em;
}
```

- [ ] **Step 7: Verificar manualmente en el browser**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npm run dev
```

1. Abrir `/admin` → tab Orçamento.
2. Apretar "+ Nuevo". Llenar empresa: "Mi Marca", email, teléfono. Subir un logo.
3. Apretar **"Guardar como datos por defecto"**. Ver mensaje verde "Guardado…".
4. Apretar "+ Nuevo" de nuevo (descartando los cambios). Esperado: el bloque "Tu empresa" arranca con los datos guardados y el logo.
5. Recargar la página. Apretar "+ Nuevo". Esperado: los datos siguen ahí (vinieron del backend).
6. Si no hay profile (empty DB), el hint "Llená tu marca una vez…" debe aparecer.

- [ ] **Step 8: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend
git add src/admin/orcamento/OrcamentoPage.tsx src/admin/orcamento/orcamento.css
git commit -m "feat(orcamento): perfil de empresa default + autofill al crear quote"
```

---

# Fase B — ContactPicker en el quote

## Task B1: Backend — columna `Quote.client_contact_id` + schemas

**Files:**
- Modify: `backend/app/models.py` (clase `Quote`)
- Modify: `backend/app/db.py:_ensure_legacy_columns()`
- Modify: `backend/app/schemas.py` (`QuoteCreate`, `QuoteUpdate`, `QuoteRead`)
- Modify: `backend/app/routes/quotes.py:_serialize, create_quote` (persistir el campo)

- [ ] **Step 1: Agregar columna al modelo `Quote`**

En `models.py`, dentro de `class Quote(Base)`, agregar (después de `client_phone`):

```python
client_contact_id: Mapped[int | None] = mapped_column(
    ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True,
)
```

Verificar que `ForeignKey` está importado al tope del archivo (debería estarlo — lo usan otros modelos).

- [ ] **Step 2: Migración aditiva en `db.py`**

Buscar `_ensure_legacy_columns()` y agregar al array `statements`:

```python
# Quote: link opcional al Contact (Item — Orçamento integraciones).
"ALTER TABLE quotes ADD COLUMN client_contact_id INTEGER REFERENCES contacts(id)",
```

- [ ] **Step 3: Extender schemas**

En `schemas.py`:

```python
# Dentro de QuoteCreate, agregar después de client_phone:
client_contact_id: int | None = None

# Dentro de QuoteUpdate, agregar después de client_phone:
client_contact_id: int | None = None
clear_client_contact: bool = False

# Dentro de QuoteRead, agregar después de client_phone:
client_contact_id: int | None = None
```

- [ ] **Step 4: Persistir en `create_quote` y `_serialize`**

En `routes/quotes.py`:

En `_serialize`, agregar el nuevo campo al `QuoteRead(...)`:

```python
client_contact_id=quote.client_contact_id,
```

En `create_quote`, agregar al constructor de `Quote(...)`:

```python
client_contact_id=payload.client_contact_id,
```

En `update_quote`, el loop `setattr` ya cubre el campo automáticamente, **pero** hay que manejar `clear_client_contact`. Agregar después del bloque `clear_logo`:

```python
clear_client_contact = data.pop("clear_client_contact", False)
if clear_client_contact:
    quote.client_contact_id = None
```

- [ ] **Step 5: Restart backend + verificar**

```bash
docker compose -f /home/moura/Repos/catalog_3d_automated/docker-compose.yml restart backend
sqlite3 /home/moura/Repos/catalog_3d_automated/backend/catalog.db "PRAGMA table_info(quotes);" | grep client_contact_id
# Expected: una línea mostrando la columna nueva

# Test endpoint:
curl -s -X POST http://localhost:8000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{"business_name":"T","client_name":"X","client_contact_id":1,"items":[]}' \
  | python3 -m json.tool | grep client_contact_id
# Expected: "client_contact_id": 1
```

(Si el contact id 1 no existe en `contacts`, FK no se valida en SQLite y persiste el número de todos modos; en Postgres dará FK error y hay que probar con un id real — listar `curl /api/cash/contacts | head` para encontrar uno.)

- [ ] **Step 6: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/backend
git add app/models.py app/db.py app/schemas.py app/routes/quotes.py
git commit -m "feat(orcamento): columna Quote.client_contact_id (FK Contact)"
```

## Task B2: Frontend types + payloads

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Extender los tipos relacionados al Quote**

En `types.ts`, buscar las interfaces `Quote`, `QuoteCreatePayload`, `QuoteUpdatePayload` y agregar el campo:

```typescript
// En Quote (después de client_phone):
client_contact_id: number | null;

// En QuoteCreatePayload (después de client_phone):
client_contact_id?: number | null;

// En QuoteUpdatePayload (después de client_phone):
client_contact_id?: number | null;
clear_client_contact?: boolean;
```

También en `QuoteDraft` (definido en `frontend/src/admin/orcamento/QuotePreview.tsx`) si tiene fields explícitos de cliente — verificar y agregar `client_contact_id?: number | null;`.

- [ ] **Step 2: Verificar compilación**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npx tsc -b --noEmit
```

Expected: sin errores. Si hay errores en `OrcamentoPage` porque `fromQuote` no copia el campo, agregar `client_contact_id: q.client_contact_id` ahí mismo.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/admin/orcamento/QuotePreview.tsx
git commit -m "feat(orcamento): client_contact_id en tipos del frontend"
```

## Task B3: `ContactPicker` en el form del quote

**Files:**
- Modify: `frontend/src/admin/orcamento/OrcamentoPage.tsx`

- [ ] **Step 1: Importar `ContactPicker` y `getContacts`**

```typescript
import { ContactPicker, type PersonValue } from "../caja/ContactPicker";
import { getContacts } from "../../api/client";
import type { Contact } from "../../types";
```

- [ ] **Step 2: State para `contacts` y cargarlos**

```typescript
const [contacts, setContacts] = useState<Contact[]>([]);

useEffect(() => {
  void getContacts().then(setContacts).catch(() => {});
}, []);
```

- [ ] **Step 3: Computar el `PersonValue` actual desde el draft**

`PersonValue` (verificado en `ContactPicker.tsx`) es `{ contactId: number | null; personLabel: string }`.

Justo antes del `return`:

```typescript
const personValue: PersonValue = {
  contactId: draft.client_contact_id ?? null,
  personLabel: draft.client_name || "",
};

const handlePersonChange = (val: PersonValue) => {
  const contact = val.contactId
    ? contacts.find((c) => c.id === val.contactId)
    : null;
  patch({
    client_contact_id: val.contactId,
    client_name: contact?.name ?? val.personLabel ?? draft.client_name,
    client_email: contact?.email ?? draft.client_email,
    client_phone: contact?.phone ?? draft.client_phone,
  });
};
```

- [ ] **Step 4: Renderizar el picker arriba del bloque cliente**

En el JSX, dentro de la sección `<h3>Cliente</h3>`, **inmediatamente debajo del `<h3>`**, antes del `<div className="form-grid">`:

```tsx
<div className="orc__contact-picker-row">
  <label className="field field--full">
    Elegir cliente existente
    <ContactPicker
      contacts={contacts}
      value={personValue}
      onChange={handlePersonChange}
    />
  </label>
</div>
```

- [ ] **Step 5: Agregar estilo si hace falta**

En `orcamento.css`:

```css
.orc__contact-picker-row {
  margin-bottom: 12px;
}
```

- [ ] **Step 6: Verificar manualmente**

1. Crear un Contact en el tab Clientes con nombre, email, teléfono.
2. Ir a Orçamento → "+ Nuevo".
3. En el bloque Cliente, abrir el picker, elegir el contacto.
4. Esperado: los 3 campos (nombre, email, teléfono) se autocompletan.
5. Guardar el quote. Re-abrirlo desde "Recientes". Esperado: el picker arranca con el contacto seleccionado.
6. Cambiar a otro contacto. Esperado: los 3 campos se actualizan al nuevo contacto.
7. Limpiar el picker (si lo soporta). Esperado: los campos quedan como están (o se pueden tipear a mano).

- [ ] **Step 7: Commit**

```bash
git add src/admin/orcamento/OrcamentoPage.tsx src/admin/orcamento/orcamento.css
git commit -m "feat(orcamento): ContactPicker para precargar cliente en el quote"
```

---

# Fase C — Orçamento → Pedido

## Task C1: Backend — columna `Order.quote_id` + campo derivado `linked_order_id`

**Files:**
- Modify: `backend/app/models.py` (clase `Order`)
- Modify: `backend/app/db.py:_ensure_legacy_columns()`
- Modify: `backend/app/schemas.py` (`OrderCreate`, `OrderRead`, `QuoteRead`)
- Modify: `backend/app/routes/orders.py:create_order` (persistir quote_id)
- Modify: `backend/app/routes/quotes.py:_serialize` (computar `linked_order_id`)

- [ ] **Step 1: Agregar columna al modelo `Order`**

En `models.py`, dentro de `class Order(Base)`:

```python
quote_id: Mapped[int | None] = mapped_column(
    ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True, index=True,
)
```

- [ ] **Step 2: Migración aditiva en `db.py`**

```python
"ALTER TABLE orders ADD COLUMN quote_id INTEGER REFERENCES quotes(id)",
```

- [ ] **Step 3: Extender schemas**

```python
# En OrderCreate, después de is_draft:
quote_id: int | None = None

# En OrderRead, después de is_draft:
quote_id: int | None = None

# En QuoteRead, al final:
linked_order_id: int | None = None
```

- [ ] **Step 4: Persistir `quote_id` al crear orden**

En `routes/orders.py`, buscar el handler `create_order` (o equivalente, donde se construye `Order(...)`). Agregar al constructor:

```python
quote_id=payload.quote_id,
```

Y en `OrderRead`, asegurar que `quote_id` se devuelve (puede ser automático si la conversión usa `model_config = ConfigDict(from_attributes=True)`, pero si hay un `_serialize_order` explícito, agregar `quote_id=order.quote_id`).

- [ ] **Step 5: Computar `linked_order_id` en `quotes.py:_serialize`**

Cambiar la firma:

```python
def _serialize(quote: Quote, db: Session | None = None) -> QuoteRead:
    linked_order_id: int | None = None
    if db is not None:
        from ..models import Order  # import local para evitar ciclo
        linked_order_id = db.scalar(
            select(Order.id).where(Order.quote_id == quote.id).limit(1)
        )
    items_raw = json.loads(quote.items_json or "[]")
    items = [QuoteItem(**i) for i in items_raw]
    return QuoteRead(
        # ...todos los existentes...
        client_contact_id=quote.client_contact_id,
        linked_order_id=linked_order_id,
    )
```

Y pasar `db` en cada call site del archivo:
- `list_quotes`: `[_serialize(q, db) for q in db.scalars(stmt)]`
- `get_quote`: `return _serialize(quote, db)`
- `create_quote`: `return _serialize(quote, db)` (al crear será siempre None)
- `update_quote`: `return _serialize(quote, db)`
- `get_public`: `return _serialize(quote, db)` (público también lo expone — útil si en el futuro mostramos "ya aceptado" en la vista pública)

Si el `Order` ya está importado al tope del archivo, no hace falta el import local.

- [ ] **Step 6: Restart + verificar**

```bash
docker compose -f /home/moura/Repos/catalog_3d_automated/docker-compose.yml restart backend
sqlite3 /home/moura/Repos/catalog_3d_automated/backend/catalog.db "PRAGMA table_info(orders);" | grep quote_id
# Expected: línea con la columna nueva

# Verificar linked_order_id en quote sin pedido:
curl -s http://localhost:8000/api/quotes | python3 -m json.tool | grep linked_order_id | head -1
# Expected: "linked_order_id": null

# Crear order vinculado:
QID=$(curl -s http://localhost:8000/api/quotes | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
curl -s -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"catalog_item_id\":1,\"quantity\":1,\"value\":100,\"quote_id\":$QID}"
# (catalog_item_id 1 puede no existir — usar uno real de /api/catalog si hace falta)

curl -s "http://localhost:8000/api/quotes/$QID" | python3 -m json.tool | grep linked_order_id
# Expected: "linked_order_id": <algún número>
```

- [ ] **Step 7: Commit**

```bash
cd /home/moura/Repos/catalog_3d_automated/backend
git add app/models.py app/db.py app/schemas.py app/routes/orders.py app/routes/quotes.py
git commit -m "feat(orcamento): columna Order.quote_id + QuoteRead.linked_order_id derivado"
```

## Task C2: Frontend — extender `PendingQuote` y tipos `Quote`/`Order`

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Extender `PendingQuote` con campos opcionales del origen "quote"**

En `types.ts`, buscar la interface `PendingQuote` y agregar al final:

```typescript
  // Nuevos (Orçamento → Pedido). Si están presentes, el OrderForm los persiste.
  source_quote_id?: number;
  client_contact_id?: number;
  service_description?: string | null;
```

**Importante:** no cambiar `value`, `quantity`, `costItems` — el `OrderForm` actual ya los consume y son obligatorios. Para Quote → Order, el creador del payload tiene que mapear quote items a `costItems` y poner `quantity=1`, `value=total`.

- [ ] **Step 2: Extender `Quote` con `linked_order_id`**

```typescript
// En interface Quote, al final:
linked_order_id: number | null;
```

- [ ] **Step 3: Extender `Order` y `OrderCreatePayload` con `quote_id`**

Buscar `interface Order` en `types.ts` y agregar:

```typescript
quote_id: number | null;
```

Y en `frontend/src/api/client.ts`, buscar `export interface OrderCreatePayload` (≈ línea 473) y agregar antes del cierre `}`:

```typescript
  quote_id?: number | null;
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npx tsc -b --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts
git commit -m "feat(orcamento): tipos extendidos para Orcamento->Pedido bridge"
```

## Task C3: `AdminPage` pasa `onQuoteToOrder` a `OrcamentoPage`

**Files:**
- Modify: `frontend/src/admin/AdminPage.tsx`
- Modify: `frontend/src/admin/orcamento/OrcamentoPage.tsx` (firma + prop)

- [ ] **Step 1: Definir props en `OrcamentoPage`**

Al tope del componente, cambiar la signatura:

```typescript
interface OrcamentoPageProps {
  onQuoteToOrder?: (q: PendingQuote) => void;
}

export function OrcamentoPage({ onQuoteToOrder }: OrcamentoPageProps) {
  // ...
}
```

Importar el tipo:

```typescript
import type { PendingQuote } from "../../types";
```

- [ ] **Step 2: Wire desde `AdminPage`**

En `AdminPage.tsx`, buscar `<OrcamentoPage />` y cambiar:

```tsx
<OrcamentoPage onQuoteToOrder={handleQuoteToOrder} />
```

El handler `handleQuoteToOrder` ya existe en `AdminPage.tsx:79` y hace `setPendingQuote(q); setTab("pedidos")` — exactamente lo que necesitamos.

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npx tsc -b --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/AdminPage.tsx src/admin/orcamento/OrcamentoPage.tsx
git commit -m "feat(orcamento): wire onQuoteToOrder de AdminPage a OrcamentoPage"
```

## Task C4: Botón "Crear pedido con este presupuesto" + chip "Pedido vinculado"

**Files:**
- Modify: `frontend/src/admin/orcamento/OrcamentoPage.tsx`
- Modify: `frontend/src/admin/orcamento/orcamento.css`
- Modify: `frontend/src/admin/pedidos/OrderForm.tsx` (persistir quote_id si viene en pendingQuote)

- [ ] **Step 1: Handler "Crear pedido"**

Dentro del componente `OrcamentoPage`, agregar:

```typescript
const handleToOrder = () => {
  if (!editing) {
    setError("Guardá el presupuesto antes de convertir a pedido.");
    return;
  }
  if (!onQuoteToOrder) return;
  const total = editing.items.reduce(
    (s, it) => s + it.quantity * it.unit_price, 0,
  );
  const pendingQuote: PendingQuote = {
    value: total,
    quantity: 1,
    costItems: editing.items.map((it) => ({
      concept: it.description,
      amount: it.quantity * it.unit_price,
    })),
    source_quote_id: editing.id,
    client_contact_id: editing.client_contact_id ?? undefined,
    service_description: editing.service_description,
  };
  onQuoteToOrder(pendingQuote);
};
```

- [ ] **Step 2: Botón en la toolbar**

En el JSX, dentro de `<div className="orc__head-actions">`, dentro del bloque `{editing ? (...)}`, agregar (al lado de "Bajar PDF", antes de "Eliminar"):

```tsx
<button
  type="button"
  className="btn-primary"
  onClick={handleToOrder}
  disabled={!editing || (editing.linked_order_id != null)}
  title={
    editing?.linked_order_id != null
      ? "Este presupuesto ya tiene un pedido vinculado"
      : "Crear un pedido pre-cargado con los datos de este presupuesto"
  }
>
  Crear pedido
</button>
```

- [ ] **Step 3: Chip "Pedido vinculado #N"**

Justo arriba del bloque `<div className="orc__cols">` (después del `error-banner`), agregar:

```tsx
{editing?.linked_order_id != null ? (
  <div className="orc__linked-order">
    <span>✓ Pedido vinculado: #{editing.linked_order_id}</span>
    <button
      type="button"
      className="btn-ghost btn-ghost--sm"
      onClick={() => {
        // Hacky pero efectivo: dispara un evento custom que AdminPage captura.
        // Alternativa: agregar otra prop onJumpToOrder. Por simplicidad usamos location.
        const el = document.querySelector('[data-tab="pedidos"]');
        if (el instanceof HTMLElement) el.click();
      }}
    >
      Ver pedido →
    </button>
  </div>
) : null}
```

**Nota:** el handler "Ver pedido →" usa un selector `[data-tab="pedidos"]`. En `AdminPage.tsx`, en el botón del tab pedidos, agregar `data-tab="pedidos"`. Si preferís props limpias, agregá `onJumpToOrder?: (orderId: number) => void` y enrutalo igual que `onQuoteToOrder`.

- [ ] **Step 4: Estilo del chip**

En `orcamento.css`:

```css
.orc__linked-order {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: #e8f5e9;
  color: #1b5e20;
  border-radius: 6px;
  font-size: 0.9em;
}
```

- [ ] **Step 5: `OrderForm` persiste `quote_id` desde `pendingQuote` y autocompleta cliente/nota**

En `frontend/src/admin/pedidos/OrderForm.tsx`:

**5a.** Cuando llega un `pendingQuote` con `client_contact_id` o `service_description`, precargar el state. Modificar el `useEffect` existente (≈ línea 47):

```typescript
useEffect(() => {
  if (!pendingQuote) return;
  setValue(String(pendingQuote.value));
  setQuantity(Math.max(1, Math.floor(pendingQuote.quantity || 1)));
  setQuoteCosts(pendingQuote.costItems);
  // Nuevo: Orçamento → Pedido también precarga cliente y nota.
  if (pendingQuote.client_contact_id) {
    const c = contacts.find((x) => x.id === pendingQuote.client_contact_id);
    setPerson({
      contactId: pendingQuote.client_contact_id,
      personLabel: c?.name ?? "",
    });
  }
  if (pendingQuote.service_description) {
    setNote(pendingQuote.service_description);
  }
}, [pendingQuote, contacts]);
```

**5b.** En el handler de submit (≈ línea 91 `await onCreate({...})`), agregar al objeto:

```typescript
const created = await onCreate({
  catalog_item_id: catalogId,
  quantity,
  value: valueNum,
  note: note.trim() || null,
  contact_id: person.contactId,
  person_label:
    person.contactId === null ? person.personLabel.trim() || null : null,
  save_contact: true,
  priority,
  deadline: deadline || null,
  cost_items: quoteCosts ?? undefined,
  quote_id: pendingQuote?.source_quote_id ?? null,  // NUEVO
});
```

- [ ] **Step 6: Marcar `data-tab="pedidos"` en `AdminPage`**

En `AdminPage.tsx`, buscar el botón del tab pedidos (probablemente algo como `<button onClick={() => setTab("pedidos")}>`). Agregar:

```tsx
data-tab="pedidos"
```

- [ ] **Step 7: Verificar manualmente**

1. Crear un quote nuevo con cliente (vía ContactPicker) y 2 items.
2. Apretar **"Crear pedido"** en la toolbar. Esperado: cambia al tab Pedidos, OrderForm pre-cargado con cliente + cost items + total.
3. Guardar el pedido.
4. Volver al tab Orçamento, abrir el mismo quote desde "Recientes".
5. Esperado: chip verde "✓ Pedido vinculado: #N" arriba; botón "Crear pedido" deshabilitado.
6. Click en "Ver pedido →". Esperado: cambia al tab Pedidos.

- [ ] **Step 8: Commit**

```bash
git add src/admin/orcamento/OrcamentoPage.tsx \
        src/admin/orcamento/orcamento.css \
        src/admin/pedidos/OrderForm.tsx \
        src/admin/AdminPage.tsx
git commit -m "feat(orcamento): boton crear pedido + chip pedido vinculado"
```

---

# Fase D — Calculadora → Orçamento

## Task D1: Tipo `PendingQuoteDraft` + state en `AdminPage`

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/admin/AdminPage.tsx`

- [ ] **Step 1: Definir `PendingQuoteDraft`**

En `types.ts`, después de `PendingQuote`:

```typescript
/** Snapshot que la Calculadora le pasa al Orcamento para precargar 1 item. */
export interface PendingQuoteDraft {
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  client_contact_id?: number;
}
```

- [ ] **Step 2: State + handler en `AdminPage`**

En `AdminPage.tsx`, agregar al import del top el nuevo tipo. Junto al `pendingQuote`:

```typescript
const [pendingQuoteDraft, setPendingQuoteDraft] = useState<PendingQuoteDraft | null>(null);

const handleCalcToQuote = useCallback((draft: PendingQuoteDraft) => {
  setPendingQuoteDraft(draft);
  setTab("orcamento");
}, []);
```

- [ ] **Step 3: Pasar las props a `OrcamentoPage`**

En el render, cambiar:

```tsx
<OrcamentoPage
  onQuoteToOrder={handleQuoteToOrder}
  pendingQuoteDraft={pendingQuoteDraft}
  onPendingQuoteDraftConsumed={() => setPendingQuoteDraft(null)}
/>
```

- [ ] **Step 4: Verificar compilación**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npx tsc -b --noEmit
```

Esperado: errores sobre `OrcamentoPage` no aceptando las nuevas props — se resuelven en Task D2.

- [ ] **Step 5: Commit (parcial — compila después de D2)**

Esperar a hacer commit hasta D2 para evitar un commit con build roto. Marcar mentalmente como WIP y seguir.

## Task D2: `OrcamentoPage` consume `pendingQuoteDraft`

**Files:**
- Modify: `frontend/src/admin/orcamento/OrcamentoPage.tsx`

- [ ] **Step 1: Extender props**

```typescript
interface OrcamentoPageProps {
  onQuoteToOrder?: (q: PendingQuote) => void;
  pendingQuoteDraft?: PendingQuoteDraft | null;
  onPendingQuoteDraftConsumed?: () => void;
}

export function OrcamentoPage({
  onQuoteToOrder,
  pendingQuoteDraft,
  onPendingQuoteDraftConsumed,
}: OrcamentoPageProps) {
  // ...
}
```

Importar `PendingQuoteDraft` del `../../types`.

- [ ] **Step 2: Effect que consume el draft**

Junto a los demás `useEffect`:

```typescript
useEffect(() => {
  if (!pendingQuoteDraft) return;
  // Arrancar un nuevo quote (limpia editing + draft defaults).
  startNew();
  // Aplicar lo que vino de la calc.
  const contact = pendingQuoteDraft.client_contact_id
    ? contacts.find((c) => c.id === pendingQuoteDraft.client_contact_id)
    : null;
  patch({
    items: pendingQuoteDraft.items,
    client_contact_id: pendingQuoteDraft.client_contact_id ?? null,
    client_name: contact?.name ?? draft.client_name,
    client_email: contact?.email ?? draft.client_email,
    client_phone: contact?.phone ?? draft.client_phone,
  });
  onPendingQuoteDraftConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [pendingQuoteDraft, contacts]);
```

**Por qué `[pendingQuoteDraft, contacts]`:** si el draft llega antes de que `contacts` se cargue, el contacto no se resuelve. Esperar a tener ambos.

- [ ] **Step 3: Verificar compilación**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npx tsc -b --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit conjunto de D1 + D2**

```bash
git add src/types.ts src/admin/AdminPage.tsx src/admin/orcamento/OrcamentoPage.tsx
git commit -m "feat(orcamento): bridge PendingQuoteDraft (Calc -> Orcamento)"
```

## Task D3: Botón "Crear presupuesto" en `CalculadoraPage`

**Files:**
- Modify: `frontend/src/admin/calculadora/CalculadoraPage.tsx`

**Estado actual del componente (verificado en `CalculadoraPage.tsx`):**
- Signatura: `export function CalculadoraPage({ onCreateOrder, onNavigate }: Props)` (línea 48). El tipo `Props` ya incluye `onCreateOrder: (quote: PendingQuote) => void` y `onNavigate`.
- State relevante: `quantity` (línea 54), `piece.pieceName` (nombre del producto, línea 315), `charge` (total final con override, línea 172).
- Botón existente "Crear pedido con esta cotización →" en línea 920, dispara `handleCreateOrder` (línea 242).
- **No hay ContactPicker en la Calc** — por lo tanto `client_contact_id` del draft se omite.

- [ ] **Step 1: Aceptar la prop nueva en `CalculadoraPage`**

Buscar la interface `Props` arriba del componente (≈ línea 30) y agregar:

```typescript
onCreateQuoteDraft?: (draft: PendingQuoteDraft) => void;
```

Importar el tipo: en el import existente desde `../../types`, agregar `PendingQuoteDraft`.

Y en la destructuración:

```typescript
export function CalculadoraPage({ onCreateOrder, onNavigate, onCreateQuoteDraft }: Props) {
```

- [ ] **Step 2: Pasar la prop desde `AdminPage`**

En `AdminPage.tsx`, en el render del tab calculadora:

```tsx
<CalculadoraPage
  onCreateOrder={handleQuoteToOrder}
  onNavigate={/* lo que ya pasa */}
  onCreateQuoteDraft={handleCalcToQuote}
/>
```

(Mantener los args existentes — solo agregar `onCreateQuoteDraft`.)

- [ ] **Step 3: Handler en `CalculadoraPage`**

Junto a `handleCreateOrder` (línea 242), agregar:

```typescript
const handleCreateQuoteDraft = () => {
  if (!onCreateQuoteDraft || charge <= 0) return;
  const description = piece.pieceName?.trim() || "Cotización 3D";
  onCreateQuoteDraft({
    items: [{ description, quantity: 1, unit_price: charge }],
  });
};
```

(Sin `client_contact_id` porque la Calc no tiene picker. El precio es el `charge` final — ya incluye el override si lo hay.)

- [ ] **Step 4: Botón "Crear presupuesto" al lado del existente "Crear pedido"**

En el JSX, justo antes del botón "Crear pedido con esta cotización →" (≈ línea 919), agregar:

```tsx
<button
  type="button"
  className="btn btn--secondary"
  onClick={handleCreateQuoteDraft}
  disabled={charge <= 0}
  title="Mandar este total al Generador de Presupuestos"
>
  Crear presupuesto →
</button>
```

(Usar `btn--secondary` si existe en `calc.css` — sino caer en `btn--ghost` o crear un estilo. Verificar las clases existentes para mantener consistencia visual.)

- [ ] **Step 5: Verificar manualmente**

1. Ir a Calculadora. Llenar datos → ver un total.
2. (Opcional) Elegir un cliente si el `ContactPicker` existe en la calc.
3. Apretar **"Crear presupuesto"**. Esperado: cambia al tab Orçamento.
4. Esperado: form en modo nuevo con 1 item (descripción "Cotización 3D" o el nombre tipeado, qty 1, unit_price = total).
5. Esperado: branding precargado del `BusinessProfile` (de Fase A); cliente precargado si se eligió uno en la calc.
6. Guardar el quote. Verificar que el PDF tiene el item correcto.

- [ ] **Step 6: Commit**

```bash
git add src/admin/calculadora/CalculadoraPage.tsx src/admin/AdminPage.tsx
git commit -m "feat(orcamento): boton 'Crear presupuesto' en la calculadora"
```

---

# Verificación final (acceptance tests del spec)

Correr los 5 escenarios del spec section 6, en orden, sobre una DB limpia o sobre el estado actual:

- [ ] **1. Branding default:** crear quote A → llenar empresa → "Guardar como default". Crear quote B → 5 campos arrancan con valores de A. Editar en B → guardar B → quote A no cambia (snapshot inmutable).

- [ ] **2. ContactPicker:** crear contacto en Clientes → en Orçamento elegirlo en picker → 3 campos autocompletan. Guardar → re-abrir → picker arranca seleccionado.

- [ ] **3. Quote → Pedido:** quote con contacto + 2 items → "Crear pedido" → tab Pedidos con form pre-cargado (cliente + 2 cost items + total). Guardar pedido → volver al quote → chip "Pedido vinculado #N" + botón "Crear pedido" deshabilitado.

- [ ] **4. Calc → Quote:** cotizar en calc → "Crear presupuesto" → tab Orçamento con 1 item (descripción, qty 1, unit_price=total) + branding del perfil pre-cargado.

- [ ] **5. Back-compat:** quote viejo (sin `client_contact_id`) abre sin romper. Pedido viejo (sin `quote_id`) abre sin romper. Si hay quotes pre-existentes en la DB, abrir 1 y verificar que renderiza el preview y baja el PDF como antes.

- [ ] **Build de producción del frontend**

```bash
cd /home/moura/Repos/catalog_3d_automated/frontend && npm run build
```

Expected: build limpio sin errores de TypeScript.

- [ ] **Tag final (opcional)**

Si todo pasa, marcar el milestone con un commit empty:

```bash
git commit --allow-empty -m "milestone(orcamento): 4 integraciones cerradas (A+B+C+D)"
```
