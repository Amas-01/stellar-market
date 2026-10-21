type MockPrismaClient = {
  skill: { findMany: jest.Mock };
};

jest.mock("@prisma/client", () => {
  const mockPrisma: MockPrismaClient = {
    skill: { findMany: jest.fn() },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

import { PrismaClient } from "@prisma/client";
import { normalizeSkills, searchSkills } from "../skill.service";

const prismaMock = new PrismaClient() as unknown as MockPrismaClient;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.skill.findMany.mockResolvedValue([
    { name: "React", aliases: ["ReactJS", "React.js", "react.js"] },
    { name: "Node.js", aliases: ["NodeJS", "Node"] },
  ]);
});

describe("normalizeSkills", () => {
  it("maps alias spellings to the canonical skill name", async () => {
    const result = await normalizeSkills(["ReactJS", "react.js", "NodeJS"]);
    expect(result).toEqual(["React", "Node.js"]);
  });

  it("is case-insensitive when matching the canonical name itself", async () => {
    const result = await normalizeSkills(["react"]);
    expect(result).toEqual(["React"]);
  });

  it("passes through skills with no canonical match unchanged", async () => {
    const result = await normalizeSkills(["Astro", "React"]);
    expect(result).toEqual(["Astro", "React"]);
  });

  it("trims and dedupes the submitted list", async () => {
    const result = await normalizeSkills([" ReactJS ", "react.js", "", "  "]);
    expect(result).toEqual(["React"]);
  });

  it("returns an empty array for an empty submission", async () => {
    const result = await normalizeSkills([]);
    expect(result).toEqual([]);
    expect(prismaMock.skill.findMany).not.toHaveBeenCalled();
  });
});

describe("searchSkills — limit handling", () => {
  it("empty query honours a small limit", async () => {
    await searchSkills("", 5);
    expect(prismaMock.skill.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it("empty query with no limit keeps the default of 100", async () => {
    await searchSkills("");
    expect(prismaMock.skill.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it("empty query caps the limit at 100", async () => {
    await searchSkills("   ", 500);
    expect(prismaMock.skill.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it("non-empty query uses the caller's limit", async () => {
    await searchSkills("rea", 3);
    expect(prismaMock.skill.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
  });

  it("non-empty query with no limit defaults to 10", async () => {
    await searchSkills("rea");
    expect(prismaMock.skill.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });
});
