import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Send a message
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, jobId, content } = req.body;

    if (!receiverId || !content) {
      res.status(400).json({ error: "Receiver and content are required." });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.userId!,
        receiverId,
        jobId: jobId || null,
        content,
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get conversation with a specific user
router.get("/:userId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId!, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.userId! },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: req.params.userId,
        receiverId: req.userId!,
        read: false,
      },
      data: { read: true },
    });

    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
