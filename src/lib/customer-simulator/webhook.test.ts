import { describe, expect, it } from "vitest";
import {
  createWebhookDigest,
  getWebhookReviewResult,
  isApprovedApplicantReviewed,
  isRejectedApplicantReviewed,
  verifySumsubWebhookDigest,
} from "./webhook";

describe("Sumsub webhook digest", () => {
  it("validates the raw payload digest sent by Sumsub", () => {
    const body = '{"type":"applicantReviewed"}';
    const digest = createWebhookDigest({ body, secret: "webhook-secret" });

    expect(
      verifySumsubWebhookDigest({
        algorithmHeader: "HMAC_SHA256_HEX",
        body,
        digestHeader: digest,
        secrets: ["webhook-secret"],
      }),
    ).toBe(true);
  });

  it("accepts any configured webhook secret", () => {
    const body = '{"type":"applicantReviewed"}';
    const digest = createWebhookDigest({ body, secret: "sandbox-secret" });

    expect(
      verifySumsubWebhookDigest({
        algorithmHeader: "HMAC_SHA256_HEX",
        body,
        digestHeader: digest,
        secrets: ["production-secret", "sandbox-secret"],
      }),
    ).toBe(true);
  });

  it("rejects mismatched webhook digests", () => {
    expect(
      verifySumsubWebhookDigest({
        algorithmHeader: "HMAC_SHA256_HEX",
        body: "{}",
        digestHeader: "abcd",
        secrets: ["webhook-secret"],
      }),
    ).toBe(false);
  });
});

describe("isApprovedApplicantReviewed", () => {
  it("accepts only completed GREEN applicantReviewed events", () => {
    expect(
      isApprovedApplicantReviewed({
        reviewResult: { reviewAnswer: "GREEN" },
        reviewStatus: "completed",
        type: "applicantReviewed",
      }),
    ).toBe(true);
  });

  it("ignores non-final or rejected events", () => {
    expect(
      isApprovedApplicantReviewed({
        reviewResult: { reviewAnswer: "GREEN" },
        reviewStatus: "pending",
        type: "applicantReviewed",
      }),
    ).toBe(false);
    expect(
      isApprovedApplicantReviewed({
        reviewResult: { reviewAnswer: "RED" },
        reviewStatus: "completed",
        type: "applicantReviewed",
      }),
    ).toBe(false);
  });
});

describe("rejected applicantReviewed events", () => {
  it("detects and extracts public rejection details", () => {
    const payload = {
      applicantId: "6a33e94e76e39288b039b554",
      correlationId: "4728621e24f5fa290016cb2ea51ef33a",
      externalUserId: "demo-user-1781786950533",
      inspectionId: "6a33e94e76e39288b039b554",
      levelName: "pods-kyc-level",
      reviewResult: {
        clientComment: "User made duplicate submission.",
        moderationComment: "Documents have been submitted on another profile.",
        rejectLabels: ["DUPLICATE", "REGULATIONS_VIOLATIONS"],
        reviewAnswer: "RED",
        reviewRejectType: "FINAL",
      },
      reviewStatus: "completed",
      type: "applicantReviewed",
    };

    expect(isRejectedApplicantReviewed(payload)).toBe(true);
    expect(getWebhookReviewResult(payload)).toMatchObject({
      clientComment: "User made duplicate submission.",
      correlationId: "4728621e24f5fa290016cb2ea51ef33a",
      inspectionId: "6a33e94e76e39288b039b554",
      levelName: "pods-kyc-level",
      moderationComment: "Documents have been submitted on another profile.",
      rejectLabels: ["DUPLICATE", "REGULATIONS_VIOLATIONS"],
      reviewAnswer: "RED",
      reviewRejectType: "FINAL",
      reviewStatus: "completed",
    });
  });
});
