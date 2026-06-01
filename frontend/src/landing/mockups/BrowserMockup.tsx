import type { ReactNode } from "react";

/**
 * Marco decorativo con "chrome" de navegador. Reusado por varios mockups de la
 * landing. Es puramente ornamental → aria-hidden.
 */
export function BrowserMockup({
  url = "tu-tienda.aura3d.com",
  children,
}: {
  url?: string;
  children: ReactNode;
}) {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock__chrome">
        <span className="mock__dots">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span className="mock__url">{url}</span>
      </div>
      <div className="mock__body">{children}</div>
    </div>
  );
}
