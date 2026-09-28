import mongoose from "mongoose";

const AiResultSchema = new mongoose.Schema(
  {
    possibleFault: { type: String, default: "" },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"],
      default: "UNKNOWN",
    },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    visualObservations: { type: [String], default: [] },
    possibleCauses: { type: [String], default: [] },
    troubleshooting: { type: [String], default: [] },
    technicianRequired: { type: Boolean, default: false },
    safetyWarning: { type: String, default: "" },
    additionalInformationNeeded: { type: [String], default: [] },
    imageQuality: {
      status: { type: String, enum: ["GOOD", "POOR", "UNKNOWN"], default: "UNKNOWN" },
      reason: { type: String, default: "" },
      canAnalyze: { type: Boolean, default: true },
    },
    equipmentMatch: {
      matches: { type: Boolean, default: true },
      reason: { type: String, default: "" },
    },
    // Added by the backend safety-rule engine, never by the LLM directly.
    ruleEngineOverrides: { type: [String], default: [] },
  },
  { _id: false }
);

const FaultCaseSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "anonymous" },
    equipmentType: {
      type: String,
      enum: ["Motor", "Pump", "Conveyor Belt", "Electrical Panel", "Other"],
      required: true,
    },
    equipmentId: { type: String, default: "" },
    location: { type: String, default: "" },
    operatingCondition: { type: String, default: "" },
    description: { type: String, required: true },
    imageUrl: { type: String, default: "" }, // relative path, e.g. "/uploads/xxx.jpg"
    aiResult: { type: AiResultSchema, default: () => ({}) },
  },
  { timestamps: true } // gives us createdAt / updatedAt used by History.jsx and Result.jsx
);

export default mongoose.model("FaultCase", FaultCaseSchema);