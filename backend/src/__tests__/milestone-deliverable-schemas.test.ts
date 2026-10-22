import {
  deliverableParamSchema,
  deliverableDeleteParamSchema,
} from "../schemas/milestone";

const MILESTONE_ID = "00000000-0000-4000-8000-000000000200";
const ATTACHMENT_ID = "00000000-0000-4000-8000-000000000300";

describe("milestone deliverable param schemas (#1584)", () => {
  it("deliverableParamSchema rejects an empty milestone id", () => {
    expect(deliverableParamSchema.safeParse({ id: "" }).success).toBe(false);
    expect(deliverableParamSchema.safeParse({ id: MILESTONE_ID }).success).toBe(true);
  });

  it("deliverableDeleteParamSchema rejects an empty milestone id", () => {
    expect(
      deliverableDeleteParamSchema.safeParse({
        id: "",
        attachmentId: ATTACHMENT_ID,
      }).success,
    ).toBe(false);
  });

  it("deliverableDeleteParamSchema rejects an empty attachment id", () => {
    expect(
      deliverableDeleteParamSchema.safeParse({
        id: MILESTONE_ID,
        attachmentId: "",
      }).success,
    ).toBe(false);
  });

  it("deliverableDeleteParamSchema accepts valid ids", () => {
    expect(
      deliverableDeleteParamSchema.safeParse({
        id: MILESTONE_ID,
        attachmentId: ATTACHMENT_ID,
      }).success,
    ).toBe(true);
  });
});
