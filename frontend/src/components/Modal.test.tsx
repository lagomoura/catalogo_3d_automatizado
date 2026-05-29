import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("no renderiza nada cuando open=false", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <p>contenido</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza children y cierra con Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose}>
        <button>Aceptar</button>
      </Modal>,
    );
    expect(screen.getByText("Aceptar")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("mueve el foco al primer elemento enfocable al abrir (focus-trap)", () => {
    render(
      <Modal open onClose={() => {}}>
        <button>Primero</button>
        <button>Segundo</button>
      </Modal>,
    );
    expect(screen.getByText("Primero")).toHaveFocus();
  });

  it("restaura el foco al disparador al cerrar", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { rerender } = render(
      <Modal open onClose={() => {}}>
        <button>X</button>
      </Modal>,
    );
    expect(screen.getByText("X")).toHaveFocus();

    rerender(
      <Modal open={false} onClose={() => {}}>
        <button>X</button>
      </Modal>,
    );
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
