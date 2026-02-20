import { NextFunction, Request, Response } from "express";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeInPlace = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      sanitizeInPlace(item);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }

    sanitizeInPlace(value[key]);
  }
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.query);
  next();
};
