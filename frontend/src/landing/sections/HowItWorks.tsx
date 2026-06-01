const STEPS = [
  {
    num: "01",
    title: "Pegás el link",
    body: "Traés un modelo desde MakerWorld con su URL. Aura3D importa fotos, ficha y datos del modelo.",
  },
  {
    num: "02",
    title: "La IA lo viste con tu marca",
    body: "Flux + Trellis generan imágenes estilizadas y un modelo 3D navegable. Gemini reestiliza con tu identidad visual.",
  },
  {
    num: "03",
    title: "Publicás y vendés",
    body: "Tu producto queda en tu vitrina en <tu-tienda>.aura3d.com, con visor 3D y precio ya calculado.",
  },
];

export function HowItWorks() {
  return (
    <section className="landing__steps" id="como-funciona">
      <div className="landing__container">
        <h2 className="landing__section-title reveal">Cómo funciona</h2>
        <p className="landing__section-sub reveal">
          Tres pasos. El resto lo hace Aura3D.
        </p>
        <div className="landing__steps-grid">
          {STEPS.map((s) => (
            <div className="landing__step reveal" key={s.num}>
              <span className="landing__step-num">{s.num}</span>
              <h3 className="landing__step-title">{s.title}</h3>
              <p className="landing__step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
