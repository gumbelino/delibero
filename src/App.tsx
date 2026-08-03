import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import type { Question } from "./types";
import { useData } from "./state/useData";
import { useWizard } from "./state/wizardStore";
import { useAuth } from "./state/authStore";
import { AdminLogin } from "./pages/AdminLogin";
import { AnswersSidebar } from "./components/AnswersSidebar";
import { Results } from "./components/results/Results";
import { Landing } from "./pages/Landing";
import { Wizard } from "./pages/Wizard";
import { AllRecommendations } from "./pages/AllRecommendations";
import { RecommendationPage } from "./pages/RecommendationPage";
import { AdminBuilder } from "./pages/AdminBuilder";

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

function Shell({ children, sidebar = false, solo = false, questions = [] }: {
  children: React.ReactNode;
  sidebar?: boolean;
  solo?: boolean;
  /** Required when `sidebar` is set — the sidebar lists them. */
  questions?: Question[];
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
              <AnswersSidebar questions={questions} />
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
  const { recommendations, dimensions, questions, loading, error } = useData();
  const showResults = useWizard((s) => s.showResults);
  const showLanding = useWizard((s) => s.showLanding);
  const setQuestionCount = useWizard((s) => s.setQuestionCount);

  // Questions are admin-editable, so the store learns the count at runtime.
  useEffect(() => {
    setQuestionCount(questions.length);
  }, [questions.length, setQuestionCount]);

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;
  if (showLanding) return <Shell solo><Landing /></Shell>;

  return (
    <Shell sidebar questions={questions}>
      {showResults
        ? <Results recommendations={recommendations} dimensions={dimensions} questions={questions} />
        : <Wizard questions={questions} />}
    </Shell>
  );
}

function RecommendationsPage() {
  const { recommendations, dimensions, loading, error } = useData();

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  return (
    <Shell solo>
      <AllRecommendations recommendations={recommendations} dimensions={dimensions} />
    </Shell>
  );
}

function SingleRecommendationPage() {
  const { recommendations, dimensions, loading, error } = useData();

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  return (
    <Shell solo>
      <RecommendationPage recommendations={recommendations} dimensions={dimensions} />
    </Shell>
  );
}

// Unlisted admin page — intentionally not linked from anywhere in the app.
// The gate below is UX only; the real protection is the Appwrite table
// permissions, which reject writes from anyone outside the editors team.
function AdminPage() {
  const {
    recommendations, dimensions, parameters, questions, loading, error, refresh,
  } = useData();
  const user = useAuth((s) => s.user);
  const checking = useAuth((s) => s.checking);
  const init = useAuth((s) => s.init);
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    void init();
  }, [init]);

  if (checking || loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  if (!user) return <Shell solo><AdminLogin /></Shell>;

  // Signed in, but not an editor — the state every self-registered account
  // starts in. Deliberately a dead end with instructions rather than an error.
  if (!user.canEdit) {
    return (
      <Shell solo>
        <div className="admin-login">
          <h2 className="results-title">Access required</h2>
          <p className="results-sub">
            You are signed in as <strong>{user.email}</strong>, but this account does not
            yet have permission to edit the knowledge base.
          </p>
          <p className="results-sub">
            Contact the system administrator to request editor access, quoting the email
            address above. An administrator grants it by adding your account to the{" "}
            <code>editors</code> team.
          </p>
          <div className="results-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell solo>
      <AdminBuilder
        recommendations={recommendations}
        dimensions={dimensions}
        parameters={parameters}
        questions={questions}
        onRefresh={refresh}
        onSignOut={() => void logout()}
      />
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/recommendations/:id" element={<SingleRecommendationPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
