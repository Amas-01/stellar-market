jest.mock("../../middleware/error", () => ({
  createError: jest.fn((msg: string, code: number) => {
    const err: any = new Error(msg);
    err.statusCode = code;
    return err;
  }),
}));

jest.mock("@prisma/client", () => {
  const mockMethods = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      milestone: Object.assign({}, mockMethods),
      deadlineExtensionRequest: Object.assign({}, mockMethods),
      job: Object.assign({}, mockMethods),
      user: Object.assign({}, mockMethods),
      notification: Object.assign({}, mockMethods),
      pendingNotification: Object.assign({}, mockMethods),
      $use: jest.fn(),
      $on: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
    DeadlineExtensionStatus: {
      PENDING: "PENDING",
      APPROVED_BY_CLIENT: "APPROVED_BY_CLIENT",
      APPROVED_BY_FREELANCER: "APPROVED_BY_FREELANCER",
      APPROVED_BY_BOTH: "APPROVED_BY_BOTH",
      REJECTED: "REJECTED",
    },
    JobStatus: {
      OPEN: "OPEN",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
    },
    MilestoneStatus: {
      PENDING: "PENDING",
      APPROVED: "APPROVED",
      REJECTED: "REJECTED",
    },
  };
});

jest.mock("../../services/contract.service", () => ({ ContractService: {} }));
jest.mock("../../services/notification.service", () => ({
  NotificationService: { sendNotification: jest.fn() },
}));
jest.mock("../../config", () => ({ config: {} }));

import { DeadlineExtensionService } from "../deadline-extension.service";
import { createError } from "../../middleware/error";

const mockNow = new Date("2026-12-01");
const mockJobDeadline = new Date("2026-12-15");

function getMockPrisma() {
  return new (jest.requireMock("@prisma/client").PrismaClient)();
}

describe("DeadlineExtensionService deadline guard (#946)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const prisma = getMockPrisma();
    prisma.milestone.findUnique.mockResolvedValue({
      id: "ms-1",
      jobId: "job-1",
      title: "Milestone 1",
      contractDeadline: null,
      dueDate: null,
      job: { id: "job-1", clientId: "client-1", freelancerId: "freelancer-1", deadline: mockJobDeadline },
    });
    prisma.deadlineExtensionRequest.findFirst.mockResolvedValue(null);
    prisma.deadlineExtensionRequest.create.mockResolvedValue({ id: "ext-1" });
  });

  it("rejects deadline earlier than current deadline with 400", async () => {
    const earlier = new Date("2026-11-15");

    await expect(
      DeadlineExtensionService.requestExtension("ms-1", "job-1", "freelancer-1", earlier, "Need more time"),
    ).rejects.toThrow();

    expect(createError).toHaveBeenCalledWith("New deadline must be later than the current deadline", 400);
  });

  it("rejects deadline equal to current deadline with 400", async () => {
    await expect(
      DeadlineExtensionService.requestExtension("ms-1", "job-1", "freelancer-1", mockJobDeadline, "Need more time"),
    ).rejects.toThrow();

    expect(createError).toHaveBeenCalledWith("New deadline must be later than the current deadline", 400);
  });

  it("accepts deadline later than current deadline", async () => {
    const later = new Date("2026-12-20");

    const result = await DeadlineExtensionService.requestExtension(
      "ms-1", "job-1", "freelancer-1", later, "Need more time",
    );

    expect(result).toBeDefined();
  });

  it("falls back through contractDeadline -> dueDate -> job.deadline", async () => {
    const prisma = getMockPrisma();
    prisma.milestone.findUnique.mockResolvedValue({
      id: "ms-1",
      jobId: "job-1",
      title: "Milestone 1",
      contractDeadline: new Date("2026-12-10"),
      dueDate: new Date("2026-12-05"),
      job: { id: "job-1", clientId: "client-1", freelancerId: "freelancer-1", deadline: new Date("2026-12-01") },
    });
    prisma.deadlineExtensionRequest.findFirst.mockResolvedValue(null);
    prisma.deadlineExtensionRequest.create.mockResolvedValue({ id: "ext-1" });

    await expect(
      DeadlineExtensionService.requestExtension("ms-1", "job-1", "freelancer-1", new Date("2026-12-08"), "Need more time"),
    ).rejects.toThrow();

    expect(createError).toHaveBeenCalledWith("New deadline must be later than the current deadline", 400);
  });
});
