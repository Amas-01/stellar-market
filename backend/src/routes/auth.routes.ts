import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";

const router = Router();
const prisma = new PrismaClient();

// Register a new user
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { walletAddress, email, username, password, role } = req.body;

    if (!walletAddress || !username) {
      res.status(400).json({ error: "Wallet address and username are required." });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress },
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: "User already exists." });
      return;
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        walletAddress,
        email,
        username,
        password: hashedPassword,
        role: role || "FREELANCER",
      },
    });

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { walletAddress, email, password } = req.body;

    let user;

    if (walletAddress) {
      user = await prisma.user.findUnique({ where: { walletAddress } });
    } else if (email && password) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user && user.password) {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          res.status(401).json({ error: "Invalid credentials." });
          return;
        }
      }
    }

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
