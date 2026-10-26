import { Router } from "express";
import { CalendarController } from "../controllers/calendar.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All calendar endpoints require authentication
router.use(authenticate);

router.get("/events", CalendarController.getEvents);
router.get("/summary", CalendarController.getSummary);

export default router;
