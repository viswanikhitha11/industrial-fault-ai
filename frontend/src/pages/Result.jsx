import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

function Result() {
  const { id } = useParams();

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchResult() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/faults/${id}`
        );

        setData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          Loading analysis...
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <div className="error">
          Fault case not found.
        </div>
      </main>
    );
  }

  const result = data.aiResult;

  return (
    <main className="page">

      <div className="result-container">

        <div className="result-header">
          <div>
            <span className="badge">
              AI TRIAGE RESULT
            </span>

            <h1>
              {data.equipmentType}
            </h1>

            <p>
              Equipment ID:{" "}
              {data.equipmentId || "Not provided"}
            </p>
          </div>

          <div
            className={`severity ${result.severity.toLowerCase()}`}
          >
            {result.severity}
          </div>
        </div>

        {result.equipmentMatch && result.equipmentMatch.matches === false && (
          <div className="error">
            <strong>⚠ Equipment mismatch detected:</strong>{" "}
            {result.equipmentMatch.reason ||
              "The selected equipment type doesn't appear to match the uploaded image and/or description. Please double-check your selection before trusting this result."}
          </div>
        )}

        <div className="result-grid">

          <div className="result-main">

            <section className="result-card">
              <h2>
                Possible Fault
              </h2>

              <p className="fault-name">
                {result.possibleFault}
              </p>

              <div className="confidence">
                AI Confidence:{" "}
                <strong>
                  {Math.round(
                    result.confidence * 100
                  )}%
                </strong>
              </div>
            </section>

            <section className="result-card">
              <h2>
                Visual Observations
              </h2>

              <ul>
                {result.visualObservations?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </section>

            <section className="result-card">
              <h2>
                Possible Causes
              </h2>

              <ul>
                {result.possibleCauses?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </section>

            <section className="result-card">
              <h2>
                Recommended First-Level Actions
              </h2>

              <ol>
                {result.troubleshooting?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ol>
            </section>

            <section className="result-card">
              <h2>
                Additional Information
              </h2>

              {result.additionalInformationNeeded?.length ? (
                <ul>
                  {result.additionalInformationNeeded.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p>
                  No additional information requested.
                </p>
              )}
            </section>

          </div>

          <aside>

            <img
              src={`${import.meta.env.VITE_API_URL}${data.imageUrl}`}
              alt="Equipment"
              className="result-image"
            />

            <div className="safety-card">
              <h2>
                ⚠ Safety Warning
              </h2>

              <p>
                {result.safetyWarning}
              </p>
            </div>

            <div
              className={
                result.technicianRequired
                  ? "technician-card danger"
                  : "technician-card"
              }
            >
              <h3>
                {result.technicianRequired
                  ? "Technician Required"
                  : "Technician Not Immediately Required"}
              </h3>

              <p>
                {result.technicianRequired
                  ? "Professional inspection is recommended before maintenance work."
                  : "Continue monitoring the equipment and follow appropriate maintenance procedures."}
              </p>
            </div>

          </aside>

        </div>

        <div className="result-actions">
          <Link
            to="/analyze"
            className="primary-btn"
          >
            Analyze Another
          </Link>

          <Link
            to="/history"
            className="secondary-btn"
          >
            View History
          </Link>
        </div>

        <div className="disclaimer">
          <strong>
            AI Triage Disclaimer
          </strong>

          <p>
            This result is an AI-generated preliminary
            assessment and should not be treated as a
            final equipment diagnosis. Qualified personnel
            must verify critical maintenance decisions.
          </p>
        </div>

      </div>

    </main>
  );
}

export default Result;