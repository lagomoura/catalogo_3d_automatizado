# Catálogo 3D Automatizado

Herramienta full-stack que toma una URL de MakerWorld, extrae el nombre del modelo y N imágenes de la galería, re-estiliza cada imagen con Gemini 2.5 Flash Image ("nano-banana") aplicando un prompt de identidad visual, y arma un catálogo de productos consultable desde una UI web.

- **Backend:** Python + FastAPI + Postgres + Playwright + `google-genai`
- **Frontend:** React + TypeScript + Vite

## Ambientes

- **Desarrollo** → todo local en Docker (Postgres + backend) + frontend con Vite. Ver instrucciones abajo.
- **Producción** → deploy en Railway con su propio Dockerfile y Postgres gestionado. Las vars sensibles viven en el dashboard de Railway. El `docker-compose.yml` del repo es **solo dev**; Railway no lo usa.

## Setup — Desarrollo

### 1. Backend (en Docker)

Requisitos: Docker Desktop / Docker Engine con `docker compose` v2.

Crea `backend/.env` copiando `backend/.env.example` y pega tu API key de Gemini (otras vars opcionales: `FAL_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`):

```
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash-image
```

Obtén una API key en https://aistudio.google.com/apikey.

> No necesitás definir `DATABASE_URL` en `.env`: el compose la inyecta apuntando al servicio `db` interno. Si la dejás en el `.env`, igualmente queda overrideada por el compose.

Levantá BD + backend:

```bash
docker compose up -d --build
```

Esto arranca:
- `catalog_db` — Postgres 16 con volumen persistente `pgdata` (datos sobreviven a `down`).
- `catalog_backend` — FastAPI con bind-mount de `./backend` y `uvicorn --reload` (hot-reload al editar). Storage persistido en volumen `catalog_storage` montado en `/data/storage`.

Comandos útiles:

```bash
docker compose logs -f backend            # logs en vivo
docker compose exec backend bash          # shell dentro del backend
docker compose exec db psql -U catalog    # psql a la BD de dev
docker compose down                       # parar (datos persisten)
docker compose down -v                    # parar + borrar volúmenes (reset total)
```

El backend expone en `http://localhost:8000`:
- `POST /api/jobs` — crea un job de procesamiento
- `GET  /api/jobs/{id}` — consulta el estado
- `GET  /api/catalog` — lista los items procesados
- `GET  /storage/...` — sirve las imágenes guardadas
- `GET  /health` — healthcheck

> **Alternativa sin Docker:** podés correr el backend con `uvicorn app.main:app --reload --port 8000` apuntando a la BD del compose vía `DATABASE_URL=postgresql+psycopg://catalog:catalog@localhost:5432/catalog`. Necesitarás Python 3.11+, `pip install -r requirements.txt` y `playwright install chromium`.

#### Migrar datos antiguos de SQLite (opcional)

Si tenías `backend/catalog.db` con datos:

```bash
docker compose exec backend python scripts/migrate_sqlite_to_pg.py --fresh
```

### 2. Frontend

Requisitos: Node 18+.

```bash
cd frontend
npm install
npm run dev
```

Vite arranca en http://localhost:5173 y habla con el backend en `http://localhost:8000` (configurable vía `VITE_API_BASE` en un archivo `frontend/.env`).

> **Multi-tenant en dev**: la ruta `/` es host-aware. En `http://localhost:5173`
> (dominio de app) ahora se ve la **landing** pública, no un catálogo. Para ver la
> **vitrina de un tenant** usá su subdominio: `http://<slug>.lvh.me:5173` (`lvh.me`
> resuelve a `127.0.0.1`). El back-office (`/login`, `/admin`) funciona en cualquiera
> de los dos hosts.

## Identidad visual

El prompt que se envía a nano-banana junto a cada imagen está en `backend/config/visual_identity.txt`. Edítalo libremente y reinicia (o no — se lee en cada job).

## Verificación end-to-end

1. `docker compose up -d --build` y, en otra terminal, `cd frontend && npm run dev`.
2. Abre http://localhost:5173, pega `https://makerworld.com/en/models/2403800-brigadeiro-portioning-plate-18g?from=search`, deja N=3, submit.
3. Observa la sección **Procesando** transitar `En cola → Extrayendo datos → Estilizando → Listo` (~20–40 s).
4. Verifica que aparece una tarjeta en el catálogo con el nombre del modelo y la imagen estilizada.
5. Inspecciona el storage (vive dentro del volumen `catalog_storage`):
   ```bash
   docker compose exec backend ls /data/storage/original
   docker compose exec backend ls /data/storage/styled
   ```
6. Inspecciona la DB:
   ```bash
   docker compose exec db psql -U catalog -d catalog -c "\dt"
   docker compose exec db psql -U catalog -d catalog -c "SELECT id, name, source_url FROM catalog_items;"
   ```

## Estructura

```
catalog_3d_automated/
├── docker-compose.yml       # Dev: Postgres + backend
├── backend/
│   ├── Dockerfile           # Imagen compartida dev/prod (Playwright + Python)
│   ├── railway.json         # Config de prod (Railway)
│   ├── app/                 # FastAPI app, rutas, servicios
│   ├── config/              # visual_identity.txt
│   ├── scripts/             # migrate_sqlite_to_pg.py, inspect_sqlite.py
│   └── requirements.txt
└── frontend/
    └── src/                 # React + TS app
```

## Troubleshooting

- **El scraper devuelve "No product images found"**: MakerWorld puede haber cambiado el DOM. Corre Playwright en modo headed (`headless=False` en `backend/app/services/scraper.py`) y ajusta `GALLERY_SELECTOR_CANDIDATES`.
- **Error 401 / API key**: confirma que `backend/.env` existe y `GEMINI_API_KEY` tiene un valor válido. Si lo editaste con compose corriendo, recargá con `docker compose up -d` (el `.env` solo se lee al arrancar el contenedor).
- **CORS error en el browser**: el backend permite `http://localhost:5173` y `http://localhost:5174` vía `CORS_ORIGINS` en `docker-compose.yml`. Si usás otro puerto, agrégalo ahí y hacé `docker compose up -d`.
- **Las imágenes tardan**: cada llamada a nano-banana toma 2–5 s. Para N=4, espera 15–30 s de generación + 5–15 s de scraping.
- **`backend` no levanta porque la BD no está lista**: el `depends_on: condition: service_healthy` debería esperar a Postgres. Si falla, mirá `docker compose logs db` y reintentá con `docker compose up -d`.

## Notas

- El modelo `gemini-2.5-flash-image` es la versión estable. Para probar Nano Banana 2, cambia `GEMINI_MODEL=gemini-3-1-flash-image` en `.env`.
- Costo aproximado por imagen estilizada: ~$0.039 USD.
