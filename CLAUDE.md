# Catálogo 3D Automatizado — Guía para agentes

Este archivo se carga automáticamente al inicio de cada sesión. Es el **índice
central**: no duplica los docs, apunta a las fuentes de verdad que sí se
mantienen vivas. Antes de tocar código, consultá el doc relevante de abajo.

## Qué es

Herramienta full-stack: toma una URL de MakerWorld, extrae nombre + imágenes,
re-estiliza con Gemini ("nano-banana"), y arma un catálogo + back-office
comercial (caja, pedidos, clientes, presupuestos, producción) con un asistente
conversacional ("Gerente Bot").

## Fuentes de verdad — consultar SIEMPRE antes de tocar

| Doc | Cuándo leerlo |
|---|---|
| **FEATURES.md** | Qué features existen y cómo funcionan. Catálogo, comercial, operación, herramientas, acceso público. Tiene índice + inventario rápido al final. |
| **gerente_bot.md** | Todo lo del chatbot: tools, system prompt, snapshot, briefing, flujos de confirmación, UI, limitaciones, changelog. |
| **brand-identity.md** | Identidad visual y design system **Aura3D** (tokens, tipografía, color, temas). Doc vivo: se sincroniza con `frontend/src/styles.css`. |
| **README.md** | Setup dev (Docker + Vite) y prod (Railway). Variables de entorno, BD. |
| **CodeGraph** (MCP `codegraph_*`) | Preguntas estructurales: quién llama a qué, dónde se define X, impacto de un cambio. No grepear para esto. |

## Reglas duras del proyecto

- **No commitear sin pedido explícito.** El usuario pushea por su cuenta.
- **Cualquier cambio en el chatbot ⇒ actualizar `gerente_bot.md`** (sección
  correspondiente **y** entrada en el Changelog) en el **mismo commit**. Si no,
  el doc se desincroniza y deja de ser fuente de verdad.
- **Cualquier feature importante nueva ⇒ registrarla en `FEATURES.md`** con el
  formato del final del archivo (es un "documento vivo").
- **Migraciones aditivas**, vía `_ensure_legacy_columns()` en
  `backend/app/db.py`. **No hay Alembic.**
- **Multi-tenant: el aislamiento es automático, NO se filtra a mano.**
  `backend/app/tenancy.py` es la fuente de verdad: un `ContextVar` con el tenant
  + listeners `do_orm_execute` (filtra lecturas) y `before_flush` (estampa
  `tenant_id` en escrituras y **lanza error** si no hay tenant en contexto). No
  agregues `.where(tenant_id == …)` en las rutas: alcanza con que el tenant esté
  en contexto (lo fija `auth.py:resolve_request_context` desde el JWT, el
  subdominio o el token). Tablas nuevas tenant-owned ⇒ sumales `tenant_id` (FK a
  `tenants`, `ondelete CASCADE`) **y** su nombre de tabla a `TENANT_SCOPED_TABLES`
  en `tenancy.py` + columna/índice/backfill en `db.py:init_db`. Excepciones que
  NO se scopean: `Category` (global), `Tenant`, `User`. Para lookups previos a
  conocer el tenant (slug/token/login/seeds) usá `unscoped()`.
- **Colas de producción (runs/builds/jobs)** = stacks verticales full-width con
  info densa, no grids horizontales; los toggles deben mostrar resumen real.

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Postgres (prod) / SQLite (dev default).
- **Frontend**: React 18.3, TypeScript, Vite, react-router-dom.
- **Servicios externos**: Gemini (re-estilización de imágenes), FAL (Flux
  Kontext + Trellis 3D), Playwright (scraping + render PDF).
- **Dev**: Docker (Postgres + backend) + Vite. **Prod**: Railway (Dockerfile
  propio + Postgres gestionado; el `docker-compose.yml` es **solo dev**).

## Dónde está cada cosa

**Backend** (`backend/app/`):
- `main.py` arranque · `config.py` settings · `db.py` engine + migraciones aditivas
- `models.py` ORM · `schemas.py` Pydantic · `auth.py` admin login
- `routes/` — un router por dominio: `catalog`, `orders`, `quotes`,
  `catalog_quotes`, `cash`, `materials`, `printers`, `production`,
  `jobs`, `categories`, `business_profile`, `public`, `assistant`
- `services/` — `pipeline.py` (orquesta scrape→imagen), `scraper.py`,
  `image_service.py`, y `assistant/` (chatbot: `engine`, `prompts`,
  `snapshot`, `tools`, `confirmations`)

**Frontend** (`frontend/src/`): `admin/` (back-office), `showcase/` (catálogo
público), `assistant/` (UI del bot), `components/`, `hooks/`, `api/`, `types.ts`.

## Agentes disponibles (`.agents/agents/`)

Subagentes especializados de este proyecto. Los **auditores** son READ-ONLY:
analizan y reportan por criticidad, **no** escriben código (el usuario decide
qué aplicar y se lo pasa al implementador).

| Agente | Rol | Cuándo invocarlo |
|---|---|---|
| **frontend-react-architect** | Implementa | Crear/mejorar/auditar frontend React: componentes, estado, hooks, performance, accesibilidad, estilos (CSS plano + tokens `:root` + BEM). |
| **wow-ux-architect** | Audita + implementa | Identidad visual (design system **Aura3D**), jerarquía, micro-interacciones y efecto WOW del frontend (DMMT como biblia). Handoff obligatorio al `mobile-ux-audit-agent`. |
| **mobile-ux-audit-agent** | Audita (READ-ONLY) | UX mobile: thumb zone, touch targets, teclado, viewport/safe-areas, flujos públicos del cliente (`/c/:token`, `/q/:token`) y back-office en tablet. |
| **database-audit-agent** | Audita (READ-ONLY) | Capa de datos: esquema + migraciones aditivas (`_ensure_*`), patrones de query, seguridad DB. Sin Alembic. |
| **security-scale-audit-agent** | Audita (READ-ONLY) | Seguridad y escala app-level: auth (Basic + tokens), secretos (`VITE_*`), CORS/headers, IA & costo del asistente, escalabilidad. |

## Memoria persistente (cómo NO perder contexto entre sesiones)

- **Auto-memoria** (`~/.claude/.../memory/`): hechos atómicos que el agente
  escribe entre conversaciones (correcciones, preferencias, decisiones). Se
  carga sola vía su índice `MEMORY.md`. La mantiene el agente, no el usuario.
- **Este `CLAUDE.md`**: índice + reglas. Cambia poco.
- **Docs vivos** (`FEATURES.md`, `gerente_bot.md`): se actualizan en el mismo
  commit que el código que documentan.
