/**
 * Regression tests for:
 *  - #1639: a redelivered BadgeAwarded event must not send a second notification.
 *  - #1638: overrideHorizonCursor must reject non-integer input instead of silently
 *    doing nothing.
 */

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  badge: {
    create: jest.fn(),
  },
  syncState: {
    upsert: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  BadgeTier: {
    BRONZE: "BRONZE",
    SILVER: "SILVER",
    GOLD: "GOLD",
    PLATINUM: "PLATINUM",
  },
  EscrowEventType: {
    JOB_CREATED: "JOB_CREATED",
    JOB_FUNDED: "JOB_FUNDED",
    PAYMENT_RELEASED: "PAYMENT_RELEASED",
    DISPUTE_OPENED: "DISPUTE_OPENED",
    DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
  NotificationType: {
    BADGE_AWARDED: "BADGE_AWARDED",
  },
}));

jest.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: jest.fn(() => ({
      getEvents: jest.fn(),
      getLatestLedger: jest.fn(),
    })),
  },
  scValToNative: jest.fn((value: { native: unknown }) => value.native),
  xdr: {
    ScVal: {
      fromXDR: jest.fn(),
    },
  },
}));

jest.mock("../../config", () => ({
  config: {
    stellar: {
      rpcUrl: "https://rpc.test",
      escrowContractId: "escrow-contract",
      disputeContractId: "dispute-contract",
      reputationContractId: "reputation-contract",
    },
  },
}));

const mockSendNotification = jest.fn();
jest.mock("../notification.service", () => ({
  NotificationService: {
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    deliverPersistedNotification: jest.fn(),
  },
}));

const mockInvalidateCache = jest.fn();
jest.mock("../reputation-cache.service", () => ({
  ReputationCacheService: {
    invalidateCache: (...args: unknown[]) => mockInvalidateCache(...args),
  },
}));

jest.mock("../../lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

function makeBadgeEvent(ledger: number) {
  const scVal = (native: unknown) => ({
    native,
    toXDR: jest.fn(() => Buffer.from(JSON.stringify(native)).toString("base64")),
  });

  return {
    id: String(ledger),
    pagingToken: String(ledger),
    type: "contract",
    ledger,
    ledgerClosedAt: "2026-06-19T12:00:00Z",
    contractId: "contract",
    txHash: `tx-${ledger}`,
    inSuccessfulContractCall: true,
    topic: [scVal("reput"), scVal("badge")],
    value: scVal(["GWALLET", "GOLD"]),
  };
}

// Prisma's P2002 unique-constraint error, as surfaced by the client.
function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed on (userId, tier)"), {
    code: "P2002",
  });
}

describe("handleBadgeAwarded — notification dedupe on redelivery (#1639)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockSendNotification.mockResolvedValue(undefined);
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  it("sends exactly one notification when the same event is delivered twice", async () => {
    const service = await import("../horizon-listener.service");
    const event = makeBadgeEvent(500);

    mockPrisma.badge.create
      .mockResolvedValueOnce({ id: "badge-1", awardedLedger: 500 })
      .mockRejectedValueOnce(uniqueViolation());

    await service.processHorizonEvent(event as unknown as Parameters<typeof service.processHorizonEvent>[0]);
    await service.processHorizonEvent(event as unknown as Parameters<typeof service.processHorizonEvent>[0]);

    expect(mockPrisma.badge.create).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "BADGE_AWARDED" }),
    );
  });

  it("still sends exactly one notification for a legitimate new badge award", async () => {
    const service = await import("../horizon-listener.service");
    mockPrisma.badge.create.mockResolvedValueOnce({ id: "badge-2", awardedLedger: 777 });

    await service.processHorizonEvent(
      makeBadgeEvent(777) as unknown as Parameters<typeof service.processHorizonEvent>[0],
    );

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });
});

describe("overrideHorizonCursor — input validation (#1638)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.syncState.upsert.mockResolvedValue({});
  });

  it("throws a clear error for a non-numeric cursor and does not touch sync state", async () => {
    const service = await import("../horizon-listener.service");

    await expect(service.overrideHorizonCursor("abc")).rejects.toThrow(/Invalid Horizon cursor/);
    expect(mockPrisma.syncState.upsert).not.toHaveBeenCalled();
  });

  it.each(["12abc", "-5", "1.5", "", " 42"])("rejects malformed cursor %p", async (cursor) => {
    const service = await import("../horizon-listener.service");

    await expect(service.overrideHorizonCursor(cursor)).rejects.toThrow(/Invalid Horizon cursor/);
    expect(mockPrisma.syncState.upsert).not.toHaveBeenCalled();
  });

  it("still updates the sync state for a valid numeric cursor", async () => {
    const service = await import("../horizon-listener.service");

    await service.overrideHorizonCursor("12345");

    expect(mockPrisma.syncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { lastIndexedLedger: 12345 },
        create: expect.objectContaining({ lastIndexedLedger: 12345 }),
      }),
    );
  });
});
