# Catálogo 3D Automatizado

Herramienta full-stack que toma una URL de MakerWorld, extrae el nombre del modelo y N imágenes de la galería, re-estiliza cada imagen con Gemini 2.5 Flash Image ("nano-banana") aplicando un prompt de identidad visual, y arma un catálogo de productos consultable desde una UI web.

- **Backend:** Python + FastAPI + SQLite + Playwright + `google-genai`
- **Frontend:** React + TypeScript + Vite

## Setup

### 1. Backend

Requisitos: Python 3.11+.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # Windows PowerShell
# .venv\Scripts\activate.bat      # Windows CMD
# source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
playwright install chromium
```

> Si PowerShell bloquea el script con un error de execution policy, corre en la misma sesión:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

Crea `backend/.env` copiando `.env.example` y pega tu API key de Gemini:

```
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash-image
```

Obtén una API key en https://aistudio.google.com/apikey.

Arranca el servidor:

```bash
uvicorn app.main:app --reload --port 8000
```

El backend expone:
- `POST /api/jobs` — crea un job de procesamiento
- `GET  /api/jobs/{id}` — consulta el estado
- `GET  /api/catalog` — lista los items procesados
- `GET  /storage/...` — sirve las imágenes guardadas
- `GET  /health` — healthcheck

### 2. Frontend

Requisitos: Node 18+.

```bash
cd frontend
npm install
npm run dev
```

Vite arranca en http://localhost:5173 y habla con el backend en `http://localhost:8000` (configurable vía `VITE_API_BASE` en un archivo `frontend/.env`).

## Identidad visual

El prompt que se envía a nano-banana junto a cada imagen está en `backend/config/visual_identity.txt`. Edítalo libremente y reinicia (o no — se lee en cada job).

## Verificación end-to-end

1. Levanta backend y frontend en dos terminales.
2. Abre http://localhost:5173, pega `https://makerworld.com/en/models/2403800-brigadeiro-portioning-plate-18g?from=search`, deja N=3, submit.
3. Observa la sección **Procesando** transitar `En cola → Extrayendo datos → Estilizando → Listo` (~20–40 s).
4. Verifica que aparece una tarjeta en el catálogo con el nombre del modelo y la imagen estilizada.
5. Inspecciona el disco:
   - `backend/storage/original/` — imágenes scrapeadas originales
   - `backend/storage/styled/` — imágenes generadas por nano-banana
6. Inspecciona la DB:
   ```bash
   sqlite3 backend/catalog.db ".tables"
   sqlite3 backend/catalog.db "SELECT id, name, source_url FROM catalog_items;"
   ```

## Estructura

```
catalog_3d_automated/
├── backend/
│   ├── app/                 # FastAPI app, rutas, servicios
│   ├── config/              # visual_identity.txt
│   ├── storage/             # original/ + styled/  (generadas)
│   ├── catalog.db           # SQLite (generada)
│   └── requirements.txt
└── frontend/
    └── src/                 # React + TS app
```

## Troubleshooting

- **El scraper devuelve "No product images found"**: MakerWorld puede haber cambiado el DOM. Corre Playwright en modo headed (`headless=False` en `backend/app/services/scraper.py`) y ajusta `GALLERY_SELECTOR_CANDIDATES`.
- **Error 401 / API key**: confirma que `backend/.env` existe y `GEMINI_API_KEY` tiene un valor válido.
- **CORS error en el browser**: el backend permite explícitamente `http://localhost:5173` y `http://127.0.0.1:5173`. Si usas otro puerto, ajusta `CORS_ORIGINS` en `backend/app/config.py`.
- **Las imágenes tardan**: cada llamada a nano-banana toma 2–5 s. Para N=4, espera 15–30 s de generación + 5–15 s de scraping.

## Notas

- El modelo `gemini-2.5-flash-image` es la versión estable. Para probar Nano Banana 2, cambia `GEMINI_MODEL=gemini-3-1-flash-image` en `.env`.
- Costo aproximado por imagen estilizada: ~$0.039 USD.
