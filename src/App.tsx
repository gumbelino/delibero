import { useData } from "./state/useData";
import { useWizard } from "./state/wizardStore";
import { Wizard } from "./components/Wizard";
import { AnswersSidebar } from "./components/AnswersSidebar";
import { Results } from "./components/results/Results";

export default function App() {
  const { templates, tree, loading, error } = useData();
  const showResults = useWizard((s) => s.showResults);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Deliberation Process Design Tool</h1>
        <p className="app-tagline">
          Answer a few questions about your goals and constraints, and get research-based,
          fully traceable recommendations for designing your deliberative process.
        </p>
      </header>

      <main className="app-main">
        {loading && <p className="app-status">Loading…</p>}
        {error && (
          <p className="app-status app-error">
            Could not load the recommendation data: {error}
          </p>
        )}
        {!loading && !error && (
          <div className="app-layout">
            <div className="app-content">
              {showResults ? <Results templates={templates} tree={tree} /> : <Wizard />}
            </div>
            <AnswersSidebar />
          </div>
        )}
      </main>

      <footer className="app-footer no-print">
        <p>
          DPDT · A research-based educational tool. Recommendations are illustrative and
          editable by the research team.
        </p>
      </footer>
    </div>
  );
}
