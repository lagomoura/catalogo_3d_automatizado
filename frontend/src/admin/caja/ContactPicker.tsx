import { useId, useMemo } from "react";
import type { Contact } from "../../types";

export interface PersonValue {
  contactId: number | null;
  personLabel: string;
}

interface Props {
  contacts: Contact[];
  value: PersonValue;
  onChange: (v: PersonValue) => void;
}

const NONE = "";
const NEW = "__new__";

/**
 * La persona SIEMPRE se persiste como contacto (el backend la crea si no
 * existe), para poder armar el historial de compras por persona.
 *
 * El selector muestra TODAS las personas guardadas para poder asociar el
 * pedido a un cliente existente; "Persona nueva…" habilita el campo de texto
 * para escribir un nombre que se guardará como contacto.
 */
export function ContactPicker({ contacts, value, onChange }: Props) {
  const selectId = useId();
  const textId = useId();

  const sorted = useMemo(
    () => [...contacts].sort((a, b) => a.name.localeCompare(b.name)),
    [contacts],
  );

  // El <select> está en modo "nueva persona" cuando hay texto escrito pero
  // todavía no coincide con un contacto guardado.
  const isNew = value.contactId === null && value.personLabel.trim().length > 0;
  const selectValue = value.contactId !== null
    ? String(value.contactId)
    : isNew
      ? NEW
      : NONE;

  const handleSelect = (raw: string) => {
    if (raw === NONE) {
      onChange({ contactId: null, personLabel: "" });
      return;
    }
    if (raw === NEW) {
      onChange({ contactId: null, personLabel: "" });
      return;
    }
    const hit = sorted.find((c) => String(c.id) === raw);
    onChange({ contactId: hit ? hit.id : null, personLabel: hit?.name ?? "" });
  };

  const matched = (text: string): Contact | undefined =>
    contacts.find(
      (c) => c.name.trim().toLowerCase() === text.trim().toLowerCase(),
    );

  const handleText = (text: string) => {
    const hit = matched(text);
    onChange({ contactId: hit ? hit.id : null, personLabel: text });
  };

  return (
    <div className="field">
      <label htmlFor={selectId}>Persona</label>
      <select
        id={selectId}
        value={selectValue}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value={NONE}>— Sin persona —</option>
        {sorted.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
        <option value={NEW}>＋ Persona nueva…</option>
      </select>

      {selectValue === NEW && (
        <input
          id={textId}
          type="text"
          placeholder="Nombre de la persona nueva…"
          value={value.personLabel}
          onChange={(e) => handleText(e.target.value)}
          autoComplete="off"
          autoFocus
        />
      )}

      {value.contactId !== null && (
        <span className="hint hint--ok">✓ Contacto guardado</span>
      )}
      {isNew && (
        <span className="hint">Se guardará como contacto nuevo</span>
      )}
    </div>
  );
}
