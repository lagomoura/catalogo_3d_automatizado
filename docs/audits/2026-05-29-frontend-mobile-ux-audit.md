# Auditoría profunda de frontend — Mobile-ready + UX

**Fecha:** 2026-05-29 · **Commit:** `a200518` · **Alcance:** todo el frontend (`frontend/src/`)
**Modo:** auditoría READ-ONLY — no se modificó código. El usuario decide qué implementar.

Consolida 4 auditorías paralelas con lentes distintas:
- **A1 — Mobile UX · flujos públicos + asistente** (la cara mobile del producto: clientes en el teléfono).
- **A2 — Mobile UX · back-office** (operador en tablet/celular en el taller).
- **A3 — WOW + identidad Aura3D** (jerarquía, micro-interacciones, consistencia de marca).
- **A4 — Calidad de código React** (deuda estructural que habilita/bloquea el rediseño).

Cada hallazgo cita `archivo:línea`. Los marcados `[hipótesis]` requieren verificación en device real
(no se puede confirmar de forma estática). Una muestra de 9 hallazgos clave fue verificada a mano contra
el código (ver §Metodología).

---

## Resumen ejecutivo

**Estado mobile-ready: ~55-60%.** La base es buena (design system Aura3D sólido, grids `auto-fill`
intrínsecamente responsive, `React.lazy` por ruta top-level, dark mode bien construido, tablero de
producción que **sí** colapsa a stack vertical), pero hay **defectos bloqueantes en los flujos del
cliente** y **deuda transversal** (safe-areas, zoom iOS, tablas que no colapsan, foco no manejado).

### Top 6 problemas
1. **El detalle de producto 3D nunca muestra el modelo** — `ProductDetailPage.tsx` promete "3D" pero
   no renderiza `<model-viewer>`. La promesa central del catálogo se rompe. *(verificado)*
2. **El formulario público `/c/:token` pierde su layout** — usa `.form-grid`, clase que solo existe en
   `impressoras.css` (no cargado en la ruta pública). Primera pantalla del cliente, sin grilla. *(verificado)*
3. **Zoom de iOS sistémico** — casi todos los `input/select` de formularios admin y el composer del bot
   usan `font-size < 16px` → Safari hace zoom al enfocar y desalinea el layout. *(verificado)*
4. **Navegación admin de 9 tabs sin patrón mobile** — flex sin `overflow-x`, sin drawer, sin bottom-nav.
   El operador no puede cambiar de sección en el teléfono. *(verificado)*
5. **Cero `safe-area-inset` / `viewport-fit=cover` / `dvh` en todo el repo** — FAB, footers de modal y
   alturas `100vh`/`90vh` quedan bajo el notch y la barra dinámica del navegador. *(verificado)*
6. **Tablas data-densas que no colapsan** — `.clientes__row` y `.estoque__row` son grids fijos
   (~760-780px) con contenedor `overflow:hidden` (recortan, ni siquiera scrollean) y **cero `@media`**. *(verificado)*

### Top 6 quick wins (alto impacto, esfuerzo S)
- Subir `input/select/textarea` a `font-size: 16px` en mobile (mata el zoom iOS de un saque).
- Agregar `viewport-fit=cover` al meta + `env(safe-area-inset-bottom)` en FAB y footers de modal.
- Globalizar `.form-grid` a `styles.css` (arregla el layout del registro público).
- `min-width: 0` en los search bars del admin (`<560px`) — hoy `240px` desbordan.
- `100vh` → `100dvh` en páginas públicas y `max-height: 90dvh` en modales.
- `::selection` con `--accent-soft` + `--glow` en CTAs del cliente — detalle de marca gratis.

---

## Hallazgos CRÍTICOS

### C1 · Detalle de producto 3D nunca muestra el modelo
- **Superficie:** cliente · **`frontend/src/showcase/ProductDetailPage.tsx:53-101`** (render) + badge en `ShowcaseCard.tsx:33-35` · **[A1, A3]** · *verificado*
- **Problema:** la tarjeta muestra badge "3D" cuando hay `model_3d_url`, pero `ProductDetailPage` solo renderiza imágenes + lightbox; **nunca** usa `model_3d_url` ni `<model-viewer>`. Hay CSS huérfano `.product-detail__viewer` (`styles.css:1648`) confirmando que la feature quedó a medias.
- **Impacto:** el cliente que toca un producto "3D" en el teléfono no encuentra el modelo — el diferencial del producto no se ve.
- **Fix:** renderizar `<model-viewer src={resolveStorageUrl(item.model_3d_url)} camera-controls touch-action="pan-y" ar reveal="interaction" poster=…>` con fallback visible si el `.glb` falla. `touch-action: pan-y` para no capturar el scroll vertical de la página.
- **Esfuerzo:** M

### C2 · Formulario público `/c/:token` pierde su layout de grilla
- **Superficie:** cliente · **`frontend/src/public/ClientRegisterPage.tsx:152`** (usa `.form-grid`) + `client-register.css` (no la define) · **[A3]** · *verificado*
- **Problema:** `.form-grid` se define **solo** en `admin/impressoras/impressoras.css:217`, importado únicamente por `ImpressorasPage.tsx`. La ruta pública es lazy; un cliente que nunca abrió el admin no carga ese CSS → los campos se apilan sin las 2 columnas ni `field--full`.
- **Impacto:** la primera (y a veces única) pantalla del cliente se ve como una pila de inputs sin jerarquía.
- **Fix:** mover `.form-grid` + `.field` a `styles.css` (global) como primitiva compartida real.
- **Esfuerzo:** S

### C3 · Inputs con `font-size < 16px` → auto-zoom iOS (sistémico)
- **Superficie:** back-office + asistente · **[A1, A2, A3]** · *verificado*
- **Ubicaciones:** composer del bot `assistant/styles.css:642` (`0.94rem`); formularios admin `clientes/clientes.css:195`, `estoque/estoque.css:200,391`, `calculadora` `styles.css:3057`; search bars `0.9rem`.
- **Problema:** al enfocar cualquiera de estos campos, iOS Safari hace zoom-in y reflowa el layout. Es el patrón más repetido del repo. *(Los inputs del registro público se salvan porque caen al `.field input` global = `1rem`.)*
- **Impacto:** cada toque de campo en el taller (cotizar, cargar material/cliente) o en el bot rebota la pantalla.
- **Fix:** media query global `<640px` que fuerce `font-size: 16px` en `input, select, textarea`. El padding ya reserva alto.
- **Esfuerzo:** S

### C4 · Navegación admin de 9 tabs sin patrón mobile
- **Superficie:** back-office · **`frontend/src/admin/AdminPage.tsx:147-230`** + `styles.css:1768` (`.tabs`) · **[A2]** · *verificado (cero `@media`/overflow en `.tabs`)*
- **Problema:** `.tabs` es un `display:flex` sin `overflow-x:auto`, sin `flex-wrap`, sin drawer. Labels largos ("Calculadora & Cotizaciones", "Generador de Presupuestos (PDF)") en 360-430px se comprimen ilegibles o desbordan.
- **Impacto:** la navegación primaria del back-office es inusable en el teléfono.
- **Fix:** en `<640px`, `overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch` con scroll-snap, o bottom-nav con iconos (thumb zone). Mantener `role="tablist"`.
- **Esfuerzo:** M

### C5 · Modales y lightbox sin focus-trap ni restore de foco (a11y)
- **Superficie:** transversal · **`components/Modal.tsx:34-66`**, `ImageLightbox.tsx:28-53`, `Model3DLightbox.tsx:11-42`, `pedidos/OrderEditModal.tsx:121-214` · **[A4]** · *verificado (Modal no toca `activeElement`/foco)*
- **Problema:** ningún modal mueve el foco al abrir, lo atrapa con Tab, ni lo devuelve al disparador al cerrar. Con teclado/lector el foco queda detrás del backdrop y se escapa al contenido inerte.
- **Impacto:** a11y rota en el hot path; bloquea un rediseño WOW accesible. Repetido en 5+ implementaciones.
- **Fix:** centralizar focus-trap + restore en `Modal` (guardar `document.activeElement`, enfocar el panel, ciclar Tab, restaurar al cerrar) y migrar los lightbox/OrderEditModal a componerse sobre `Modal`.
- **Esfuerzo:** L

### C6 · `<model-viewer>` sin `poster` ni fallback
- **Superficie:** cliente + catálogo admin · **`components/Model3DLightbox.tsx:48-63`** · **[A3]** · *verificado*
- **Problema:** sin `poster`, sin slot de carga, sin slot de error; fondo fijo `#1a1a1a`. El doc de marca lo exige explícitamente.
- **Impacto:** durante la descarga del `.glb` el usuario ve un rectángulo vacío; si falla, no hay mensaje. (Ortogonal a C1: aplica donde el visor sí se renderiza.)
- **Fix:** `poster={resolveStorageUrl(cover.styled_url)}` + slots `poster`/error con copy. Quitar el `#1a1a1a` inline → token.
- **Esfuerzo:** M

> **Nota estructural (ver §Deuda estructural):** `CalculadoraPage.tsx` (1.671L) es un monolito que **bloquea**
> cualquier reflow responsive de la calculadora sin extraer sub-componentes primero. Severidad crítica desde
> la óptica del rediseño, tratado en el mapa de refactor.

---

## Hallazgos ALTOS

### Mobile / viewport (flujos del cliente primero)
| # | Hallazgo | `archivo:línea` | Fix | Esf. |
|---|---|---|---|---|
| A1 | Panel del asistente sin `dvh` ni safe-area → el teclado tapa el composer `[hipótesis]` | `assistant/styles.css:91-110, 194-201, 691-701` | `height:100dvh` + `padding-bottom: calc(… + env(safe-area-inset-bottom))` | M |
| A2 | CTA de registro chico (~32px) y no full-width; sin sticky-footer | `styles.css:2803` (`.btn-primary`) + `public/client-register.css:51` | `.btn-primary{min-height:44px}`; `.creg__submit{align-self:stretch;min-height:48px}` en mobile | S |
| A3 | Presupuesto `/q/:token` desborda horizontal (header sin wrap, tabla sin scroll) | `public/quote-public.css:1-25` + `orcamento/orcamento.css:229-338` | `flex-direction:column` en header + wrapper `overflow-x:auto` o tarjetas por ítem | M |
| A4 | FAB del asistente sin safe-area (se solapa con home-bar) `[hipótesis]` | `assistant/styles.css:19-24` | `bottom: calc(20px + env(safe-area-inset-bottom))` | S |
| A5 | Lightbox: close/nav < 44px justo en mobile | `styles.css:1177-1193, 1248-1264` | mantener `min 44×44px` en mobile; swipe + dots | S |
| A6 | Páginas públicas con `min-height:100vh` (salto de barra URL en Safari) | `public/client-register.css:4`, `public/quote-public.css:2`, `styles.css:1693` | `min-height:100dvh` (fallback `100vh`) | S |

### Mobile / back-office
| # | Hallazgo | `archivo:línea` | Fix | Esf. |
|---|---|---|---|---|
| A7 | Tabla de Clientes no colapsa y el contenedor recorta (`overflow:hidden`) | `clientes/clientes.css:124-145` (cero `@media`) | patrón `txn-row`: ocultar head + `1fr auto` con `data-label`, o `overflow-x:auto` | M |
| A8 | Tabla de Estoque idéntica (7 col ~780px, contenedor recorta) | `estoque/estoque.css:419-441` | colapso responsive con `data-label` o `overflow-x:auto` | M |
| A9 | Tabla de rentabilidad (Reportes) sin colapso mobile (6 col) | `reportes/reportes.css:303-315` | sumar `.profit-table__row` a la `@media (max-width:560px)` existente | M |
| A10 | `min-width:240px` en los 4 search bars desborda <360px | `pedidos.css:47`, `estoque.css:391`, `clientes.css:108`, `impressoras.css:78` | `min-width:0; flex:1 1 100%` en `<560px` | S |
| A11 | Footers de modal `90vh`/`100vh` sin `dvh` ni safe-area → botón "Guardar" tapado | `styles.css:686, 741-747, 1693` | `max-height:90dvh` + `padding-bottom: calc(… + env(safe-area-inset-bottom))` | S |
| A12 | Modal de formulario sin manejo de teclado virtual (campo enfocado oculto) `[hipótesis]` | `components/Modal.tsx:34-46` + `styles.css:680-704` | `scroll-margin` en inputs + listener `visualViewport`; o full-screen sheet en `<640px` | M |
| A13 | Calculadora: mayoría de `type="number"` sin `inputMode` (teclado alfanumérico) | `calculadora/CalculadoraPage.tsx:1102-1135` y demás; `caja/TransactionForm.tsx:216` | `inputMode="decimal"`/`numeric` en todos los `type="number"` | S |

### WOW / identidad (flujos del cliente primero)
| # | Hallazgo | `archivo:línea` | Fix | Esf. |
|---|---|---|---|---|
| A14 | `Cargando…` en texto plano donde iría skeleton (4 pantallas del cliente) | `ShowcasePage.tsx:89`, `ProductDetailPage.tsx:36`, `ClientRegisterPage.tsx:103`, `QuotePublicPage.tsx:28` | skeletons de card (la grilla ya reserva `aspect-ratio`, sin CLS) | M |
| A15 | Empty state mudo en la vitrina (pantalla central) | `showcase/ShowcaseGrid.tsx:9-15` | `AuraMark` + copy + botón "Quitar filtros" que resetea estado | S |
| A16 | Detalle de producto sin CTA ni tratamiento héroe (punto de máxima intención) | `showcase/ProductDetailPage.tsx:95-100` | bloque CTA (consulta/WhatsApp) + "Ver en 3D" + peso display en el nombre | M |
| A17 | Estados de pedido/caja con hex crudos que ignoran el dark mode | `styles.css:2731, 2766, 2832, 2858, 2864` | `--muted`/`--success`/`--error`/`--st-*`/`--debit` | S |
| A18 | Bordes de rails/segmentos con hex crudos (sin dark) | `styles.css:2343, 2431, 2436` | `var(--border-strong)` o `color-mix` sobre `--st-*` | S |
| A19 | Badge 3D inconsistente vitrina vs admin + regla CSS muerta | `styles.css:1494, 1503-1519, 4054` | unificar a `--accent`; eliminar regla pisada | S |

### Estructura / performance React
| # | Hallazgo | `archivo:línea` | Fix | Esf. |
|---|---|---|---|---|
| A20 | 8 `OnboardingModal` casi idénticos (773L combinadas) | `admin/{caja,calculadora,…}/OnboardingModal.tsx` | un `<OnboardingModal title icon sections>` + `onboarding.content.ts` | M |
| A21 | Headers/nav duplicados admin vs showcase; sin `<AppLayout>`/`<PageHeader>` | `AdminPage.tsx:134-145` vs `ShowcasePage.tsx:58-62` | `<PageHeader>` + `<AppShell>` reutilizables | M |
| A22 | `AdminPage` tab-routing manual (ternarios) + handoff por props drilling; módulos eager | `AdminPage.tsx:36-46, 232-312` | rutas hijas `react-router` + `lazy()` por tab + `AdminWorkflowContext` | L |
| A23 | `model-viewer` (~MB) cargado eager en `index.html` para toda la vitrina | `index.html:27-30` (uso real solo en `Model3DLightbox.tsx:48`) | carga bajo demanda al montar el lightbox 3D | S |
| A24 | `CatalogCard` no memoizado + callbacks/props inestables → re-render de toda la grilla | `CatalogGrid.tsx:238-249` + `CatalogCard.tsx:24` | `React.memo` + `useCallback` + selección que no fuerce render global | M |
| A25 | `OrcamentoPage`: efecto con deps frágiles (`eslint-disable`) + lógica de contacto duplicada | `orcamento/OrcamentoPage.tsx:117-151, 345` | `applyContactToDraft()` + `useReducer` para el draft | L |

---

## Hallazgos MEDIOS

| # | Hallazgo | `archivo:línea` | Lente | Esf. |
|---|---|---|---|---|
| M1 | Fetches públicos sin `AbortController` (race al navegar rápido) | `ProductDetailPage.tsx:23`, `ShowcasePage.tsx:28`, `ClientRegisterPage.tsx:43`, `QuotePublicPage.tsx:17` | A1/A4 | M |
| M2 | Registro sin persistencia del borrador (`localStorage`) | `ClientRegisterPage.tsx:29-39` | A1 | S |
| M3 | Falta `viewport-fit=cover` (prerequisito de las safe-areas) | `index.html:5` | A1 | S |
| M4 | Registro sin `inputMode`/`autoComplete`/`enterKeyHint` | `ClientRegisterPage.tsx:163-243` | A1 | S |
| M5 | Padding `.app` 2rem/1.5rem sin reducir en `<360px` | `styles.css:191-195` | A2 | S |
| M6 | `.modal-backdrop`/`.order-modal` padding 1.5rem aprieta el panel en mobile | `styles.css:636, 677` | A2 | S |
| M7 | `.priority-seg__btn` 34×30px < 44×44 (se toca al crear/editar pedido) | `styles.css:2329-2330` | A2 | S |
| M8 | `.estoque__actions`/`.clientes__actions` gap <8px + botones compactos | `estoque.css`, `clientes.css` | A2 | S |
| M9 | `.product-picker-grid` con scroll anidado dentro de form que ya scrollea `[hipótesis]` | `styles.css:2242-2243` | A2 | S |
| M10 | Gradiente con `#7c3aed` (violeta) fuera de la paleta Teal & Lima | `styles.css:3954, 4062` | A3 | S |
| M11 | Títulos hero del cliente sin peso "momento editorial" (Bricolage subutilizada) | `.product-detail__name`, `.creg__panel h1`, `.qpub__panel h1` | A3 | S |
| M12 | `AssistantProvider` (321L): reducer disfrazado de `useState`+`.map` | `assistant/AssistantProvider.tsx:113-252` | A4 | M |
| M13 | `usePolling` no usado en `PedidosPage` (reimplementa `setInterval`); no pausa en background | `PedidosPage.tsx:139-144` vs `hooks/usePolling.ts` | A4 | S |
| M14 | `window.confirm`/`alert` en acciones destructivas (existe `ConfirmModal`) | `CatalogCard.tsx:95,109,145`; `OrcamentoPage.tsx:301,306`; `PedidosPage.tsx:444,452` | A4 | M |
| M15 | Estilos inline hardcodeados (sin tokens, sin dark) | `Model3DLightbox.tsx:55-62`, `CalculadoraPage.tsx:929`, `MaterialForm.tsx:280` | A4 | S |
| M16 | Uniones literales repetidas que deberían vivir en `types.ts` | `PedidosPage.tsx:86,90,541,552`, `AdminPage.tsx:23-33` | A4 | S |
| M17 | Briefing KPI del asistente con hex crudos (doble fuente de verdad con su override dark) | `assistant/styles.css:351-352, 715-718` | A3 | S |

---

## Hallazgos BAJOS

| # | Hallazgo | `archivo:línea` | Esf. |
|---|---|---|---|
| B1 | Chips del asistente: scroll-x puede competir con back-swipe iOS `[hipótesis]` | `assistant/styles.css:581-588` | S |
| B2 | `.app__subtitle` promocional roba alto en el header del back-office en cada tab | `AdminPage.tsx:142-144` | S |
| B3 | `ImageLightbox` sin swipe táctil ni `aria-live` al cambiar de imagen | `ImageLightbox.tsx:46-53` | S |
| B4 | Toasts `warn` deberían ser `role="alert"`/`aria-live="assertive"` (hoy todos `status`) | `Toast.tsx:117-124` | S |
| B5 | `resolveMaterial` recreado por render + `eslint-disable exhaustive-deps` | `CalculadoraPage.tsx:172-176, 199, 255` | S |
| B6 | Navegación entre tabs vía `document.querySelector(...).click()` (acople DOM frágil) | `OrcamentoPage.tsx:461-464` | S |
| B7 | `--glow` ausente en los CTA primarios del cliente (aura de marca) | `creg__submit`, `qpub .btn-primary` | S |

---

## Oportunidades WOW (ordenadas por ROI emocional)

1. **Skeleton de cards en vitrina/detalle** (cliente) — elimina el "vacío gris" en la primera impresión. *(M)*
2. **Detalle de producto: CTA + "Ver en 3D"** — da siguiente paso en el punto de máxima intención y trae el héroe 3D al detalle público. *(M)*
3. **Empty state de vitrina con `AuraMark` + acción** — convierte un callejón sin salida en marca + recuperación. *(S)*
4. **`--glow` en CTAs del cliente** (`creg__submit`, `qpub`) — el aura de marca da peso a "Enviar mis datos" / "Bajar PDF". *(S)*
5. **Activar `--pop` (lima) como acento real** — hoy la identidad "Teal & Lima" se queda en Teal; badge "Nuevo", highlight de KPI positivo, dot del FAB. *(S)*
6. **`::selection` de marca** global con `--accent-soft` — detalle premium que cubre todas las superficies. *(S)*

---

## Deuda estructural React — mapa de refactor

**Primitivas compartidas a crear:**
- `<AppShell>` + `<PageHeader logoSize subtitle actions>` → consume `AdminPage` y `ShowcasePage` (mata la duplicación de header/nav; zona crítica para thumb-zone/safe-area).
- `<OnboardingModal>` genérico (title + icon + sections desde data) → reemplaza los 8 archivos.
- `Modal` con **focus-trap + restore** centralizado → migrar `ImageLightbox`, `Model3DLightbox`, `OrderEditModal` a componerse sobre él.
- `<ConfirmModal>` + `useToast` como único camino para confirmaciones → eliminar `window.confirm/alert`.

**Monolitos a partir (bloquean el reflow mobile):**
- **`CalculadoraPage` (1.671L)** → hook `useQuoteForm()` (estado + dirty + save/load + atajos) + `<PieceSection>`, `<MaterialLines>`, `<PrinterChannelSection>`, `<AdvancedParams>`, `<ResultPanel>`, `<QuoteHistoryList>`. *(XL)*
- **`OrcamentoPage` (714L)** → `useQuoteDraft()` (reducer) + `<EmpresaSection>`/`<ClienteSection>`/`<ItemsEditor>`/`<DetallesSection>`. *(L)*
- **`MaterialForm` (619L)** → wizard `<CategoryStep>`/`<MaterialFormFields>` + constantes a módulo aparte. *(M)*
- **`PedidosPage` (681L)** → `useProductionBoard()` (el JSX ya delega a `board/*`). *(M)*
- **`ReportesPage` (748L)** → extraer sub-componentes ya internos + `useReportData(range)`. *(M)*

**Code-splitting:** `lazy()` por tab admin (sobre todo `CajaPage`→recharts y `CalculadoraPage`); `model-viewer` bajo demanda.

---

## Tokens faltantes en el design system (Aura3D)

- **Sin escala tipográfica tokenizada** — todo es `rem` literal por componente (1.6rem, 0.94rem, 0.78rem…), lo que dispersa la jerarquía. Recomendable `--text-xs … --text-3xl` + `--leading-*` (ya existen `--space-*`/`--r-*`).
- **Sin token de movimiento** (`--dur-fast`, `--ease`) — las transiciones repiten `0.15s/0.18s ease` a mano.
- **Cinco verdes distintos** para conceptos cercanos (`#0d9268`, `#0d7a57`, `#2a8848`, `#10b981`, `#059669`) — falta un token único de "éxito de acción".

> Si se crean/cambian tokens, **actualizar `brand-identity.md` en el mismo commit** (doc vivo).

---

## Roadmap sugerido (a tu elección — nada de esto se implementó)

**Tanda 1 — Quick wins mobile (1 sesión, esfuerzo S):** C2, C3, A4, A6, A10, A11, M3 + WOW #4/#6.
Mata el zoom iOS, las safe-areas, el layout del registro público y los desbordes. Máximo impacto / mínimo riesgo.

**Tanda 2 — Flujos del cliente (la cara mobile):** C1, C6, A1, A2, A3, A14, A15, A16 + WOW #1/#2/#3.
Cierra el detalle 3D, el presupuesto público legible, skeletons y CTAs.

**Tanda 3 — Back-office tablet/mobile:** C4, A7, A8, A9, A12, A13 + tablas que colapsan + navegación.

**Tanda 4 — Estructural + a11y (habilita el rediseño WOW):** C5, A20, A21, A22, A23, A24 + partir monolitos.
Es prerequisito para hacer el reflow responsive de Calculadora/Orçamento sin riesgo.

---

## Verificaciones pendientes en device real (`[hipótesis]`)

No se pueden confirmar de forma estática — pedir captura/grabación en iPhone Safari + Android Chrome:
1. Teclado tapando el composer del bot (A1) y campos de modal de formulario (A12).
2. Zoom al enfocar el composer (C3) — antes/después del fix a 16px.
3. FAB y footers bajo la home-bar / notch (A4, A11).
4. Desborde de `/q/:token` con 4-5 ítems en un teléfono de 360-390px (A3).
5. `<model-viewer>` con `touch-action:pan-y` rota sin robar el scroll vertical (tras implementar C1).
6. Doble scroll de `.product-picker-grid` dentro del form de pedido (M9).
7. Icon-buttons `.tbtn--del`/`.tbtn--pay` de filas de ticket legacy: confirmar `aria-label` (los del board nuevo sí lo tienen).
8. *(opcional)* `npm run build` + `rollup-plugin-visualizer` para cuantificar el peso del bundle y el impacto de A23.

---

## Cobertura y metodología

- **A1** (flujos públicos + asistente): 9/9 componentes en scope, con positivos confirmados (`React.lazy` por ruta, `ShowcaseCard` con `loading=lazy` + `aspect-ratio`, scrim en overlay, submit con `disabled`).
- **A2** (back-office): 9 superficies + `styles.css` completo. **Convención de colas de producción verificada y respetada** (`board.css:969-979` colapsa a stack vertical en `<900px`).
- **A3** (WOW/Aura3D): `brand-identity.md` + `styles.css` (4.505L) + `assistant/styles.css` + componentes del cliente. Dark mode confirmado sólido salvo los hex crudos listados.
- **A4** (React): 16 archivos núcleo. No se corrió ESLint/`tsc` (auditoría estática de lectura).
- **No auditado en profundidad** (candidato a próxima tanda): `api/client.ts` (firmas/`any`), `caja/`, sub-componentes `board/*`, `calc.ts`/`storage.ts`, markup interno del asistente.

**Verificación de exactitud:** se verificaron a mano contra el código 9 hallazgos clave (uno o más de cada
agente): C1 (sin model-viewer), C2 (`.form-grid` solo en impressoras), C3 (composer `0.94rem`), C4 (`.tabs`
sin overflow), C5 (Modal sin manejo de foco), A7 (clientes.css cero `@media`), A23 (model-viewer eager en
index.html), M3 (sin `viewport-fit`/safe-area en el repo), M14 (`window.confirm` ×3 en CatalogCard). **Todos
confirmados exactos.**
