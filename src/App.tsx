import { useData } from "./state/useData";
import { useWizard } from "./state/wizardStore";
import { Wizard } from "./components/Wizard";
import { AnswersSidebar } from "./components/AnswersSidebar";
import { Results } from "./components/results/Results";
import { Landing } from "./components/Landing";

function NavLogo() {
  const goHome = useWizard((s) => s.goHome);
  return (
    <button type="button" className="app-logo" onClick={goHome} aria-label="Go to home">
      <svg className="app-logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="64 96 512 512" aria-hidden="true">
        <path fill="#fff" d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z" />
      </svg>
      <span className="app-title">delibero</span>
    </button>
  );
}

export default function App() {
  const { templates, tree, loading, error } = useData();
  const showResults = useWizard((s) => s.showResults);
  const showLanding = useWizard((s) => s.showLanding);

  return (
    <>
      <header className="app-header no-print">
        <div className="app-header-inner">
          <NavLogo />
        </div>
      </header>

      <div className="app">
        <main className="app-main">
          {loading && <p className="app-status">Loading…</p>}
          {error && (
            <p className="app-status app-error">
              Could not load the recommendation data: {error}
            </p>
          )}
          {!loading && !error && showLanding && <Landing />}
          {!loading && !error && !showLanding && (
            <div className="app-layout">
              <div className="app-content">
                {showResults ? <Results templates={templates} tree={tree} /> : <Wizard />}
              </div>
              <AnswersSidebar />
            </div>
          )}
        </main>

        <footer className="app-footer no-print">
          <div className="footer-meta">
            <span>AI4Deliberation WP2</span>
            <span>Francesco Veri, Gustavo Umbelino</span>
            <span>University of Zurich (UZH)</span>
            <span>EU Horizon RIA &middot; Grant Agreement 101178806</span>
            <a href="https://www.ai4dproject.eu/" target="_blank" rel="noopener noreferrer">
              ai4dproject.eu
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
