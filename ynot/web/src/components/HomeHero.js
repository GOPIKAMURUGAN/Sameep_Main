export default function HomeHero({ onSetup }) {
  return (
    <section className="panel">
      <p className="eyebrow">YNOT</p>
      <h1>YNOT - Get Your Business Online</h1>
      <p className="subtitle">
        Launch your business presence with a focused onboarding flow.
      </p>
      <button className="primary-button" type="button" onClick={onSetup}>
        Set up my business
      </button>
    </section>
  );
}
