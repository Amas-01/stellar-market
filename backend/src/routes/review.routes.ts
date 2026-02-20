import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Create a review
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, revieweeId, rating, comment } = req.body;

    if (!jobId || !revieweeId || !rating || !comment) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5." });
      return;
    }

    // Verify the job exists and is completed
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      res.status(404).json({ error: "Job not found." });
      return;
    }
    if (job.status !== "COMPLETED") {
      res.status(400).json({ error: "Can only review completed jobs." });
      return;
    }

    // Verify reviewer is part of the job
    if (job.clientId !== req.userId && job.freelancerId !== req.userId) {
      res.status(403).json({ error: "Not authorized to review this job." });
      return;
    }

    const review = await prisma.review.create({
      data: {
        jobId,
        reviewerId: req.userId!,
        revieweeId,
        rating: parseInt(rating),
        comment,
      },
      include: {
        reviewer: { select: { id: true, username: true, avatarUrl: true } },
        reviewee: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get reviews for a user
router.get("/user/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, username: true, avatarUrl: true } },
        job: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.json({ reviews, averageRating: Math.round(avgRating * 100) / 100, totalReviews: reviews.length });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
