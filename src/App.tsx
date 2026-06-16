import { Routes, Route } from "react-router-dom";
import { useData } from "./state/useData";
import { useWizard } from "./state/wizardStore";
import { AnswersSidebar } from "./components/AnswersSidebar";
import { Results } from "./components/results/Results";
import { Landing } from "./pages/Landing";
import { Wizard } from "./pages/Wizard";
import { AllRecommendations } from "./pages/AllRecommendations";

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

function Shell({ children, sidebar = false, solo = false }: {
  children: React.ReactNode;
  sidebar?: boolean;
  solo?: boolean;
}) {
  const content = solo ? <div className="app-content-solo">{children}</div> : children;
  return (
    <>
      <header className="app-header no-print">
        <div className="app-header-inner">
          <NavLogo />
        </div>
      </header>
      <div className="app">
        <main className="app-main">
          {sidebar ? (
            <div className="app-layout">
              <div className="app-content">{content}</div>
              <AnswersSidebar />
            </div>
          ) : content}
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

function MainApp() {
  const { templates, tree, recommendations, loading, error } = useData();
  const showResults = useWizard((s) => s.showResults);
  const showLanding = useWizard((s) => s.showLanding);

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;
  if (showLanding) return <Shell solo><Landing /></Shell>;

  return (
    <Shell sidebar>
      {showResults
        ? <Results templates={templates} tree={tree} recommendations={recommendations} />
        : <Wizard />}
    </Shell>
  );
}

function RecommendationsPage() {
  const { recommendations, loading, error } = useData();

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  return (
    <Shell solo>
      <AllRecommendations recommendations={recommendations} />
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
