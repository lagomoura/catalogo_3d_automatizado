# Aura3D — Guía de identidad visual

> Documento vivo. Refleja la identidad implementada el 2026-05-29 (paleta
> Teal & Lima, personalidad amigable, temas claro + oscuro). La fuente de
> verdad de los valores son los tokens en `frontend/src/styles.css` (`:root`
> y `:root[data-theme="dark"]`).

## Marca

- **Nombre:** Aura3D.
- **Concepto:** *aura* = halo de luz/energía → el brillo de una pieza recién
  impresa, la "aura" de datos que GerenteBot percibe del negocio, y la
  energía teal→lima de la marca.
- **Personalidad:** amigable, cercana, moderna, confiable.
- **Isotipo** (`frontend/public/aura-mark.svg` y `<AuraMark>` en
  `frontend/src/components/Brand.tsx`): dos anillos abiertos concéntricos
  (= capas de impresión) con gradiente teal→lima y una chispa lima (el
  filamento). Sirve de favicon, fallback de logo en PDF y avatar.
- **Wordmark** (`<Logo>`): "Aura3D" en Bricolage Grotesque 800, el sufijo
  "3D" en `--accent-text`.

## Color

Arquitectura de 2 capas: escalas crudas (`--teal-*`, `--lime-*`, `--n-*`) →
tokens semánticos (los que consumen los componentes). El tema oscuro solo
redefine los tokens semánticos.

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--bg` | `#f6fbf9` | `#0b1614` | fondo de página |
| `--bg-elev` | `#ffffff` | `#11201d` | superficies elevadas |
| `--card-bg` | `#ffffff` | `#14211f` | tarjetas |
| `--fg` | `#0f2a2e` | `#eaf4f1` | texto principal |
| `--muted` | `#5c6b68` | `#9db2ad` | texto secundario |
| `--border` | `#e2eae8` | `#243431` | bordes/divisores |
| `--accent` | `#12b5a5` | `#25c2ac` | rellenos, iconos, bordes activos |
| `--accent-strong` | `#0e9488` | `#12b5a5` | fondos de botón con texto blanco (AA) |
| `--accent-text` | `#0b756c` | `#54d5c2` | texto y enlaces sobre fondo (AA) |
| `--accent-soft` | `#e6faf7` | `rgba(37,194,172,.14)` | fondos suaves |
| `--pop` | `#84cc16` | `#9fd23a` | acento lima (rellenos, nunca texto claro) |
| `--credit` / `--debit` | `#16a34a` / `#ef4444` | `#34d399` / `#f87171` | finanzas |

**Estado de pedidos** (`--st-*`): creado=slate, imprimiendo=naranja
(`#f97316`, complementario al teal = "activo/calor"), impreso=índigo,
entregado=verde, atención=ámbar. Versiones `*-soft` para fondos.

### Reglas de accesibilidad (AA)
- `--accent` (#12b5a5) **no** pasa AA como texto sobre claro → usar
  `--accent-text` (teal-700) para texto/enlaces y `--accent-strong` para
  botones con texto blanco.
- La lima **nunca** como texto sobre fondo claro; solo relleno/acento.

## Tipografía

- **Display:** Bricolage Grotesque (700/800) — títulos, hero, KPIs.
- **Body:** Plus Jakarta Sans (400–700) — UI y cuerpo (`--font-body`).
- **Datos:** DM Mono (500), `tabular-nums` — IDs, montos, specs.

## Forma, elevación y movimiento

- Radios: `--r-sm 8` · `--r-md 12` · `--r-lg 16` · `--r-xl 24` · `--r-pill 999`.
- Sombras tinte-teal: `--shadow-sm/md/lg`; `--glow` (aura en CTAs/FAB);
  `--ring` (focus accesible).
- Espaciado base 4px (`--space-1..16`).
- Transiciones 150–220 ms; respeta `prefers-reduced-motion`.

## Temas claro/oscuro

- El atributo `data-theme` se fija en `<html>` por un script inline en
  `index.html` antes del primer paint (evita el flash).
- `<ThemeToggle>` (en `Brand.tsx`) alterna y persiste en `localStorage`
  (`aura-theme`); por defecto sigue `prefers-color-scheme`.
- Botón presente en el header del Admin y de la vitrina pública.

### Reportes (dashboard)
`frontend/src/admin/reportes/reportes.css` ya **sigue el tema global**: sus
vars locales `--rep-*` se mapean a los tokens semánticos (`--bg`,
`--card-bg`, `--fg`, `--border`, `--accent`…), así que es claro en tema
claro y usa el mismo dark teal-tinte que el resto en tema oscuro. Las
series de gráficos (`--rep-blue/orange/red/green/purple`) son
theme-aware: tonos saturados/oscuros sobre fondo claro y pastel sobre
oscuro (override en `:root[data-theme="dark"] .reportes`).

## Archivos clave

- `frontend/src/styles.css` — tokens (`:root`, `[data-theme="dark"]`),
  componentes core, marca y `theme-toggle`.
- `frontend/src/components/Brand.tsx` — `AuraMark`, `Logo`, `ThemeToggle`,
  `useTheme`.
- `frontend/public/aura-mark.svg` — isotipo/favicon.
- `frontend/index.html` — fuentes, favicon, título, script de tema.
- `frontend/src/utils/categoryColor.ts` — paleta de categorías armonizada.
- Hojas por sección (`admin/**/*.css`, `assistant/styles.css`) — heredan
  los tokens; azules retiñidos a teal.
