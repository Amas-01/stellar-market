import request from "supertest";
import express from "express";

jest.mock("@prisma/client", () => {
  const mockPrisma = {
    job: { count: jest.fn().mockResolvedValue(3) },
    user: { count: jest.fn().mockResolvedValue(2) },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

const mockCache = jest.fn(async (_key: string, _ttl: number, fn: () => Promise<unknown>) => ({
  data: await fn(),
  hit: false,
}));
jest.mock("../../lib/cache", () => ({
  cache: (key: string, ttl: number, fn: () => Promise<unknown>) => mockCache(key, ttl, fn),
}));

import categoryRouter from "../category.routes";

const app = express();
app.use("/api/categories", categoryRouter);

afterEach(() => mockCache.mockClear());

describe("GET /api/categories/:slug", () => {
  it("returns the canonical slug regardless of request casing", async () => {
    const variants = ["smart-contract", "Smart-Contract", "SMART-CONTRACT"];
    const slugs: string[] = [];
    for (const v of variants) {
      const res = await request(app).get(`/api/categories/${v}`);
      expect(res.status).toBe(200);
      slugs.push(res.body.data.slug);
    }
    expect(new Set(slugs)).toEqual(new Set(["smart-contract"]));
  });

  it("matches the slug returned by GET /categories", async () => {
    const list = await request(app).get("/api/categories");
    const listed = list.body.data.find((c: { name: string }) => c.name === "Smart Contract");
    const res = await request(app).get("/api/categories/Smart-Contract");
    expect(res.body.data.slug).toBe(listed.slug);
  });

  it("uses one cache key for all casing variants", async () => {
    await request(app).get("/api/categories/Backend");
    await request(app).get("/api/categories/BACKEND");
    const keys = mockCache.mock.calls.map((c) => c[0]);
    expect(new Set(keys)).toEqual(new Set(["category:backend"]));
  });

  it("returns 404 for unknown slugs", async () => {
    const res = await request(app).get("/api/categories/nope");
    expect(res.status).toBe(404);
  });
});
