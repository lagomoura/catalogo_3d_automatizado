import { BrowserMockup } from "./BrowserMockup";
import { PieceSilhouette } from "./PieceSilhouette";

/** Comparación "Original" vs "Con tu marca" para la re-estilización con IA:
 *  la misma pieza, apagada a la izquierda y con la identidad de marca a la derecha. */
export function BeforeAfterMockup() {
  return (
    <BrowserMockup url="aura3d.com/estudio">
      <div className="mock-ba">
        <div className="mock-ba__panel mock-ba__panel--before">
          <PieceSilhouette className="mock-ba__piece" />
          <span className="mock-ba__label">Original</span>
        </div>
        <div className="mock-ba__divider" />
        <div className="mock-ba__panel mock-ba__panel--after">
          <PieceSilhouette className="mock-ba__piece" />
          <span className="mock-ba__chip">Gemini</span>
          <span className="mock-ba__label">Con tu marca</span>
        </div>
      </div>
    </BrowserMockup>
  );
}
