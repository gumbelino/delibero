import { useWizard } from "../state/wizardStore";

export function Landing() {
  const start = useWizard((s) => s.start);

  return (
    <div className="landing">
      <div className="landing-hero">
        <h2 className="landing-title">Design your deliberative process</h2>
        <p className="landing-lead">
          delibero is a decision-support tool for government practitioners and
          researchers. Answer a short questionnaire about your context and
          goals, and receive tailored guidance on how to design an effective
          public deliberation process.
        </p>
        <button
          type="button"
          className="btn btn-primary landing-cta"
          onClick={start}
        >
          Start the questionnaire
        </button>
      </div>

      <div className="landing-steps">
        <div className="landing-step">
          <span className="landing-step-num">1</span>
          <div>
            <h3 className="landing-step-title">Answer 7 questions</h3>
            <p className="landing-step-body">
              Tell us about the scale of your process, the level of
              participation you are aiming for, who can take part, and what
              resources you have available.
            </p>
          </div>
        </div>
        <div className="landing-step">
          <span className="landing-step-num">2</span>
          <div>
            <h3 className="landing-step-title">Set your goals</h3>
            <p className="landing-step-body">
              Rank what matters most to you — broader participation, deeper
              discussion, demographic diversity, or other deliberative values.
              Your ranking shapes the output.
            </p>
          </div>
        </div>
        <div className="landing-step">
          <span className="landing-step-num">3</span>
          <div>
            <h3 className="landing-step-title">
              Get guidance — and expert support
            </h3>
            <p className="landing-step-body">
              Receive process design suggestions based on your answers. If you
              would like personalised help, our team of deliberation researchers
              and designers is available.
            </p>
          </div>
        </div>
      </div>

      <div className="landing-note">
        <p>
          delibero is being developed as part of the{" "}
          <a
            href="https://www.ai4dproject.eu/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AI4Deliberation
          </a>{" "}
          project (EU Horizon RIA, Grant Agreement 101178806) at the University
          of Zurich. It is a research prototype intended to support
          practitioners — recommendations are illustrative and should be
          reviewed with domain expertise.
        </p>
      </div>
    </div>
  );
}
