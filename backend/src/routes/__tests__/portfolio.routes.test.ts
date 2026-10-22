import {
  PORTFOLIO_MAX_FILE_SIZE,
  PORTFOLIO_MAX_ITEMS,
  PORTFOLIO_MIME_TYPES,
  portfolioUpload,
} from "../../config/upload";

describe("Portfolio Upload Configuration", () => {
  it("should have correct max portfolio file size (5MB)", () => {
    expect(PORTFOLIO_MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it("should have correct max portfolio items limit", () => {
    expect(PORTFOLIO_MAX_ITEMS).toBe(10);
  });

  it("should allow image MIME types for portfolio", () => {
    expect(PORTFOLIO_MIME_TYPES).toContain("image/jpeg");
    expect(PORTFOLIO_MIME_TYPES).toContain("image/png");
    expect(PORTFOLIO_MIME_TYPES).toContain("image/gif");
    expect(PORTFOLIO_MIME_TYPES).toContain("image/webp");
    expect(PORTFOLIO_MIME_TYPES).toContain("application/pdf");
  });

  it("should not allow disallowed MIME types for portfolio", () => {
    expect(PORTFOLIO_MIME_TYPES).not.toContain("video/mp4");
    expect(PORTFOLIO_MIME_TYPES).not.toContain("application/zip");
  });

  it("should export portfolioUpload multer instance", () => {
    expect(portfolioUpload).toBeDefined();
  });
});

// ─── Route behaviour (cap race + atomic reorder) ─────────────────────────────
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";

const mockPortfolio = {
  count: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};
const mockTx = { portfolioItem: mockPortfolio, $queryRaw: jest.fn() };
const mockPrismaClient = {
  portfolioItem: mockPortfolio,
  user: {
    findUnique: jest.fn().mockResolvedValue({
      id: "user-1",
      role: "FREELANCER",
      emailVerified: true,
    }),
  },
  $transaction: jest.fn(),
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
  UserRole: { CLIENT: "CLIENT", FREELANCER: "FREELANCER", ADMIN: "ADMIN" },
}));

import portfolioRouter from "../portfolio.routes";

const app = express();
app.use(express.json());
app.use("/api/portfolio", portfolioRouter);
const auth = () => ({
  Authorization: `Bearer ${jwt.sign({ userId: "user-1" }, config.jwtSecret, { expiresIn: "1h" })}`,
});

describe("POST /api/portfolio cap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "FREELANCER",
      emailVerified: true,
    });
    // Emulate the per-user row lock by serializing transactions
    let chain: Promise<unknown> = Promise.resolve();
    mockPrismaClient.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => {
      const run = chain.then(() => fn(mockTx));
      chain = run.catch(() => undefined);
      return run;
    });
    mockPortfolio.findFirst.mockResolvedValue(null);
  });

  const upload = () =>
    request(app)
      .post("/api/portfolio")
      .set(auth())
      .field("title", "Work")
      .attach("file", Buffer.from("x"), { filename: "a.png", contentType: "image/png" });

  it("allows exactly one of two concurrent uploads at max-1", async () => {
    let stored = PORTFOLIO_MAX_ITEMS - 1;
    mockPortfolio.count.mockImplementation(async () => stored);
    mockPortfolio.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      stored += 1;
      return { id: `i${stored}`, size: 1, ...data };
    });

    const [a, b] = await Promise.all([upload(), upload()]);
    expect([a.status, b.status].sort()).toEqual([201, 400]);
    expect(mockPortfolio.create).toHaveBeenCalledTimes(1);
  });

  it("sequential uploads below the cap succeed", async () => {
    mockPortfolio.count.mockResolvedValue(0);
    mockPortfolio.create.mockResolvedValue({ id: "i1", size: 1 });
    const res = await upload();
    expect(res.status).toBe(201);
  });
});

describe("PUT /api/portfolio/reorder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: "FREELANCER",
      emailVerified: true,
    });
    mockPortfolio.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    mockPortfolio.update.mockImplementation((args: unknown) => args);
  });

  it("applies all updates in a single transaction", async () => {
    mockPrismaClient.$transaction.mockResolvedValue([]);
    const res = await request(app).put("/api/portfolio/reorder").set(auth()).send({ ids: ["a", "b"] });
    expect(res.status).toBe(200);
    expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrismaClient.$transaction.mock.calls[0][0]).toEqual([
      { where: { id: "a" }, data: { displayOrder: 0 } },
      { where: { id: "b" }, data: { displayOrder: 1 } },
    ]);
  });

  it("returns 500 when the transaction fails", async () => {
    mockPrismaClient.$transaction.mockRejectedValue(new Error("boom"));
    const res = await request(app).put("/api/portfolio/reorder").set(auth()).send({ ids: ["a", "b"] });
    expect(res.status).toBe(500);
  });
});
