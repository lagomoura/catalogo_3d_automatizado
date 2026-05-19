import { useId } from "react";
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

/**
 * La persona SIEMPRE se persiste como contacto (el backend la crea si no
 * existe), para poder armar el historial de compras por persona. Por eso ya
 * no hay opción "guardar como contacto": escribir un nombre nuevo lo guarda.
 */
export function ContactPicker({ contacts, value, onChange }: Props) {
  const listId = useId();

  const matched = (text: string): Contact | undefined =>
    contacts.find(
      (c) => c.name.trim().toLowerCase() === text.trim().toLowerCase(),
    );

  const handleText = (text: string) => {
    const hit = matched(text);
    onChange({ contactId: hit ? hit.id : null, personLabel: text });
  };

  const isKnown = value.contactId !== null;
  const isNew = !isKnown && value.personLabel.trim().length > 0;

  return (
    <div className="field">
      <label htmlFor={listId}>Persona</label>
      <input
        id={listId}
        list={`${listId}-options`}
        type="text"
        placeholder="Nombre de la persona…"
        value={value.personLabel}
        onChange={(e) => handleText(e.target.value)}
        autoComplete="off"
      />
      <datalist id={`${listId}-options`}>
        {contacts.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      {isKnown && <span className="hint hint--ok">✓ Contacto guardado</span>}
      {isNew && (
        <span className="hint">Se guardará como contacto nuevo</span>
      )}
    </div>
  );
}
