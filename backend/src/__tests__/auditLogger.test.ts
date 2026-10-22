/**
 * Tests for the audit logging wrappers (issue #1554).
 *
 * Covers:
 *  - logAdminAction sends the exact ADMIN_ACTION payload to AuditService.record.
 *  - auditLogger.log sends the exact SECURITY_EVENT payload, with its field renames.
 */
jest.mock("../services/audit.service", () => ({
  AuditService: {
    record: jest.fn().mockResolvedValue(undefined),
  },
}));

import { AuditService } from "../services/audit.service";
import { auditLogger, logAdminAction } from "../utils/auditLogger";

const record = AuditService.record as jest.Mock;

describe("logAdminAction", () => {
  it("records an ADMIN_ACTION with adminId mapped to actorId", async () => {
    await logAdminAction("admin-1", "SUSPEND_USER", "user-9", { reason: "spam" });

    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toStrictEqual({
      category: "ADMIN_ACTION",
      action: "SUSPEND_USER",
      actorId: "admin-1",
      target: "user-9",
      metadata: { reason: "spam" },
    });
  });

  it("passes undefined metadata through when none is provided", async () => {
    await logAdminAction("admin-1", "DELETE_JOB", "job-3");

    expect(record.mock.calls[0][0]).toStrictEqual({
      category: "ADMIN_ACTION",
      action: "DELETE_JOB",
      actorId: "admin-1",
      target: "job-3",
      metadata: undefined,
    });
  });

  it("does not attach an ipAddress field", async () => {
    await logAdminAction("admin-1", "OVERRIDE_DISPUTE", "dispute-7");

    expect(record.mock.calls[0][0]).not.toHaveProperty("ipAddress");
  });

  it("resolves after the record has been enqueued", async () => {
    await expect(logAdminAction("admin-1", "X", "y")).resolves.toBeUndefined();
  });
});

describe("auditLogger.log", () => {
  it("records a SECURITY_EVENT with userId mapped to actorId and details mapped to metadata", () => {
    auditLogger.log({
      action: "BLOCKED_UPLOAD",
      userId: "user-2",
      details: { filename: "malware.exe" },
      ipAddress: "203.0.113.5",
    });

    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0][0]).toStrictEqual({
      category: "SECURITY_EVENT",
      action: "BLOCKED_UPLOAD",
      actorId: "user-2",
      metadata: { filename: "malware.exe" },
      ipAddress: "203.0.113.5",
    });
  });

  it("uses SECURITY_EVENT rather than ADMIN_ACTION, so the two categories stay distinct", () => {
    auditLogger.log({
      action: "VIRUS_DETECTED",
      userId: "user-2",
      details: null,
      ipAddress: "198.51.100.1",
    });

    expect(record.mock.calls[0][0].category).toBe("SECURITY_EVENT");
    expect(record.mock.calls[0][0].category).not.toBe("ADMIN_ACTION");
  });
});
