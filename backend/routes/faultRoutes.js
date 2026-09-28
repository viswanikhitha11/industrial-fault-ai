import { Router } from "express";
import { upload } from "../middleware/upload.js";
import {
  createFaultCase,
  listFaultCases,
  getFaultCase,
  deleteFaultCase,
  getEquipmentTrends,
} from "../controllers/faultController.js";

const router = Router();

router.post("/analyze", upload.single("image"), createFaultCase);
router.get("/", listFaultCases);
router.get("/trends/:equipmentId", getEquipmentTrends);
router.get("/:id", getFaultCase);
router.delete("/:id", deleteFaultCase);

export default router;
