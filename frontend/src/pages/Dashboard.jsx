import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main className="page">

      <section className="hero">

        <div>
          <span className="badge">
            AI-POWERED INDUSTRIAL TRIAGE
          </span>

          <h1>
            Visual Fault Triage
            <br />
            for Industrial Equipment
          </h1>

          <p>
            Upload an equipment image, describe the
            symptoms, and receive an AI-generated
            first-level fault assessment.
          </p>

          <Link
            to="/analyze"
            className="primary-btn"
          >
            Start Fault Analysis
          </Link>
        </div>

        <div className="hero-card">
          <div className="hero-icon">
            ⚙️
          </div>

          <h3>
            Multimodal AI Analysis
          </h3>

          <p>
            Image + symptoms + safety rules
          </p>
        </div>

      </section>

      <section className="feature-grid">

        <div className="feature-card">
          <div>📷</div>
          <h3>Visual Analysis</h3>
          <p>
            Analyze visible abnormalities in
            equipment images.
          </p>
        </div>

        <div className="feature-card">
          <div>🧠</div>
          <h3>AI Triage</h3>
          <p>
            Identify possible faults and their
            estimated severity.
          </p>
        </div>

        <div className="feature-card">
          <div>🛡️</div>
          <h3>Safety Engine</h3>
          <p>
            Apply additional safety rules before
            presenting recommendations.
          </p>
        </div>

        <div className="feature-card">
          <div>📊</div>
          <h3>Case History</h3>
          <p>
            Maintain previous fault analyses for
            future reference.
          </p>
        </div>

      </section>

    </main>
  );
}

export default Dashboard;