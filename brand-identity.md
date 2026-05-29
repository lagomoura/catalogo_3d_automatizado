# Aura3D — Identidad visual y design system

Documento vivo de la identidad visual del frontend. **La fuente de verdad
ejecutable es `frontend/src/styles.css`** (bloque de tokens al inicio); este
archivo lo explica en prosa. Si cambiás un token en `styles.css`, actualizá
este doc en el **mismo commit** (igual que `gerente_bot.md` y `FEATURES.md`).

## Personalidad

**Aura3D — Teal & Lima.** Amigable y cercana. Una herramienta de trabajo que se
siente moderna y clara, no corporativa ni fría. El producto (la pieza 3D) es el
héroe: la imagen y el visor `<model-viewer>` mandan; la UI los acompaña.

## Arquitectura de tokens (2 capas)

1. **Escalas crudas** — `--teal-*`, `--lime-*`, `--n-*` (neutrales). **No se usan
   directo en componentes.** Son la materia prima.
2. **Tokens semánticos** — los que **sí** consumen los componentes (`--bg`,
   `--fg`, `--accent`, `--pop`, …). El tema (claro/oscuro) redefine **solo** la
   capa semántica; por eso el dark mode es limpio y un color hardcoded lo rompe.

> Regla de oro: **en componentes, tokens semánticos; nunca escalas crudas ni hex literales.**

## Color — roles semánticos

| Token | Rol |
|---|---|
| `--bg` / `--bg-elev` / `--card-bg` | Fondo de página / elevado / tarjetas |
| `--fg` | Texto principal |
| `--muted` | Texto secundario |
| `--border` / `--border-strong` | Bordes |
| `--accent` (teal-500) | Rellenos, iconos, bordes activos |
| `--accent-strong` (teal-600) | Fondos con texto blanco (contraste AA) |
| `--accent-text` (teal-700) | Texto/enlaces sobre fondo claro (AA) |
| `--accent-soft` (teal-50) | Fondos suaves teñidos |
| `--pop` (lime-500) | Acento lima: rellenos/destacados — **nunca texto** |
| `--pop-text` (lime-700) | Texto lima (cuando hace falta) |
| `--success` `--warning` `--error` `--info` | Estados de feedback (texto/indicadores) |
| `--success-strong` / `--success-soft` | Éxito de **acción**: relleno con texto blanco (AA) / fondo teñido. Token único que reemplaza los verdes sueltos hardcodeados |
| `--credit` / `--debit` | Caja: ingresos / egresos |
| `--st-*` (creado/ejecutando/ejecutado/entregado/warn + `-soft`) | Estados de pedido |

**Contraste**: objetivo WCAG AA (4.5:1 texto normal, 3:1 large), verificado
también en tema oscuro. El lima nunca va como texto por contraste.

## Tema claro + oscuro

Activado por `[data-theme="dark"]` en `<html>` (toggle persistido). El dark
**solo** redefine tokens semánticos. Todo componente debe verse bien en ambos
temas — si usa tokens, lo hace gratis; si hardcodea color, se rompe.

## Tipografía

- **`--font-display` → Bricolage Grotesque** — titulares (`h1`–`h3`), momentos
  editoriales, números grandes. `letter-spacing` levemente negativo.
- **`--font-body` → Plus Jakarta Sans** — UI y body. Es el default del `<body>`.
- **`--font-mono` → DM Mono** — cifras tabulares (precios, montos, cantidades).
  El repo aplica `font-variant-numeric: tabular-nums` a `.mono`,
  `[class*="amount"]`, `[class*="value"]` para que los números no "bailen".

Las fuentes se cargan vía `<link>` a Google Fonts con `display=swap` en
`frontend/index.html` (no hay `next/font` — esto es Vite).

**Escala de tamaño** (independiente del tema): `--text-xs` (12.5px) · `--text-sm`
(14px) · `--text-base` (16px, body/inputs) · `--text-md` (18px) · `--text-lg`
(22px) · `--text-xl` (28px) · `--text-2xl` (36px) · `--text-3xl` (48px, hero).
Interlineados: `--leading-tight/snug/normal`. **Regla mobile**: ningún `input`,
`select` o `textarea` baja de `--text-base` (16px) en mobile — abajo de eso iOS
Safari hace zoom involuntario al enfocar.

## Forma y espaciado

- **Radius**: `--r-sm` 8px · `--r-md` 12px · `--r-lg` 16px · `--r-xl` 24px · `--r-pill` 999px.
- **Espaciado**: escala base 4px — `--space-1` (4) … `--space-16` (64).

## Elevación y foco

- `--shadow-sm/md/lg` — sombras con tinte teal (claro) / negro (oscuro).
- `--glow` — el "aura" de la marca; reservado para CTAs/FAB primarios.
- `--ring` — anillo de **focus accesible**. El focus visible no es opcional.

## Movimiento

Transiciones cortas que orientan, no decoran. Tokenizadas: `--dur-fast` (0.15s),
`--dur` (0.18s), `--dur-slow` (0.32s, paneles/sheets) y `--ease`
(`cubic-bezier(0.4,0,0.2,1)`). Hay un bloque **global**
`@media (prefers-reduced-motion: reduce)` en `styles.css` que neutraliza
animaciones/transiciones; toda animación nueva queda cubierta — no la puenteés
con duración/iteración propias.

## Convenciones de implementación

- **CSS plano + BEM** (`.card__title`, `.button--primary`), co-localizado por
  feature. No hay Tailwind ni CSS-in-JS.
- **Imágenes**: `<img loading="lazy">` con dimensiones/`aspect-ratio` reservados
  (evita CLS). El 3D usa `<model-viewer>` con poster + fallback.
- **Idioma**: español (con pt en términos de dominio). Sin librería de i18n;
  cadenas hardcodeadas.
- **Mobile-first**: en conflicto mobile vs desktop, gana mobile.

## Mantenimiento

Este documento y `frontend/src/styles.css` se mantienen sincronizados. El agente
`wow-ux-architect` es el guardián de esta identidad: audita drift, propone mejoras
y, al crear/cambiar tokens, actualiza este archivo.
