import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../validation";
import { createJobSchema } from "../../schemas/job";

function makeReqRes(body: unknown, query?: unknown, params?: unknown) {
  const req = {
    body,
    query: query ?? {},
    params: params ?? {},
  } as unknown as Request;

  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as unknown as NextFunction;

  return { req, res, next, json, status };
}

describe("validate middleware", () => {
  const bodySchema = z.object({
    title: z.string().min(3),
    count: z.number().positive(),
  });

  it("calls next() when body is valid", () => {
    const { req, res, next } = makeReqRes({ title: "abc", count: 5 });
    validate({ body: bodySchema })(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 400 with {errors:[{field,message}]} when required field missing", () => {
    const { req, res, next, status, json } = makeReqRes({ count: 5 });
    validate({ body: bodySchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "title", message: expect.any(String) }),
      ]),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("includes field name in errors array for each invalid field", () => {
    const { req, res, next, status, json } = makeReqRes({});
    validate({ body: bodySchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0][0] as { errors: Array<{ field: string; message: string }> };
    const fields = body.errors.map((e) => e.field);
    expect(fields).toContain("title");
    expect(fields).toContain("count");
  });

  it("strips unknown fields from request body", () => {
    const { req, res, next } = makeReqRes({
      title: "abc",
      count: 5,
      __extra: "should be stripped",
    });
    validate({ body: bodySchema })(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect((req.body as { __extra?: unknown }).__extra).toBeUndefined();
  });

  it("returns 422 with BudgetBelowMinimum for budget validation", () => {
    const budgetSchema = createJobSchema.pick({ budget: true });
    const { req, res, next, status, json } = makeReqRes({ budget: 0 });
    validate({ body: budgetSchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe("BudgetBelowMinimum");
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    "The minimum job budget has not been met",
    "Le budget est inférieur au minimum autorisé",
  ])("returns 422 for a tagged budget error with message: %s", (message) => {
    const budgetSchema = z.object({
      budget: z.number().refine((budget) => budget >= 1, {
        message,
        params: { code: "BudgetBelowMinimum" },
      }),
    });
    const { req, res, next, status, json } = makeReqRes({ budget: 0 });
    validate({ body: budgetSchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({ code: "BudgetBelowMinimum", message });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for an untagged error even when its message matches the old prefix", () => {
    const budgetSchema = z.object({
      budget: z.number().min(1, "Budget must be at least 1 XLM"),
    });
    const { req, res, next, status, json } = makeReqRes({ budget: 0 });
    validate({ body: budgetSchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      code: "VALIDATION_ERROR",
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid budget type", () => {
    const { req, res, next, status, json } = makeReqRes({ budget: "0" });
    validate({ body: createJobSchema.pick({ budget: true }) })(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      code: "VALIDATION_ERROR",
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("validates query params and returns {errors} on failure", () => {
    const querySchema = z.object({
      page: z.coerce.number().positive(),
    });
    const { req, res, next, status, json } = makeReqRes(
      {},
      { page: "bad" },
    );
    validate({ query: querySchema })(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0][0];
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "page" }),
      ]),
    );
  });
});
