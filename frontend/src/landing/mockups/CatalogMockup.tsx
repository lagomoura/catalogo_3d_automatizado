import { BrowserMockup } from "./BrowserMockup";
import { PieceSilhouette } from "./PieceSilhouette";

const PRODUCTS = [
  { name: "Maceta hexagonal", price: "$3.900" },
  { name: "Soporte auriculares", price: "$5.200" },
  { name: "Lámpara espiral", price: "$8.400" },
  { name: "Organizador", price: "$4.100" },
  { name: "Dragón articulado", price: "$6.700" },
  { name: "Llavero", price: "$1.500" },
];

/** Vitrina pública simulada: grilla de productos con pieza 3D, badge y precio. */
export function CatalogMockup() {
  return (
    <BrowserMockup>
      <div className="mock-catalog">
        {PRODUCTS.map((p, i) => (
          <div className="mock-catalog__card" key={p.name}>
            <div className={`mock-catalog__media mock-catalog__media--${(i % 3) + 1}`}>
              <span className="mock-catalog__badge">3D</span>
              <PieceSilhouette className="mock-catalog__piece" />
            </div>
            <span className="mock-catalog__name">{p.name}</span>
            <div className="mock-catalog__row">
              <span className="mock-catalog__price">{p.price}</span>
              <span className="mock-catalog__dot" />
            </div>
          </div>
        ))}
      </div>
    </BrowserMockup>
  );
}
