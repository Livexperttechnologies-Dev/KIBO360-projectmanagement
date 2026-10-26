// ==============================================================================
// KIBO360 Project Hub — Health & Probes Routes
// Livexpert Technologies Pvt. Ltd.
// ==============================================================================

import { Router } from "express";
import { getHealth, getLiveness, getReadiness } from "../controllers/health.controller";

const router = Router();

router.get("/", getHealth);
router.get("/liveness", getLiveness);
router.get("/readiness", getReadiness);

export default router;
