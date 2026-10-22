/**
 * Tests for logError (issue #1555).
 *
 * Covers:
 *  - Default-context formatting when no context is given.
 *  - Custom context formatting.
 *  - Sentry is not called when NEXT_PUBLIC_SENTRY_DSN is unset.
 *  - Sentry.captureException is called with the right tags when the DSN is set.
 */
jest.mock("@sentry/react", () => ({
  captureException: jest.fn(),
}));

import * as Sentry from "@sentry/react";
import { logError } from "../errorLogger";

const captureException = Sentry.captureException as jest.Mock;
const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

describe("logError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (originalDsn === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn;
    }
  });

  describe("console output", () => {
    it('defaults the context label to "Error" when no context is given', () => {
      const error = new Error("boom");

      logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]:", error);
    });

    it("uses the provided context as the label", () => {
      const error = new Error("boom");

      logError(error, "checkout");

      expect(consoleErrorSpy).toHaveBeenCalledWith("[checkout]:", error);
    });
  });

  describe("Sentry forwarding", () => {
    it("does not call Sentry when NEXT_PUBLIC_SENTRY_DSN is unset", () => {
      logError(new Error("boom"), "checkout");

      expect(captureException).not.toHaveBeenCalled();
    });

    it("calls Sentry.captureException with the context tag when the DSN is set", () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = "https://key@sentry.example/1";
      const error = new Error("boom");

      logError(error, "checkout");

      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(error, {
        tags: { context: "checkout" },
      });
    });

    it('tags the event with "unknown" when the DSN is set but no context is given', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = "https://key@sentry.example/1";
      const error = new Error("boom");

      logError(error);

      expect(captureException).toHaveBeenCalledWith(error, {
        tags: { context: "unknown" },
      });
    });

    it("still logs to the console when forwarding to Sentry", () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = "https://key@sentry.example/1";
      const error = new Error("boom");

      logError(error, "checkout");

      expect(consoleErrorSpy).toHaveBeenCalledWith("[checkout]:", error);
    });
  });
});
