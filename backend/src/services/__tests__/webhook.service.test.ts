import crypto from "crypto";

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
const mockWebhook = {
  id: "wh-1",
  userId: "user-1",
  url: "https://example.com/hook",
  event: "job.status_changed",
  secret: "super-secret-key-for-testing",
  active: true,
  createdAt: new Date("2024-01-01"),
};

const mockDelivery = {
  id: "del-1",
  webhookId: "wh-1",
  event: "job.status_changed",
  payload: { jobId: "job-42", status: "IN_PROGRESS" },
  status: "pending",
  attempts: 0,
  webhook: mockWebhook,
};

const mockCreate = jest.fn().mockResolvedValue(mockDelivery);
const mockFindUnique = jest.fn().mockResolvedValue(mockDelivery);
const mockUpdate = jest.fn().mockResolvedValue({});
const mockFindMany = jest.fn().mockResolvedValue([mockWebhook]);
const mockDeleteMany = jest.fn().mockResolvedValue({ count: 1 });

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    webhook: {
      create: jest.fn().mockResolvedValue({
        id: "wh-1",
        url: "https://example.com/hook",
        event: "job.status_changed",
        active: true,
        createdAt: new Date("2024-01-01"),
      }),
      findMany: mockFindMany,
      deleteMany: mockDeleteMany,
    },
    webhookDelivery: {
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  })),
  Prisma: { InputJsonValue: {} },
}));

// ─── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Mock logger ──────────────────────────────────────────────────────────────
jest.mock("../../lib/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { WebhookService } from "../webhook.service";
import { logger } from "../../lib/logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeExpectedSignature(secret: string, body: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WebhookService — HMAC-SHA256 signature (#463)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    mockFindUnique.mockResolvedValue({ ...mockDelivery });
    mockUpdate.mockResolvedValue({});
  });

  it("includes X-StellarMarket-Signature header on every delivery", async () => {
    await WebhookService.deliver("del-1");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-StellarMarket-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("signature is correct HMAC-SHA256 of the serialised payload", async () => {
    await WebhookService.deliver("del-1");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;

    const expected = computeExpectedSignature(mockWebhook.secret, body);
    expect(headers["X-StellarMarket-Signature"]).toBe(expected);
  });

  it("signature changes when the payload changes", async () => {
    const bodyA = JSON.stringify({ event: "job.status_changed", data: { jobId: "job-1" } });
    const bodyB = JSON.stringify({ event: "job.status_changed", data: { jobId: "job-2" } });

    const sigA = computeExpectedSignature(mockWebhook.secret, bodyA);
    const sigB = computeExpectedSignature(mockWebhook.secret, bodyB);

    expect(sigA).not.toBe(sigB);
  });

  it("signature changes when the secret changes", async () => {
    const body = JSON.stringify({ event: "job.status_changed", data: { jobId: "job-42" } });
    const sig1 = computeExpectedSignature("secret-one", body);
    const sig2 = computeExpectedSignature("secret-two", body);

    expect(sig1).not.toBe(sig2);
  });

  it("includes X-StellarMarket-Event header matching the event type", async () => {
    await WebhookService.deliver("del-1");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-StellarMarket-Event"]).toBe("job.status_changed");
  });

  it("marks delivery as success when endpoint returns 2xx", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    await WebhookService.deliver("del-1");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "success" }),
      }),
    );
  });

  it("marks delivery as pending (retry) when endpoint returns non-2xx", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await WebhookService.deliver("del-1");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending" }),
      }),
    );
  });

  it("does not deliver when webhook is inactive", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockDelivery,
      webhook: { ...mockWebhook, active: false },
    });

    await WebhookService.deliver("del-1");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not deliver when max attempts reached", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockDelivery,
      attempts: 4, // MAX_ATTEMPTS: 1 initial attempt + 3 retries
    });

    await WebhookService.deliver("del-1");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("WebhookService — retry policy", () => {
  const start = new Date("2024-01-01T00:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(start);
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    mockUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("makes 4 attempts total and uses every configured retry delay before marking failed", async () => {
    for (let attempts = 0; attempts < 4; attempts++) {
      mockFindUnique.mockResolvedValueOnce({ ...mockDelivery, attempts });
      await WebhookService.deliver("del-1");
    }

    expect(mockFetch).toHaveBeenCalledTimes(4);

    const updates = mockUpdate.mock.calls.map(([arg]) => arg.data);
    expect(updates.map((d) => d.status)).toEqual(["pending", "pending", "pending", "failed"]);

    const retryDelays = updates.slice(0, 3).map((d) => d.nextRetry.getTime() - start.getTime());
    expect(retryDelays).toEqual([30_000, 120_000, 600_000]);

    expect(updates[3].nextRetry).toBeNull();
  });
});

describe("WebhookService — supported events", () => {
  it("recognises job.status_changed as a supported event", () => {
    expect(WebhookService.isSupportedEvent("job.status_changed")).toBe(true);
  });

  it("recognises milestone.approved as a supported event", () => {
    expect(WebhookService.isSupportedEvent("milestone.approved")).toBe(true);
  });

  it("rejects unknown event types", () => {
    expect(WebhookService.isSupportedEvent("unknown.event")).toBe(false);
  });
});

describe("WebhookService — unexpected failures inside deliver() (#1636)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves and logs when the DB lookup at the top of deliver() rejects", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(WebhookService.deliver("del-1")).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: "del-1" }),
      expect.any(String),
    );
  });

  it("resolves and logs when the DB update at the bottom of deliver() rejects", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...mockDelivery });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    mockUpdate.mockRejectedValueOnce(new Error("db write failed"));

    await expect(WebhookService.deliver("del-1")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
