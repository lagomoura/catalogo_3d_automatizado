import { BrowserMockup } from "./BrowserMockup";

const NAV = ["Caja", "Pedidos", "Clientes", "Producción"];
const TILES = [
  { label: "Caja hoy", value: "$48.200", bars: [40, 65, 50, 80, 60, 95] },
  { label: "Pedidos", value: "14", bars: [30, 55, 45, 70, 60, 85] },
  { label: "En producción", value: "3", bars: [50, 40, 70, 55, 80, 65] },
];

/** Back-office simulado: rail de navegación + tiles con sparklines. */
export function DashboardMockup() {
  return (
    <BrowserMockup url="aura3d.com/admin">
      <div className="mock-dash">
        <div className="mock-dash__rail">
          {NAV.map((item, i) => (
            <span
              className={`mock-dash__pill${i === 1 ? " mock-dash__pill--active" : ""}`}
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mock-dash__tiles">
          {TILES.map((t) => (
            <div className="mock-dash__tile" key={t.label}>
              <span className="mock-dash__tile-label">{t.label}</span>
              <span className="mock-dash__tile-value">{t.value}</span>
              <span className="mock-dash__spark">
                {t.bars.map((h, i) => (
                  <i key={i} style={{ height: `${h}%` }} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BrowserMockup>
  );
}
