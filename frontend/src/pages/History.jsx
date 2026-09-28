import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function History() {
  const [cases, setCases] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/faults`
      );

      setCases(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCase(id) {
    const confirmed =
      window.confirm(
        "Delete this fault case?"
      );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/faults/${id}`
      );

      setCases(
        cases.filter(
          (item) => item._id !== id
        )
      );
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main className="page">

      <div className="history-container">

        <div className="page-header">
          <h1>
            Fault Analysis History
          </h1>

          <p>
            Review previous equipment assessments.
          </p>
        </div>

        {loading ? (
          <div className="loading">
            Loading...
          </div>
        ) : cases.length === 0 ? (
          <div className="empty">
            No fault analyses yet.
          </div>
        ) : (
          <div className="history-table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Equipment ID</th>
                  <th>Possible Fault</th>
                  <th>Severity</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {cases.map((item) => (
                  <tr key={item._id}>

                    <td>
                      {item.equipmentType}
                    </td>

                    <td>
                      {item.equipmentId || "-"}
                    </td>

                    <td>
                      {item.aiResult?.possibleFault}
                    </td>

                    <td>
                      <span
                        className={`severity-small ${item.aiResult?.severity?.toLowerCase()}`}
                      >
                        {item.aiResult?.severity}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        item.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td>

                      <Link
                        to={`/result/${item._id}`}
                        className="view-btn"
                      >
                        View
                      </Link>

                      <button
                        className="delete-btn"
                        onClick={() =>
                          deleteCase(item._id)
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </main>
  );
}

export default History;