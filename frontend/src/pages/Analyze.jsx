import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Analyze() {
  const navigate = useNavigate();

  const [equipmentType, setEquipmentType] =
    useState("Motor");

  const [equipmentId, setEquipmentId] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function handleImage(e) {
    const file = e.target.files[0];

    if (!file) return;

    setImage(file);

    setPreview(
      URL.createObjectURL(file)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!image) {
      setError("Please upload an equipment image.");
      return;
    }

    if (!description.trim()) {
      setError("Please describe the symptoms.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append(
        "equipmentType",
        equipmentType
      );

      formData.append(
        "equipmentId",
        equipmentId
      );

      formData.append(
        "description",
        description
      );

      formData.append(
        "image",
        image
      );

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/faults/analyze`,
        formData
      );

      const mismatch = response.data?.aiResult?.equipmentMatch;

      if (mismatch && mismatch.matches === false) {
        // Don't navigate to the Result page — show the warning right here,
        // same as any other validation error, so the user can fix their
        // selection/photo/description and resubmit.
        setError(
          `⚠ Equipment mismatch: ${
            mismatch.reason ||
            "The selected equipment type doesn't seem to match the image and/or description you gave."
          } Please check your equipment type, image, and description, then try again.`
        );
        return;
      }

      navigate(
        `/result/${response.data._id}`
      );
    } catch (err) {
  console.error("FULL FRONTEND ERROR:", err);

  const backendMessage =
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    "Unknown error";

  setError(`Backend error: ${backendMessage}`);
} finally {
  setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="form-container">

        <div className="page-header">
          <h1>Analyze Equipment Fault</h1>

          <p>
            Upload an equipment image and describe
            the symptoms for AI-powered visual triage.
          </p>
        </div>

        <form
          className="fault-form"
          onSubmit={handleSubmit}
        >

          <label>
            Equipment Type
          </label>

          <select
            value={equipmentType}
            onChange={(e) =>
              setEquipmentType(e.target.value)
            }
          >
            <option>Motor</option>
            <option>Pump</option>
            <option>Conveyor Belt</option>
            <option>Electrical Panel</option>
          </select>

          <label>
            Equipment ID
          </label>

          <input
            type="text"
            placeholder="Example: MTR-102"
            value={equipmentId}
            onChange={(e) =>
              setEquipmentId(e.target.value)
            }
          />

          <label>
            Equipment Image
          </label>

          <div className="upload-box">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImage}
            />

            {preview && (
              <img
                src={preview}
                alt="Equipment preview"
                className="preview-image"
              />
            )}
          </div>

          <label>
            Describe Symptoms
          </label>

          <textarea
            rows="7"
            placeholder="Example: The motor is vibrating heavily and becoming unusually hot. There is discoloration near the bearing."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze Fault"}
          </button>

        </form>

        <div className="disclaimer">
          <strong>Safety Notice</strong>

          <p>
            AI results are triage recommendations only
            and are not a final diagnosis. Critical
            maintenance activities must be verified by
            a qualified technician.
          </p>
        </div>

      </div>
    </main>
  );
}

export default Analyze;