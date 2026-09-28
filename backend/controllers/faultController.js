import path from "path";
import FaultCase from "../models/FaultCase.js";
import { analyzeFault } from "../services/aiService.js";
import { applySafetyRules } from "../services/safetyRules.js";

// POST /api/faults/analyze
// Expects multipart/form-data with fields: equipmentType, equipmentId,
// description, and a file field named "image" — exactly what Analyze.jsx sends.
export async function createFaultCase(req, res) {
  try {
    const { equipmentType, equipmentId, description, location, operatingCondition, userId } = req.body;

    if (!equipmentType || !description) {
      return res.status(400).json({ error: "equipmentType and description are required." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "An equipment image is required." });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${path.basename(imagePath)}`; // relative path, frontend prepends VITE_API_URL

    // Look up this equipment's past cases so the AI can reason about
    // recurring/worsening patterns instead of judging each photo in isolation.
    const pastCases = await FaultCase.find({ equipmentId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("createdAt possibleFault aiResult.possibleFault aiResult.severity description");

    const equipmentHistory = pastCases.map((c) => ({
      createdAt: c.createdAt,
      possibleFault: c.aiResult?.possibleFault || "unknown",
      severity: c.aiResult?.severity || "UNKNOWN",
      description: c.description,
    }));

    // 1. Ask the multimodal LLM for a triage assessment, informed by history
    const rawAiResult = await analyzeFault({
      imagePath,
      equipmentType,
      equipmentId,
      description,
      operatingCondition,
      equipmentHistory,
    });

    // 2. Apply deterministic safety rules on top (can only escalate, never downgrade)
    const aiResult = applySafetyRules(rawAiResult, equipmentType, description);

    // 3. Persist the case
    const faultCase = await FaultCase.create({
      userId: userId || "anonymous",
      equipmentType,
      equipmentId: equipmentId || "",
      location: location || "",
      operatingCondition: operatingCondition || "",
      description,
      imageUrl,
      aiResult,
    });

    return res.status(201).json(faultCase);
  } catch (err) {
    console.error("createFaultCase error:", err);
    return res.status(500).json({ error: "Failed to analyze fault case.", details: err.message });
  }
}

// GET /api/faults
export async function listFaultCases(req, res) {
  try {
    const { userId, equipmentId } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (equipmentId) filter.equipmentId = equipmentId;

    const cases = await FaultCase.find(filter).sort({ createdAt: -1 });
    return res.json(cases);
  } catch (err) {
    console.error("listFaultCases error:", err);
    return res.status(500).json({ error: "Failed to fetch fault cases.", details: err.message });
  }
}

// GET /api/faults/:id
export async function getFaultCase(req, res) {
  try {
    const faultCase = await FaultCase.findById(req.params.id);
    if (!faultCase) return res.status(404).json({ error: "Fault case not found." });
    return res.json(faultCase);
  } catch (err) {
    console.error("getFaultCase error:", err);
    return res.status(500).json({ error: "Failed to fetch fault case.", details: err.message });
  }
}

// DELETE /api/faults/:id
export async function deleteFaultCase(req, res) {
  try {
    const deleted = await FaultCase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Fault case not found." });
    return res.json({ message: "Deleted.", id: req.params.id });
  } catch (err) {
    console.error("deleteFaultCase error:", err);
    return res.status(500).json({ error: "Failed to delete fault case.", details: err.message });
  }
}

// GET /api/faults/trends/:equipmentId
// Recurring-issue detector: flags equipment with 3+ cases in the last 30 days.
export async function getEquipmentTrends(req, res) {
  try {
    const { equipmentId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentCases = await FaultCase.find({
      equipmentId,
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: -1 });

    return res.json({
      equipmentId,
      casesInLast30Days: recentCases.length,
      repeatedIssue: recentCases.length >= 3,
      cases: recentCases,
    });
  } catch (err) {
    console.error("getEquipmentTrends error:", err);
    return res.status(500).json({ error: "Failed to fetch equipment trends.", details: err.message });
  }
}
