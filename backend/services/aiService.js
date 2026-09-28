import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { getFaultReferenceText } from "./faultKnowledgeBase.js";

// Update this in .env (GEMINI_MODEL) if Google changes the free-tier lineup
// again — check https://ai.google.dev/gemini-api/docs/models for the current
// list. As of this build, gemini-2.0-flash was deprecated by Google in favor
// of gemini-3.8-flash.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_PROMPT = `You are an industrial equipment fault triage assistant embedded in a
maintenance application used by plant technicians and operators.

You analyze an equipment photo together with a free-text symptom
description and return a STRUCTURED, CONSERVATIVE triage assessment.

Rules you must always follow:
- Do not claim certainty. You are triaging, not diagnosing.
- Do not provide a final diagnosis.
- Do not recommend any action that could be unsafe (e.g. opening an
  energized panel, touching hot components, disabling safety interlocks).
- If the image is blurry, doesn't show the relevant component, or the
  description is too vague to say anything useful, say so explicitly in
  "additionalInformationNeeded" and set imageQuality.canAnalyze to false.
- If you see any sign of fire, smoke, sparking, or exposed live electrical
  parts, severity MUST be "CRITICAL" and technicianRequired MUST be true.
- Check whether the equipment type given to you, the photo, and the
  description all genuinely match each other (e.g. someone selected "Pump"
  but the photo clearly shows a conveyor belt, or the description talks
  about a belt while the equipment type says "Motor"). If anything looks
  inconsistent, set "equipmentMatch.matches" to false and explain the
  mismatch in "equipmentMatch.reason". Do NOT silently go along with a
  mismatched selection.
- Respond with ONLY valid JSON matching the schema below. No prose, no
  markdown code fences, nothing outside the JSON object.

JSON schema to return:
{
  "possibleFault": string,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number (0 to 1),
  "visualObservations": string[],
  "possibleCauses": string[],
  "troubleshooting": string[],
  "technicianRequired": boolean,
  "safetyWarning": string,
  "additionalInformationNeeded": string[],
  "imageQuality": {
    "status": "GOOD" | "POOR",
    "reason": string,
    "canAnalyze": boolean
  },
  "equipmentMatch": {
    "matches": boolean,
    "reason": string
  }
}`;

function mimeTypeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

function extractJson(text) {
  // Defensive parsing in case the model wraps JSON in prose/fences anyway.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSlice);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Google's free-tier models occasionally return 503 ("high demand") or 429
// ("rate limited") — these are transient, not bugs, so we retry a few times
// with a short backoff before giving up and returning the safe fallback.
async function generateWithRetry(model, contentParts, { retries = 3, baseDelayMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(contentParts);
    } catch (err) {
      lastErr = err;
      const status = err?.status;
      const isTransient = status === 503 || status === 429;
      if (!isTransient || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt); // 1.5s, 3s, 6s...
      console.warn(
        `Gemini returned ${status} (attempt ${attempt + 1}/${retries + 1}) — retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function fallbackResult(reason) {
  return {
    possibleFault: "Unable to determine — AI analysis failed",
    severity: "UNKNOWN",
    confidence: 0,
    visualObservations: [],
    possibleCauses: [],
    troubleshooting: [
      "AI analysis could not be completed. Please have a qualified technician inspect the equipment.",
    ],
    technicianRequired: true,
    safetyWarning: "AI analysis failed — treat this case as requiring manual inspection.",
    additionalInformationNeeded: [reason],
    imageQuality: { status: "UNKNOWN", reason, canAnalyze: false },
    equipmentMatch: { matches: true, reason: "" },
  };
}

/**
 * @param {object} params
 * @param {string} params.imagePath - absolute path to the uploaded image on disk
 * @param {string} params.equipmentType
 * @param {string} params.equipmentId
 * @param {string} params.description
 * @param {string} [params.operatingCondition]
 * @returns {Promise<object>} parsed AI result matching the JSON schema above
 */
export async function analyzeFault({
  imagePath,
  equipmentType,
  equipmentId,
  description,
  operatingCondition,
  equipmentHistory = [],
}) {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackResult("GEMINI_API_KEY is not configured on the server.");
  }

  let imageBase64;
  try {
    imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });
  } catch (err) {
    return fallbackResult(`Could not read uploaded image: ${err.message}`);
  }

  const historyText =
    equipmentHistory.length > 0
      ? `\nPast fault cases recorded for this exact equipment (most recent first — use this to notice recurring or worsening patterns, but still base your assessment primarily on the current photo and description):\n${equipmentHistory
          .map(
            (h, i) =>
              `${i + 1}. ${new Date(h.createdAt).toLocaleDateString()} — possible fault: "${h.possibleFault}", severity: ${h.severity}, description given at the time: "${h.description}"`
          )
          .join("\n")}\n`
      : "\nNo past fault cases are on record for this equipment.\n";

  const referenceText = getFaultReferenceText(equipmentType);

  const userText = `${SYSTEM_PROMPT}

${referenceText}

Equipment type: ${equipmentType}
Equipment ID: ${equipmentId || "not provided"}
Operating condition: ${operatingCondition || "not specified"}
${historyText}
Current user-reported symptoms:
"${description}"

Analyze the attached image together with the current description, the
equipment's past fault history above, AND the known fault reference list
above. Ground your "possibleFault" and "visualObservations" in what you can
actually see matching (or not matching) the documented indicators — don't
invent a fault that isn't supported by either the image or the reference
list. If the current symptoms match or build on a recurring issue from the
history, mention that explicitly in "possibleCauses" or
"additionalInformationNeeded". Then return the JSON object described in
your instructions.`;

  try {
    // Built here (not at module load time) so it always reads the API key
    // that's actually in process.env by the time a request comes in, rather
    // than whatever was (or wasn't) set when this file was first imported.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const result = await generateWithRetry(model, [
      { text: userText },
      {
        inlineData: {
          mimeType: mimeTypeFromExt(imagePath),
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    if (!text) {
      return fallbackResult("Model returned no text content.");
    }

    const parsed = extractJson(text);

    // Normalize / defensively fill missing fields so the frontend never breaks.
    return {
      possibleFault: parsed.possibleFault || "Not specified",
      severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(parsed.severity) ? parsed.severity : "UNKNOWN",
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0,
      visualObservations: Array.isArray(parsed.visualObservations) ? parsed.visualObservations : [],
      possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
      troubleshooting: Array.isArray(parsed.troubleshooting) ? parsed.troubleshooting : [],
      technicianRequired: Boolean(parsed.technicianRequired),
      safetyWarning: parsed.safetyWarning || "",
      additionalInformationNeeded: Array.isArray(parsed.additionalInformationNeeded)
        ? parsed.additionalInformationNeeded
        : [],
      imageQuality: {
        status: parsed.imageQuality?.status === "POOR" ? "POOR" : "GOOD",
        reason: parsed.imageQuality?.reason || "",
        canAnalyze: parsed.imageQuality?.canAnalyze !== false,
      },
      equipmentMatch: {
        matches: parsed.equipmentMatch?.matches !== false,
        reason: parsed.equipmentMatch?.reason || "",
      },
    };
  } catch (err) {
    console.error("AI analysis error:", err);
    const status = err?.status;
    if (status === 503) {
      return fallbackResult(
        "Gemini's servers are temporarily overloaded (free tier, high demand). This is not an app error — please wait a minute and try analyzing this case again."
      );
    }
    if (status === 429) {
      return fallbackResult(
        "Gemini's free-tier rate limit was hit. Wait about a minute before submitting another analysis."
      );
    }
    return fallbackResult(`AI request failed: ${err.message}`);
  }
}