import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeInPlace = (value: unknown, path: string = ""): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      sanitizeInPlace(item, path);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      const fieldPath = path ? `${path}.${key}` : key;
      logger.warn({ field: fieldPath }, "Stripped potentially dangerous input field");
      delete value[key];
      continue;
    }

    sanitizeInPlace(value[key], path ? `${path}.${key}` : key);
  }
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  sanitizeInPlace(req.body, "body");
  sanitizeInPlace(req.query, "query");
  next();
};
