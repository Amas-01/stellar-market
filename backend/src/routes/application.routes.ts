import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Apply for a job
router.post("/jobs/:jobId/apply", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const { coverLetter, proposedBudget } = req.body;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }
    if (job.status !== "OPEN") {
      res.status(400).json({ error: "Job is not accepting applications." });
      return;
    }
    if (job.clientId === req.userId) {
      res.status(400).json({ error: "Cannot apply to your own job." });
      return;
    }

    const existing = await prisma.application.findUnique({
      where: { jobId_freelancerId: { jobId, freelancerId: req.userId! } },
    });
    if (existing) {
      res.status(409).json({ error: "You have already applied to this job." });
      return;
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        freelancerId: req.userId!,
        coverLetter,
        proposedBudget: parseFloat(proposedBudget),
      },
      include: {
        freelancer: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(application);
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get applications for a job
router.get("/jobs/:jobId/applications", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        freelancer: { select: { id: true, username: true, avatarUrl: true, bio: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(applications);
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Update application status (accept/reject)
router.put("/applications/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const applicationId = req.params.id as string;
    const { status } = req.body;

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      res.status(400).json({ error: "Status must be ACCEPTED or REJECTED." });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      res.status(404).json({ error: "Application not found." });
      return;
    }
    if (application.job.clientId !== req.userId) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });

    // If accepted, assign freelancer to job and update job status
    if (status === "ACCEPTED") {
      await prisma.job.update({
        where: { id: application.jobId },
        data: {
          freelancerId: application.freelancerId,
          status: "IN_PROGRESS",
        },
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
