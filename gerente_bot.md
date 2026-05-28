# Gerente Bot — referencia funcional

Asistente conversacional powered by **Gemini 2.5 Flash** que actúa como
gerente general 24/7 de la tienda de impresión 3D. Conoce el estado del
negocio en tiempo real (catálogo, pedidos, producción, materiales,
impresoras, caja, clientes) y puede ejecutar acciones con confirmación
explícita del usuario.

> ⚠️ **Convención de mantenimiento.** Todo cambio que impacte en el
> comportamiento del chatbot (nuevas tools, ajustes al system prompt,
> cambios en el snapshot, nuevas métricas en el briefing, nuevos
> componentes de UI, etc.) **debe** quedar registrado en este archivo:
> actualizando la sección correspondiente Y agregando una entrada al
> [Changelog](#changelog) abajo. Si tocás el asistente sin actualizar
> este doc, el doc se desincroniza y deja de ser la fuente de verdad.

---

## Acceso

| Cómo | Dónde |
|---|---|
| Botón flotante **"Gerente"** | Esquina inferior derecha de cualquier sección del Admin |
| Atajo de teclado | `Ctrl + /` (o `Cmd + /` en Mac) |
| Ruta | Solo en `/admin` (dentro del `AdminGate`) |

Al abrirlo se desliza un panel lateral de 420px con un briefing
personalizado y sugerencias contextuales para arrancar.

---

## Arquitectura (resumen)

```
┌──────────────────────┐     ┌──────────────────────────┐     ┌────────────┐
│  Frontend React      │ →   │  Backend FastAPI         │ →   │  Gemini    │
│  AssistantProvider   │     │  /api/assistant/*        │     │  2.5 Flash │
│  Panel + FAB         │ ←   │  engine + 11 tools       │ ←   │            │
└──────────────────────┘     └──────────────────────────┘     └────────────┘
                                       │
                                       ▼
                             ┌──────────────────────┐
                             │  Snapshot del negocio │
                             │  (KPIs + listados    │
                             │  inyectados al prompt)│
                             └──────────────────────┘
```

**Estrategia de datos:** snapshot + tools.
- El estado actual del negocio se serializa como JSON y se inyecta en el
  system prompt — Gemini lo lee directo sin tener que llamar tools para
  preguntas comunes.
- Para detalle profundo o mutaciones, el modelo decide qué tool llamar
  vía function calling.

---

## Endpoints backend

| Método | Path | Qué hace |
|---|---|---|
| `POST` | `/api/assistant/chat` | Un turno de conversación. Resuelve tool calls internamente y devuelve texto + data_cards + pending_action + suggestions. |
| `POST` | `/api/assistant/confirm-action` | Ejecuta (o cancela) una acción pendiente por `confirmation_id`. |
| `GET` | `/api/assistant/brief` | Briefing inicial: saludo + KPIs + highlights + sugerencias (no pasa por LLM, es determinístico). |
| `GET` | `/api/assistant/conversations/{id}/history` | Historial completo de una conversación. |

Todos los endpoints requieren Basic Auth admin (mismo middleware que el
resto del Admin).

---

## Briefing inicial

Al abrir el panel, sin llamar a Gemini, el backend calcula y muestra:

- **Saludo** rotativo en español rioplatense (uno al azar de un pool).
- **4 KPIs visuales** en cards:
  - Pedidos activos (no entregados)
  - Atrasados
  - Por cobrar — todo pedido no-borrador con `payment_status=PENDIENTE`
    en cualquier estado del flujo (CREADO/EJECUTANDO/EJECUTADO/ENTREGADO)
  - Neto 30d — cash efectivo de la tabla `cash_transactions` (no incluye
    pipeline; ver "métricas distintas a propósito" abajo)
- **Highlights** dinámicos en bullets — solo aparecen los relevantes:
  - "N pedidos atrasados"
  - "N vencen en los próximos 3 días"
  - "$X pendientes de cobro"
  - "Stock bajo: <lista de materiales>"
  - "N impresiones en curso"
  - "Caja últimos 7 días: ±$X"
  - Si no hay alertas: "Todo tranquilo por ahora — sin alertas"
- **3-4 sugerencias contextuales** (chips clickeables) que se adaptan al
  estado actual del negocio.

---

## Tools — qué sabe consultar y hacer

### Lectura (`read`) — se ejecutan al instante

| Tool | Para qué sirve | Ejemplo de pregunta del usuario |
|---|---|---|
| `list_orders` | Lista pedidos filtrando por estado, pago, vencimiento o cliente. | "Mostrame los pedidos atrasados", "¿qué pedidos vencen esta semana?" |
| `get_order_detail` | Detalle completo de un pedido: costos, impresiones, cliente. | "Contame del pedido #237" |
| `search_catalog` | Busca productos del catálogo por nombre. | "¿Tenés algún dragón en el catálogo?" |
| `list_materials` | Stock y costo de filamentos/insumos. Filtra por tipo o "low stock". | "¿Qué material me falta reponer?", "¿Cuánto PLA tengo?" |
| `list_printers` | Estado de las impresoras (ocupada/libre). | "¿Qué impresoras tengo libres?" |
| `list_contacts` | Busca clientes y muestra deuda actual. | "¿Quién me debe plata?", "Buscame a Mariana" |
| `get_cash_summary` | Ingresos/egresos/neto por período (today/week/month/year). | "¿Cuánto facturé este mes?" |

### Escritura (`write`) — requieren confirmación explícita

Cuando el modelo decide ejecutar una mutación, **NO la ejecuta**.
En lugar de eso:
1. Genera un `confirmation_id` y guarda los args en cache (TTL 10 min).
2. Devuelve un `pending_action` al frontend con un preview legible.
3. El usuario ve un **ActionCard** con [Confirmar] / [Cancelar].
4. Solo si el usuario confirma se ejecuta el handler real.

| Tool | Qué hace | Ejemplo |
|---|---|---|
| `create_order` | Crea un pedido (producto + cliente + cantidad + opcional: valor, deadline, prioridad, nota). | "Creame un pedido para Mariana, 2 dragones rojos, $30.000, entrega el viernes." |
| `advance_order_status` | Avanza el pedido al siguiente estado del flujo (CREADO → EJECUTANDO → EJECUTADO → ENTREGADO). | "Marcame el pedido 234 como entregado." |
| `mark_order_paid` | Marca un pedido como `PAGADO`. El pedido debe tener valor cargado. | "Cobré el pedido de Juan." |
| `log_material_movement` | Registra IN (entrada), OUT (salida) o ADJUST (ajuste, delta) de stock. | "Registrame entrada de 1kg de PLA rojo." |

---

## Casos de uso típicos

### 1. Pregunta rápida sobre el estado
```
👤 ¿qué pedidos tengo atrasados?
🤖 [llama list_orders(overdue_only=true)]
   → Tenés 3 pedidos atrasados:
   📊 [DataCard con tabla]
   #234 · Dragón Rojo · Mariana · EJECUTANDO · vence 25/05
   #229 · Soporte celular · Ana · CREADO · vence 23/05
   #221 · Llavero logo · Juan · EJECUTADO · vence 20/05
```

### 2. Pregunta sobre caja
```
👤 ¿cuánto facturé este mes?
🤖 [llama get_cash_summary(period="month")]
   → Este mes facturaste $342.000 en ingresos, con $87.500 de
     egresos. Neto: $254.500.
   📊 [DataCard con tabla]
```

### 3. Cobrar un pedido (acción con confirmación)
```
👤 cobré el pedido 234
🤖 [llama mark_order_paid(order_id=234)]
   → Te marco el pedido como PAGADO. Confirmás?
   ✅ ActionCard:
     Marcar pedido como PAGADO
     Pedido: #234
     Cliente: Mariana López
     Valor: $30.000
     [Cancelar]  [Confirmar]
   ↓ [usuario clickea Confirmar]
🤖 → Listo. ¿Algo más?
```

### 4. Crear un pedido con datos faltantes
```
👤 creame un pedido para Mariana
🤖 → ¿Qué producto y cuántas unidades? Si me decís el valor y la fecha
     de entrega, mejor.
👤 2 dragones rojos, $30.000, viernes
🤖 [llama search_catalog(query="dragón")]
   [llama list_contacts(query="Mariana")]
   [llama create_order(...)]
   → Te armo este pedido. Confirmás?
   ✅ ActionCard: ...
```

### 5. Stock bajo
```
👤 ¿me alcanza el PLA negro para este pedido?
🤖 [llama list_materials(type="PLA")]
   → Tenés 120g de PLA Negro y necesitás 150g para el pedido —
     no te alcanza. ¿Querés que registre una entrada de filamento?
👤 sí, registrame 1kg
🤖 [llama log_material_movement(material_id=2, kind="IN", amount=1000)]
   → Registro la entrada. Confirmás?
   ✅ ActionCard: ...
```

---

## Flujograma de una acción crítica

```
Usuario escribe mensaje
         │
         ▼
   POST /chat ──────────────────────────┐
         │                              │
         ▼                              │
  Backend arma snapshot                 │
         + system prompt                │
         + historial                    │
         │                              │
         ▼                              │
   ┌─────────────┐                      │
   │   Gemini    │                      │
   └──────┬──────┘                      │
          │                             │
   ¿devuelve function_call?             │
       │       │                        │
      No      Sí                        │
       │       │                        │
       │  ┌────┴────┐                   │
       │  │ ¿read?  │                   │
       │  └────┬────┘                   │
       │     │   │                      │
       │    Sí  No (write)              │
       │     │   │                      │
       │     │   └─→ genera             │
       │     │       confirmation_id    │
       │     │       cachea args        │
       │     │       persiste action    │
       │     │       │                  │
       │     │       ▼                  │
       │     │   Devuelve pending_action│
       │     │   al frontend            │
       │     │       │                  │
       │     │       ▼                  │
       │     │   Frontend muestra       │
       │     │   ActionCard             │
       │     │       │                  │
       │     │   Usuario [Confirmar]?   │
       │     │       │       │          │
       │     │      Sí      No          │
       │     │       │       │          │
       │     │       ▼       ▼          │
       │     │   POST /confirm-action   │
       │     │       │                  │
       │     │       ▼                  │
       │     │   Ejecuta handler real   │
       │     │   (DB write)             │
       │     │       │                  │
       │     │       ▼                  │
       │     │   Persiste resultado     │
       │     │   en AssistantMessage    │
       │     │   role=action            │
       │     │                          │
       │     ▼                          │
       │  Ejecuta handler de lectura    │
       │  (DB read)                     │
       │  emite DataCard                │
       │  reinjecta resultado al modelo │
       │  ↑                             │
       │  └─── loop hasta max 8 turnos  │
       │                                │
       ▼                                │
   Texto final del modelo               │
         │                              │
         ▼                              │
   Persiste user + assistant msgs       │
   en AssistantConversation             │
         │                              │
         ▼                              │
   Frontend renderiza:                  │
   - MessageBubble con efecto tipeo     │
   - DataCard(s) si las hubo            │
   - ActionCard si hubo write           │
   - SuggestionChips contextuales       │
```

---

## Persistencia

| Tabla | Para qué |
|---|---|
| `assistant_conversations` | Una fila por conversación; guarda `title` (autogenerado del primer mensaje) y timestamps. |
| `assistant_messages` | Una fila por turno. `role` ∈ `user / assistant / tool / action`. Guarda `tool_name`, `tool_args_json`, `tool_result_json`, `confirmation_id`, `confirmed`. |

El `conversation_id` actual se persiste en `localStorage` del navegador
para que cerrar/abrir el panel mantenga el contexto. El botón **"+"** en
el header del panel inicia una conversación nueva.

---

## Convenciones del modelo (system prompt)

- Tono **rioplatense informal pero profesional** — usa "vos", "dale",
  "fijate"; nunca "tú".
- Respuestas cortas. Una pregunta = una respuesta directa.
- Plata: formato AR (`$12.500,50`).
- Fechas: `dd/mm`.
- **Listas:** cuando llama a `list_*` o `search_catalog`, NO repite los
  items en texto — el frontend ya muestra una DataCard con la tabla.
  Solo escribe una frase de contexto ("Tenés 3 materiales registrados:",
  "Estos son los pedidos atrasados:").
- **Mutaciones:** siempre pasan por confirmación. Si falta un dato,
  pregunta antes de proponer la acción.
- **No inventa** datos que no estén en el snapshot ni en una tool.

---

## UI — qué ve el usuario

| Componente | Función |
|---|---|
| `AssistantFAB` | Botón flotante con badge de alertas (atrasados + stock bajo). |
| `AssistantPanel` | Sheet de 420px que se desliza desde la derecha con `backdrop-filter: blur`. |
| `BriefingCard` | Saludo + 4 KPIs en cards + highlights en bullets animados. |
| `MessageBubble` | Burbujas tipo iMessage. Para `assistant`, anima la aparición del texto carácter por carácter con cursor parpadeante (`▌`). |
| `DataCards` | Tablas inline tipadas por tool (pedidos, materiales, clientes, productos, impresoras, caja). |
| `ActionCard` | Tarjeta destacada con título + tabla de campos + botones Confirmar/Cancelar. Cambia estilo según estado (pending/confirming/done/canceled). |
| `SuggestionChips` | 3-4 chips contextuales arriba del composer. Se regeneran tras cada turno. |
| `Composer` | Textarea auto-resize + botón enviar. Enter envía, Shift+Enter newline. |

Atajos:
- `Ctrl/Cmd + /` → abrir/cerrar panel.
- `Esc` (futuro — no implementado todavía) → cerrar.

---

## Métricas distintas a propósito

| Métrica | Refleja | Cuándo cambia |
|---|---|---|
| **Por cobrar** | Pipeline de cobranza (lo comprometido) | Al crear un pedido con valor sin pagar |
| **Neto 30d / Cash** | Caja efectiva (lo que pasó) | Al marcar pedido como PAGADO o al registrar un movimiento de caja |

Mezclarlas en una sola métrica engaña la lectura: contaríamos el mismo
pedido dos veces (primero como expectativa, después como ingreso real).

---

## Lo que el bot NO hace todavía (limitaciones del MVP)

- **No** envía notificaciones proactivas (push, badge en tiempo real, etc.).
  La proactividad actual se limita al briefing al abrir el panel y al badge
  estático del FAB.
- **No** genera gráficos / charts inline. Los KPIs son texto + cards.
- **No** procesa imágenes ni audio. Solo texto.
- **No** persiste contexto a través de múltiples conversaciones (cada
  conversación arranca con snapshot fresco; no recuerda preferencias del
  usuario entre charlas).
- **No** soporta multi-usuario / multi-tenant (single shop owner).
- **No** ejecuta acciones autónomas sin confirmación.
- **No** integra con servicios externos (WhatsApp, email, MercadoPago).
- **No** sugiere precios ni hace cotizaciones complejas — eso es la
  Calculadora.

---

## Archivos clave

**Backend (`backend/app/`)**
- `routes/assistant.py` — 4 endpoints REST
- `services/assistant/__init__.py` — exports públicos
- `services/assistant/engine.py` — orquestador Gemini + tool loop
- `services/assistant/tools.py` — registro de 11 tools (declaration + handler + preview)
- `services/assistant/snapshot.py` — builder del snapshot + highlights + suggestions
- `services/assistant/prompts.py` — system prompt + saludos
- `services/assistant/confirmations.py` — cache TTL 10 min de pending actions
- `models.py` — `AssistantConversation` + `AssistantMessage`

**Frontend (`frontend/src/assistant/`)**
- `AssistantProvider.tsx` — Context global, manejo de mensajes y conexión API
- `AssistantFAB.tsx` — botón flotante
- `AssistantPanel.tsx` — sheet deslizable
- `MessageList.tsx` — render del array de mensajes
- `MessageBubble.tsx` — burbujas con efecto tipeo
- `BriefingCard.tsx` — card inicial con KPIs
- `ActionCard.tsx` — confirmación de mutaciones
- `DataCards.tsx` — tablas tipadas por tool
- `SuggestionChips.tsx` — chips de sugerencias
- `Composer.tsx` — input multiline
- `api.ts` — wrappers fetch tipados
- `types.ts` — espejos de los responses backend
- `styles.css` — todo el CSS local sobre los design tokens existentes

---

## Roadmap (ideas pendientes)

- Notificaciones push (cron) ante eventos críticos: filamento crítico,
  pedido vencido sin avance, run pausada hace > X min.
- Voice input (transcripción) y respuesta hablada opcional.
- Generación de gráficos inline (Recharts) para resúmenes de caja /
  rentabilidad / producción.
- Recordar preferencias del usuario entre conversaciones (ej. "siempre
  mostrame los pedidos en orden de vencimiento").
- Más tools: cambio de prioridad de pedido, programar producción,
  reasignar impresora, generar cotización.
- Integración con WhatsApp para que clientes vean estado de su pedido.

---

## Changelog

Toda modificación al asistente debe sumar una entrada acá, en orden
cronológico inverso (lo más nuevo arriba). Formato:
**YYYY-MM-DD** — descripción concisa de qué cambió y por qué.

- **2026-05-28** — Versión inicial del Gerente Bot. 11 tools (7 read + 4
  write), briefing determinístico, panel deslizable 420px, persistencia
  de conversaciones en `assistant_conversations` + `assistant_messages`,
  confirmación explícita para mutaciones.
- **2026-05-28** — Fix: el modelo duplicaba la respuesta (texto + DataCard)
  al llamar tools de listado. Se ajustó el system prompt para que en
  `list_*` y `search_catalog` el modelo escriba solo una frase de
  contexto y deje la tabla al frontend.
- **2026-05-28** — Fix: la métrica "por cobrar" del briefing solo contaba
  pedidos en `EJECUTADO` o `ENTREGADO`. Ahora suma todo pedido no-borrador
  con `payment_status="PENDIENTE"`, incluyendo `CREADO` y `EJECUTANDO`.
  Mismo cambio aplicado a `deudores_top` y a la tool `list_contacts`
  cuando filtra por `has_debt`.
