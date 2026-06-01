const CARDS = [
  { value: "20 min → 2 min", label: "Armar una ficha de producto" },
  { value: "5 apps → 1", label: "Catálogo, caja, pedidos, presupuestos y producción" },
  { value: "$0", label: "en diseñadores — la IA estiliza por vos" },
  { value: "24/7", label: "tu vitrina vende mientras imprimís" },
];

export function Stats() {
  return (
    <section className="landing__stats">
      <div className="landing__container">
        <h2 className="landing__section-title reveal">
          De la URL al producto, sin pasos manuales
        </h2>
        <div className="landing__stats-grid">
          {CARDS.map((c) => (
            <div className="landing__stat-card reveal" key={c.label}>
              <span className="landing__stat-value">{c.value}</span>
              <span className="landing__stat-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
