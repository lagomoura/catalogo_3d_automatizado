import { useId } from "react";
import type { Contact } from "../../types";

export interface PersonValue {
  contactId: number | null;
  personLabel: string;
  saveContact: boolean;
}

interface Props {
  contacts: Contact[];
  value: PersonValue;
  onChange: (v: PersonValue) => void;
}

export function ContactPicker({ contacts, value, onChange }: Props) {
  const listId = useId();

  const matched = (text: string): Contact | undefined =>
    contacts.find((c) => c.name.trim().toLowerCase() === text.trim().toLowerCase());

  const handleText = (text: string) => {
    const hit = matched(text);
    onChange({
      contactId: hit ? hit.id : null,
      personLabel: text,
      saveContact: hit ? false : value.saveContact,
    });
  };

  const isKnown = value.contactId !== null;
  const showSave = value.personLabel.trim().length > 0 && !isKnown;

  return (
    <div className="field">
      <label htmlFor={listId}>Persona pagante</label>
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
      {isKnown && (
        <span className="hint hint--ok">✓ Contacto guardado</span>
      )}
      {showSave && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={value.saveContact}
            onChange={(e) =>
              onChange({ ...value, saveContact: e.target.checked })
            }
          />
          Guardar como contacto
        </label>
      )}
    </div>
  );
}
