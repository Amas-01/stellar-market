import { Router } from "express";
import authRoutes from "./auth.routes";
import jobRoutes from "./job.routes";
import applicationRoutes from "./application.routes";
import messageRoutes from "./message.routes";
import reviewRoutes from "./review.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/jobs", jobRoutes);
router.use("/", applicationRoutes);
router.use("/messages", messageRoutes);
router.use("/reviews", reviewRoutes);

export default router;
