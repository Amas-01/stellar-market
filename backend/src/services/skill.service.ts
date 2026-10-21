import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SkillSuggestion {
  id: string;
  name: string;
  category: string | null;
}

const EMPTY_QUERY_MAX_LIMIT = 100;

/**
 * Up to `limit` canonical skills whose name contains `query` (case-insensitive).
 * An empty query lists the first skills alphabetically, capped at `limit` (max 100).
 * Backs the profile-page autocomplete combobox.
 */
export async function searchSkills(query: string, limit?: number): Promise<SkillSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return prisma.skill.findMany({
      orderBy: { name: "asc" },
      take: Math.min(limit ?? EMPTY_QUERY_MAX_LIMIT, EMPTY_QUERY_MAX_LIMIT),
      select: { id: true, name: true, category: true },
    });
  }

  return prisma.skill.findMany({
    where: { name: { contains: trimmed, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit ?? 10,
    select: { id: true, name: true, category: true },
  });
}

/**
 * Maps each submitted skill to its canonical form when it matches an existing
 * skill's name or one of its aliases (case-insensitive) — e.g. "ReactJS" and
 * "react.js" both resolve to "React". Skills with no canonical match (custom,
 * freelancer-entered skills) pass through unchanged, deduplicated and trimmed.
 */
export async function normalizeSkills(submitted: string[]): Promise<string[]> {
  const trimmed = [...new Set(submitted.map((skill) => skill.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const canonicalSkills = await prisma.skill.findMany({
    select: { name: true, aliases: true },
  });

  const lookup = new Map<string, string>();
  for (const skill of canonicalSkills) {
    lookup.set(skill.name.toLowerCase(), skill.name);
    for (const alias of skill.aliases) {
      lookup.set(alias.toLowerCase(), skill.name);
    }
  }

  const normalized = trimmed.map((skill) => lookup.get(skill.toLowerCase()) ?? skill);
  return [...new Set(normalized)];
}
