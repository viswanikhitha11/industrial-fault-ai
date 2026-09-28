/**
 * Safety Rule Engine
 * -------------------
 * The LLM proposes a severity/technicianRequired assessment, but we never
 * trust an AI model alone for safety-critical escalation decisions. This
 * module applies deterministic, auditable rules on top of the AI output.
 * It can only make the result MORE conservative — it forces
 * technicianRequired=true or bumps severity up, but never downgrades
 * anything the model already flagged.
 */

const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function severityRank(sev) {
  const idx = SEVERITY_ORDER.indexOf(sev);
  return idx === -1 ? 0 : idx;
}

const CRITICAL_KEYWORDS = [
  "smoke",
  "fire",
  "burning",
  "sparking",
  "spark",
  "exposed wire",
  "exposed live",
  "electrocution",
  "arc flash",
  "explosion",
];

const HIGH_KEYWORDS = [
  "severe overheating",
  "burn mark",
  "burnt",
  "major leak",
  "structural crack",
  "structural damage",
];

function textHasAny(text, keywords) {
  const t = (text || "").toLowerCase();
  return keywords.some((k) => t.includes(k));
}

/**
 * @param {object} aiResult - parsed JSON result from the LLM
 * @param {string} equipmentType
 * @param {string} description - user's free-text symptom description
 * @returns {object} the same result, potentially escalated, plus a
 *          `ruleEngineOverrides` array documenting any changes made.
 */
export function applySafetyRules(aiResult, equipmentType, description) {
  const overrides = [];
  const result = { ...aiResult };

  const combinedText = `${description || ""} ${(result.visualObservations || []).join(" ")} ${
    result.possibleFault || ""
  }`;

  // Rule 1: fire/smoke/sparking/exposed-live-electrical language -> always CRITICAL
  if (textHasAny(combinedText, CRITICAL_KEYWORDS)) {
    if (result.severity !== "CRITICAL") {
      overrides.push(
        "Severity escalated to CRITICAL: description/observations mention fire, smoke, sparking, or exposed live electrical parts."
      );
      result.severity = "CRITICAL";
    }
  }

  // Rule 2: burn marks / severe overheating / structural damage -> at least HIGH
  if (severityRank(result.severity) < severityRank("HIGH") && textHasAny(combinedText, HIGH_KEYWORDS)) {
    overrides.push(
      "Severity escalated to HIGH: description/observations mention burn marks, severe overheating, or structural damage."
    );
    result.severity = "HIGH";
  }

  // Rule 3: CRITICAL or HIGH severity always requires a technician.
  if (["CRITICAL", "HIGH"].includes(result.severity) && !result.technicianRequired) {
    overrides.push(`technicianRequired forced to true because severity is ${result.severity}.`);
    result.technicianRequired = true;
  }

  // Rule 4: electrical panels with any burn/overheating/connection signal always need a technician.
  if (
    equipmentType === "Electrical Panel" &&
    textHasAny(combinedText, [...HIGH_KEYWORDS, ...CRITICAL_KEYWORDS, "loose connection", "corrosion"])
  ) {
    if (!result.technicianRequired) {
      overrides.push("technicianRequired forced to true: electrical panel faults require professional inspection.");
      result.technicianRequired = true;
    }
  }

  // Rule 5: if the model reported the image/description as unusable, force technician review.
  if (result.imageQuality && result.imageQuality.canAnalyze === false) {
    if (!result.technicianRequired) {
      overrides.push("technicianRequired set to true: image/description was insufficient for confident triage.");
      result.technicianRequired = true;
    }
  }

  // Rule 6: CRITICAL severity always gets a mandatory safety banner.
  if (result.severity === "CRITICAL") {
    const mandatory =
      "STOP the equipment immediately if it is safe to do so, evacuate the area if there is smoke or fire, and contact a qualified technician or emergency services. Do not attempt any repair.";
    if (!result.safetyWarning || !result.safetyWarning.toLowerCase().includes("stop")) {
      result.safetyWarning = result.safetyWarning ? `${mandatory} ${result.safetyWarning}` : mandatory;
      overrides.push("Mandatory CRITICAL safety warning prepended.");
    }
  }

  result.ruleEngineOverrides = overrides;
  return result;
}
