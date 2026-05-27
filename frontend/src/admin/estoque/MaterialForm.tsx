import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Material,
  MaterialCreatePayload,
  MaterialKind,
  MaterialUnit,
  MaterialUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  material?: Material | null;
  onClose: () => void;
  onCreate: (payload: MaterialCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: MaterialUpdatePayload) => Promise<void>;
}

type FilamentKind = "PLA" | "PETG" | "ABS" | "TPU";
type OtherKind = "RESIN" | "OTRO";

const FILAMENT_KINDS: { value: FilamentKind; label: string; hint: string }[] = [
  { value: "PLA", label: "PLA", hint: "El más común — fácil de imprimir" },
  { value: "PETG", label: "PETG", hint: "Resistente, ligeramente flexible" },
  { value: "ABS", label: "ABS", hint: "Técnico, resistente al calor" },
  { value: "TPU", label: "TPU", hint: "Flexible, gomoso" },
];

const COLOR_SUGGESTIONS = [
  { label: "Blanco", swatch: "#f4f4f4" },
  { label: "Negro", swatch: "#1a1a1a" },
  { label: "Gris", swatch: "#888" },
  { label: "Rojo", swatch: "#d63131" },
  { label: "Azul", swatch: "#3061d6" },
  { label: "Verde", swatch: "#2da44e" },
  { label: "Amarillo", swatch: "#f1c40f" },
  { label: "Naranja", swatch: "#e67e22" },
  { label: "Transparente", swatch: "linear-gradient(135deg,#eee,#bbb)" },
];

const UNIT_OPTIONS: {
  value: MaterialUnit;
  label: string;
  desc: string;
  qtyLabel: string;
  qtyPlaceholder: string;
  costLabel: string;
  costPlaceholder: string;
  // Si true, el costo se divide por 1000 para convertir a cost_per_unit
  // (kg → g, L → ml). Si false, se guarda tal cual (por unidad).
  costPerThousand: boolean;
}[] = [
  {
    value: "g",
    label: "Gramos",
    desc: "Filamento, resina, polvo",
    qtyLabel: "Cantidad inicial (g)",
    qtyPlaceholder: "1000",
    costLabel: "Costo por kilo (ARS)",
    costPlaceholder: "ej. 24000",
    costPerThousand: true,
  },
  {
    value: "un",
    label: "Unidades",
    desc: "Imanes, tornillos, packaging",
    qtyLabel: "Cantidad inicial (unidades)",
    qtyPlaceholder: "ej. 100",
    costLabel: "Costo por unidad (ARS)",
    costPlaceholder: "ej. 25",
    costPerThousand: false,
  },
  {
    value: "ml",
    label: "Mililitros",
    desc: "Pinturas, líquidos no-resina",
    qtyLabel: "Cantidad inicial (ml)",
    qtyPlaceholder: "ej. 500",
    costLabel: "Costo por litro (ARS)",
    costPlaceholder: "ej. 4500",
    costPerThousand: true,
  },
];

const findUnit = (u: MaterialUnit) =>
  UNIT_OPTIONS.find((o) => o.value === u) ?? UNIT_OPTIONS[0];

type Category = "FILAMENT" | "OTHER" | null;

const toNumberOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const detectCategoryFromMaterial = (m: Material | null | undefined): Category => {
  if (!m) return null;
  if (m.type === "RESIN" || m.type === "OTRO") return "OTHER";
  return "FILAMENT";
};

const buildAutoName = (type: string, color: string) => {
  const parts = [type, color.trim()].filter(Boolean);
  return parts.join(" ");
};

export function MaterialForm({
  open,
  material,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!material;
  const [category, setCategory] = useState<Category>(
    detectCategoryFromMaterial(material),
  );

  // Filament-specific
  const [filType, setFilType] = useState<FilamentKind>("PLA");
  const [filColor, setFilColor] = useState("");
  // Other-specific
  const [otherType, setOtherType] = useState<OtherKind>("OTRO");
  const [unit, setUnit] = useState<MaterialUnit>("g");

  // Common
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [stockQty, setStockQty] = useState("1000");
  const [costInput, setCostInput] = useState("");
  const [notes, setNotes] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    const cat = detectCategoryFromMaterial(material);
    setCategory(cat);
    setError(null);
    setShowMore(false);
    setSubmitting(false);
    setNameTouched(!!material?.name);

    if (material) {
      // Edit mode
      const mUnit = (material.unit ?? "g") as MaterialUnit;
      setUnit(mUnit);
      if (cat === "FILAMENT") {
        setFilType(material.type as FilamentKind);
        setFilColor(material.color ?? "");
      } else if (cat === "OTHER") {
        setOtherType(material.type as OtherKind);
        setFilColor(material.color ?? "");
      }
      setName(material.name ?? "");
      setBrand(material.brand ?? "");
      setModel(material.model ?? "");
      setStockQty("");
      // cost_per_g (stored) → cost input (display).
      // Si la unidad usa "per thousand" (g→kg, ml→L), multiplico ×1000;
      // si es "un", se muestra tal cual.
      const opt = findUnit(mUnit);
      const display =
        material.cost_per_g != null
          ? opt.costPerThousand
            ? material.cost_per_g * 1000
            : material.cost_per_g
          : null;
      setCostInput(display != null ? display.toString() : "");
      setNotes(material.notes ?? "");
    } else {
      // Create mode
      setFilType("PLA");
      setOtherType("OTRO");
      setUnit("g");
      setFilColor("");
      setName("");
      setBrand("");
      setModel("");
      setStockQty("1000");
      setCostInput("");
      setNotes("");
    }
  }, [open, material?.id]);

  // Cuando elige categoría Filamento, fuerzo unit=g (los filamentos siempre van por gramo).
  useEffect(() => {
    if (category === "FILAMENT") setUnit("g");
  }, [category]);

  // Auto-naming for filament — only if user hasn't touched the name input
  const autoName = useMemo(
    () => (category === "FILAMENT" ? buildAutoName(filType, filColor) : ""),
    [category, filType, filColor],
  );

  useEffect(() => {
    if (category === "FILAMENT" && !nameTouched) {
      setName(autoName);
    }
  }, [autoName, category, nameTouched]);

  const unitOpt = findUnit(unit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) {
      setError("El nombre es obligatorio.");
      return;
    }
    const type: MaterialKind =
      category === "FILAMENT" ? filType : otherType;
    const rawCost = toNumberOrNull(costInput);
    // Convierto el costo del display al storage (cost_per_g column).
    // g  → cost_per_kg / 1000
    // ml → cost_per_L  / 1000
    // un → cost_per_unit (sin convertir, se guarda tal cual)
    const costPerG =
      rawCost == null ? 0 : unitOpt.costPerThousand ? rawCost / 1000 : rawCost;

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && material) {
        const payload: MaterialUpdatePayload = {
          name: finalName,
          type,
          color: filColor.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          cost_per_g: costPerG,
          unit,
          notes: notes.trim() || null,
        };
        await onUpdate(material.id, payload);
      } else {
        const payload: MaterialCreatePayload = {
          name: finalName,
          type,
          color: filColor.trim() || null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          stock_g: toNumberOrNull(stockQty) ?? 0,
          cost_per_g: costPerG,
          unit,
          notes: notes.trim() || null,
        };
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Step 1: category selector ---
  if (open && category === null) {
    return (
      <Modal open={open} onClose={onClose} size="md" labelledBy="material-form-title">
        <Modal.Header onClose={onClose} id="material-form-title">
          Novo material
        </Modal.Header>
        <Modal.Body>
          <p className="form-hint" style={{ marginBottom: "1rem" }}>
            ¿Qué tipo de material querés cadastrar?
          </p>
          <div className="mat-choice">
            <button
              type="button"
              className="mat-choice__card"
              onClick={() => setCategory("FILAMENT")}
            >
              <span className="mat-choice__emoji" aria-hidden>
                🧵
              </span>
              <span className="mat-choice__title">Filamento</span>
              <span className="mat-choice__desc">
                PLA, PETG, ABS, TPU — el nombre se arma automáticamente con
                tipo + color.
              </span>
              <span className="mat-choice__badge">Recomendado</span>
            </button>
            <button
              type="button"
              className="mat-choice__card"
              onClick={() => setCategory("OTHER")}
            >
              <span className="mat-choice__emoji" aria-hidden>
                📦
              </span>
              <span className="mat-choice__title">Otros materiales</span>
              <span className="mat-choice__desc">
                Resina, imanes, tornillos, pinturas… podés cargarlos por
                gramo, por unidad o por mililitro.
              </span>
            </button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </Modal.Footer>
      </Modal>
    );
  }

  // --- Step 2: form ---
  const isFilament = category === "FILAMENT";

  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="material-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="material-form-title">
          {isEdit
            ? "Editar material"
            : isFilament
              ? "Novo filamento"
              : "Novo material"}
        </Modal.Header>
        <Modal.Body>
          {!isEdit ? (
            <button
              type="button"
              className="mat-form__back"
              onClick={() => setCategory(null)}
            >
              ← Cambiar tipo de material
            </button>
          ) : null}

          {isFilament ? (
            <>
              <section className="mat-form__section">
                <header className="mat-form__section-h">Tipo de filamento</header>
                <div className="mat-pills">
                  {FILAMENT_KINDS.map((k) => (
                    <button
                      type="button"
                      key={k.value}
                      className={`mat-pill ${filType === k.value ? "is-active" : ""}`}
                      onClick={() => setFilType(k.value)}
                    >
                      <strong>{k.label}</strong>
                      <span>{k.hint}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mat-form__section">
                <header className="mat-form__section-h">Color</header>
                <div className="mat-chips">
                  {COLOR_SUGGESTIONS.map((c) => {
                    const active =
                      filColor.trim().toLowerCase() === c.label.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={c.label}
                        className={`mat-chip ${active ? "is-active" : ""}`}
                        onClick={() => setFilColor(c.label)}
                      >
                        <span
                          className="mat-chip__swatch"
                          style={{ background: c.swatch }}
                        />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="mat-form__input"
                  value={filColor}
                  onChange={(e) => setFilColor(e.target.value)}
                  placeholder="…o escribilo a mano"
                />
              </section>

              <section className="mat-form__section">
                <header className="mat-form__section-h">Nombre</header>
                <input
                  type="text"
                  className="mat-form__input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameTouched(true);
                  }}
                  placeholder="se completa automáticamente…"
                  required
                />
                {!nameTouched && autoName ? (
                  <p className="form-hint">
                    Generado automáticamente. Tocá el campo para editar.
                  </p>
                ) : nameTouched && autoName && name !== autoName ? (
                  <button
                    type="button"
                    className="mat-form__link"
                    onClick={() => {
                      setName(autoName);
                      setNameTouched(false);
                    }}
                  >
                    Volver al nombre automático ({autoName})
                  </button>
                ) : null}
              </section>
            </>
          ) : (
            <>
              <section className="mat-form__section">
                <header className="mat-form__section-h">Tipo</header>
                <div className="mat-pills mat-pills--compact">
                  {(["RESIN", "OTRO"] as OtherKind[]).map((k) => (
                    <button
                      type="button"
                      key={k}
                      className={`mat-pill ${otherType === k ? "is-active" : ""}`}
                      onClick={() => {
                        setOtherType(k);
                        // Sugerencia: resina por defecto en gramos
                        if (k === "RESIN" && !isEdit) setUnit("g");
                      }}
                    >
                      <strong>{k === "RESIN" ? "Resina" : "Otro"}</strong>
                      <span>
                        {k === "RESIN"
                          ? "SLA / LCD / DLP"
                          : "Cualquier otro insumo"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mat-form__section">
                <header className="mat-form__section-h">Unidad de medida</header>
                <div className="mat-pills">
                  {UNIT_OPTIONS.map((u) => (
                    <button
                      type="button"
                      key={u.value}
                      className={`mat-pill ${unit === u.value ? "is-active" : ""}`}
                      onClick={() => setUnit(u.value)}
                    >
                      <strong>{u.label}</strong>
                      <span>{u.desc}</span>
                    </button>
                  ))}
                </div>
                {isEdit ? (
                  <p className="form-hint">
                    Cambiar la unidad reinterpreta los valores actuales —
                    revisá que stock y costo queden coherentes después.
                  </p>
                ) : null}
              </section>

              <section className="mat-form__section">
                <header className="mat-form__section-h">Nombre *</header>
                <input
                  type="text"
                  className="mat-form__input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameTouched(true);
                  }}
                  placeholder="ej. Imanes 3×5 mm / Resina ámbar / Tornillos M3…"
                  required
                  autoFocus
                />
              </section>
            </>
          )}

          <section className="mat-form__section">
            <header className="mat-form__section-h">
              {isFilament ? "Bobina y precio" : "Cantidad y precio"}
            </header>
            <div className="mat-form__row">
              {!isEdit ? (
                <label className="mat-form__field">
                  <span>{unitOpt.qtyLabel}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder={unitOpt.qtyPlaceholder}
                  />
                </label>
              ) : null}
              <label className="mat-form__field">
                <span>{unitOpt.costLabel}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  placeholder={unitOpt.costPlaceholder}
                />
              </label>
            </div>
            {isEdit ? (
              <p className="form-hint">
                Para cambiar el stock usá un movimiento (IN / OUT / ADJUST) — así
                queda auditado.
              </p>
            ) : null}
          </section>

          <button
            type="button"
            className="mat-form__toggle"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
          >
            {showMore ? "− Ocultar detalles" : "+ Más detalles (marca, modelo, notas)"}
          </button>

          {showMore ? (
            <section className="mat-form__section mat-form__section--more">
              <div className="mat-form__row">
                <label className="mat-form__field">
                  <span>Marca</span>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="3D Fila, Bambu, Anycubic…"
                  />
                </label>
                <label className="mat-form__field">
                  <span>Modelo / línea</span>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="HD / Pro / Silk…"
                  />
                </label>
              </div>
              <label className="mat-form__field">
                <span>Notas</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Perfil de impresión, temperatura, observaciones…"
                />
              </label>
            </section>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? "Guardando…"
              : isEdit
                ? "Guardar"
                : "Registrar material"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
