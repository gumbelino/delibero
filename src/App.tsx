import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Question } from "./types";
import { activeQuestions } from "./engine/questions";
import { useData } from "./state/useData";
import { useWizard } from "./state/wizardStore";
import { useAuth } from "./state/authStore";
import { AdminLogin } from "./pages/AdminLogin";
import { RequestAccess } from "./pages/RequestAccess";
import { AnswersSidebar } from "./components/AnswersSidebar";
import { Results } from "./components/results/Results";
import { Landing } from "./pages/Landing";
import { Wizard } from "./pages/Wizard";
import { AllRecommendations } from "./pages/AllRecommendations";
import { RecommendationPage } from "./pages/RecommendationPage";
import { AdminBuilder } from "./pages/AdminBuilder";

function NavLogo() {
  const goHome = useWizard((s) => s.goHome);
  const navigate = useNavigate();

  // The landing page lives at "/" behind wizard state, so getting there from
  // /admin or /recommendations/:id needs both a route change and a state reset.
  function home() {
    goHome();
    navigate("/");
  }

  return (
    <button type="button" className="app-logo" onClick={home} aria-label="Go to home">
      <svg className="app-logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="64 96 512 512" aria-hidden="true">
        <path fill="#fff" d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z" />
      </svg>
      <span className="app-title">delibero</span>
    </button>
  );
}

/**
 * Who you are signed in as, plus the way back to the admin area. Nothing at all
 * for anonymous visitors — which is everyone using the wizard, since it is
 * entirely anonymous, and /admin stays unlisted for them.
 */
function NavUser() {
  const user = useAuth((s) => s.user);
  const { pathname } = useLocation();

  if (!user) return null;

  return (
    <div className="app-nav-user">
      <span className="app-user">
        Logged in as <strong>{user.name || user.email}</strong>
      </span>
      {pathname !== "/admin" && (
        <Link className="btn btn-nav" to="/admin">
          Admin dashboard
        </Link>
      )}
    </div>
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
          <NavUser />
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

  // Disabled questions are invisible to users — they are not asked, not
  // counted, and not listed in the sidebar.
  const asked = useMemo(() => activeQuestions(questions), [questions]);

  // Questions are admin-editable, so the store learns the count at runtime.
  useEffect(() => {
    setQuestionCount(asked.length);
  }, [asked.length, setQuestionCount]);

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;
  if (showLanding) return <Shell solo><Landing /></Shell>;

  return (
    <Shell sidebar questions={asked}>
      {showResults
        ? <Results recommendations={recommendations} dimensions={dimensions} questions={asked} />
        : <Wizard questions={asked} />}
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
  const { recommendations, dimensions, parameters, questions, loading, error, refresh } = useData();

  if (loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  return (
    <Shell solo>
      <RecommendationPage
        recommendations={recommendations}
        dimensions={dimensions}
        parameters={parameters}
        questions={questions}
        onRefresh={refresh}
      />
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
  const confirmVerification = useAuth((s) => s.confirmVerification);
  const logout = useAuth((s) => s.logout);
  const [search, setSearch] = useSearchParams();
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // The verification email lands back here with the credentials to confirm the
  // address. They are consumed once and then stripped from the URL, so a reload
  // does not retry a secret that has already been spent.
  //
  // There is no invitation callback: approving grants access server-side, so
  // nobody is ever sent a link to accept.
  const callbackUserId = search.get("userId");
  const secret = search.get("secret");

  useEffect(() => {
    if (!callbackUserId || !secret) return;
    setAccepting(true);
    confirmVerification(callbackUserId, secret)
      .catch((err: unknown) =>
        setAcceptError(
          err instanceof Error ? err.message : "Could not confirm that email address.",
        ),
      )
      .finally(() => {
        setAccepting(false);
        setSearch({}, { replace: true });
      });
  }, [callbackUserId, secret, confirmVerification, setSearch]);

  if (accepting) return <Shell><p className="app-status">Confirming…</p></Shell>;
  if (checking || loading) return <Shell><p className="app-status">Loading…</p></Shell>;
  if (error) return <Shell><p className="app-status app-error">Could not load the recommendation data: {error}</p></Shell>;

  if (!user) {
    return (
      <Shell solo>
        {acceptError && <p className="app-status app-error">{acceptError}</p>}
        <AdminLogin />
      </Shell>
    );
  }

  // Signed in, but not an editor — the state every self-registered account
  // starts in. They can file a request from here; an editor approves it under
  // Manage admins.
  if (!user.canEdit) {
    return (
      <Shell solo>
        {acceptError && <p className="app-status app-error">{acceptError}</p>}
        <RequestAccess user={user} onSignOut={() => void logout()} />
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
        currentUser={user}
        onRefresh={refresh}
        onSignOut={() => void logout()}
      />
    </Shell>
  );
}

export default function App() {
  const init = useAuth((s) => s.init);

  // One session check for the whole app: the header shows who you are on every
  // page, and the recommendation page offers editors an inline Edit button.
  // Anonymous visitors get a single 401 from account.get() and nothing else.
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <Routes>
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/recommendations/:id" element={<SingleRecommendationPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
