/**
 * Tests for buildConversationSummaries (issue #1552).
 *
 * Covers:
 *  - "partner" grouping merges all messages with the same counterpart,
 *    across jobs, into a single conversation.
 *  - "partner-and-job" grouping keeps one conversation per counterpart per job,
 *    including messages that have no job.
 *  - Unread counting only counts incoming messages that are still unread.
 *  - lastMessage is the first message seen for each group (input is newest-first).
 */
import { buildConversationSummaries } from "../utils/conversations";

const me = { id: "me", username: "me", avatarUrl: null };
const alice = { id: "alice", username: "alice", avatarUrl: null };
const bob = { id: "bob", username: "bob", avatarUrl: null };

type TestMessage = Parameters<typeof buildConversationSummaries>[0][number];

const makeMessage = (overrides: Partial<TestMessage>): TestMessage => ({
  senderId: alice.id,
  receiverId: me.id,
  jobId: null,
  read: false,
  sender: alice,
  receiver: me,
  job: null,
  ...overrides,
});

describe("buildConversationSummaries", () => {
  describe('groupBy: "partner"', () => {
    it("merges messages with the same counterpart across different jobs", () => {
      const messages = [
        makeMessage({ jobId: "job-2", job: { id: "job-2", title: "Second" }, read: true }),
        makeMessage({ jobId: "job-1", job: { id: "job-1", title: "First" }, read: true }),
      ];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(alice.id);
      expect(result[0].otherUser).toEqual(alice);
    });

    it("keeps separate conversations for different counterparts", () => {
      const messages = [
        makeMessage({ senderId: alice.id, sender: alice, read: true }),
        makeMessage({ senderId: bob.id, sender: bob, read: true }),
      ];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result.map((c) => c.id).sort()).toEqual([alice.id, bob.id]);
    });
  });

  describe('groupBy: "partner-and-job"', () => {
    it("keeps per-job conversations separate for the same counterpart", () => {
      const messages = [
        makeMessage({ jobId: "job-2", job: { id: "job-2", title: "Second" }, read: true }),
        makeMessage({ jobId: "job-1", job: { id: "job-1", title: "First" }, read: true }),
      ];

      const result = buildConversationSummaries(messages, me.id, {
        groupBy: "partner-and-job",
      });

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id).sort()).toEqual([
        `${alice.id}-job-1`,
        `${alice.id}-job-2`,
      ]);
    });

    it('uses a "no-job" bucket for messages without a jobId', () => {
      const messages = [makeMessage({ jobId: null, job: null, read: true })];

      const result = buildConversationSummaries(messages, me.id, {
        groupBy: "partner-and-job",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(`${alice.id}-no-job`);
      expect(result[0].job).toBeNull();
    });

    it("attaches the job summary to the conversation", () => {
      const job = { id: "job-1", title: "First" };
      const messages = [makeMessage({ jobId: "job-1", job, read: true })];

      const result = buildConversationSummaries(messages, me.id, {
        groupBy: "partner-and-job",
      });

      expect(result[0].job).toEqual(job);
    });
  });

  describe("unreadCount", () => {
    it("counts incoming unread messages", () => {
      const messages = [
        makeMessage({ read: false }),
        makeMessage({ read: false }),
      ];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result[0].unreadCount).toBe(2);
    });

    it("ignores incoming messages that have been read", () => {
      const messages = [
        makeMessage({ read: true }),
        makeMessage({ read: false }),
      ];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result[0].unreadCount).toBe(1);
    });

    it("does not count outgoing messages, even when unread", () => {
      const outgoing = makeMessage({
        senderId: me.id,
        sender: me,
        receiverId: alice.id,
        receiver: alice,
        read: false,
      });

      const result = buildConversationSummaries([outgoing], me.id, { groupBy: "partner" });

      expect(result[0].unreadCount).toBe(0);
    });

    it("sums unread counts across jobs when grouping by partner", () => {
      const messages = [
        makeMessage({ jobId: "job-2", read: false }),
        makeMessage({ jobId: "job-1", read: false }),
        makeMessage({ jobId: "job-1", read: true }),
      ];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result[0].unreadCount).toBe(2);
    });
  });

  describe("lastMessage", () => {
    it("uses the first (newest) message seen for each group", () => {
      const newest = makeMessage({ jobId: null, read: true, receiverId: me.id });
      const older = makeMessage({ jobId: null, read: true, receiverId: me.id });
      const messages = [newest, older];

      const result = buildConversationSummaries(messages, me.id, { groupBy: "partner" });

      expect(result[0].lastMessage).toBe(newest);
    });

    it("picks the newest message per job when grouping by partner-and-job", () => {
      const newestJob1 = makeMessage({ jobId: "job-1", read: true });
      const newestJob2 = makeMessage({ jobId: "job-2", read: true });
      const olderJob1 = makeMessage({ jobId: "job-1", read: true });
      const messages = [newestJob1, newestJob2, olderJob1];

      const result = buildConversationSummaries(messages, me.id, {
        groupBy: "partner-and-job",
      });

      const job1 = result.find((c) => c.id === `${alice.id}-job-1`);
      const job2 = result.find((c) => c.id === `${alice.id}-job-2`);
      expect(job1?.lastMessage).toBe(newestJob1);
      expect(job2?.lastMessage).toBe(newestJob2);
    });
  });

  describe("otherUser resolution", () => {
    it("uses the receiver as the counterpart when the user sent the message", () => {
      const outgoing = makeMessage({
        senderId: me.id,
        sender: me,
        receiverId: bob.id,
        receiver: bob,
        read: true,
      });

      const result = buildConversationSummaries([outgoing], me.id, { groupBy: "partner" });

      expect(result[0].id).toBe(bob.id);
      expect(result[0].otherUser).toEqual(bob);
    });
  });

  it("returns an empty array when there are no messages", () => {
    expect(buildConversationSummaries([], me.id, { groupBy: "partner" })).toEqual([]);
  });
});
