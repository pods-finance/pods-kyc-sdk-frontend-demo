import { describe, expect, it } from "vitest";
import {
  buildApiUrl,
  canUseMoneyMovement,
  formatTransferAmountIn,
  getDemoStatusEndpoint,
  getResponseMessage,
  getStatusEndpoint,
  getStatusLabel,
  getStatusTone,
  getSwapStatusEndpoint,
  normalizeVerificationStatus,
} from "./demo-status";

describe("normalizeVerificationStatus", () => {
  it("accepts Sumsub GREEN review answers as approved", () => {
    expect(
      normalizeVerificationStatus({
        reviewResult: { reviewAnswer: "GREEN" },
      }),
    ).toBe("approved");
  });

  it("reads nested API envelopes", () => {
    expect(
      normalizeVerificationStatus({
        data: { reviewStatus: "pending_review" },
      }),
    ).toBe("in_review");
  });

  it("does not approve a completed review when the answer is red", () => {
    expect(
      normalizeVerificationStatus({
        kycStatus: "rejected",
        reviewStatus: "completed",
        reviewAnswer: "RED",
      }),
    ).toBe("rejected");
  });

  it("keeps explicit not-started statuses empty", () => {
    expect(normalizeVerificationStatus({ kycStatus: "not_started" })).toBe(
      "not_started",
    );
  });

  it("treats unknown status values as pending instead of approved", () => {
    expect(normalizeVerificationStatus({ status: "manual_hold" })).toBe(
      "pending",
    );
  });

  it("returns not_started when no status-like value is present", () => {
    expect(normalizeVerificationStatus({ externalUserId: "user-1" })).toBe(
      "not_started",
    );
  });
});

describe("local money movement gate", () => {
  it("enables money movement only for approved users", () => {
    expect(canUseMoneyMovement("approved")).toBe(true);
    expect(canUseMoneyMovement("pending")).toBe(false);
    expect(canUseMoneyMovement("rejected")).toBe(false);
  });

  it("returns consistent label and tone metadata", () => {
    expect(getStatusLabel("in_review")).toBe("In review");
    expect(getStatusTone("approved")).toBe("success");
    expect(getStatusTone("error")).toBe("danger");
  });
});

describe("demo endpoints", () => {
  it("points status checks at the authenticated KYC status endpoint", () => {
    expect(getStatusEndpoint({ kycUserId: "00000000-0000-4000-8000-000000000001" })).toBe(
      "/api/v1/kyc/status?kycUserId=00000000-0000-4000-8000-000000000001",
    );
  });

  it("keeps legacy external user status checks available", () => {
    expect(getStatusEndpoint("user-1")).toBe("/api/v1/kyc/status?externalUserId=user-1");
  });

  it("builds status checks by email and wallet address", () => {
    expect(
      getDemoStatusEndpoint({
        email: "user@example.com",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    ).toBe(
      "/api/demo/kyc-status?email=user%40example.com&walletAddress=0x0000000000000000000000000000000000000001",
    );
  });

  it("keeps relative API paths when no external API base URL is configured", () => {
    expect(buildApiUrl("/api/v1/kyc/status")).toBe("/api/v1/kyc/status");
  });

  it("keeps customer simulator endpoints local to the Next.js app", () => {
    expect(buildApiUrl("/api/demo/kyc-session")).toBe("/api/demo/kyc-session");
    expect(buildApiUrl("/api/customer-webhooks/sumsub")).toBe(
      "/api/customer-webhooks/sumsub",
    );
  });

  it("builds Swap v2 status endpoints with an encoded quote id", () => {
    expect(getSwapStatusEndpoint("quote/1")).toBe(
      "/v2/swap/status/quote%2F1",
    );
  });
});

describe("transfer amount formatting", () => {
  it("converts BRL display amounts to cents for onramp quotes", () => {
    expect(formatTransferAmountIn("10", "onramp")).toBe("1000");
    expect(formatTransferAmountIn("10.50", "onramp")).toBe("1050");
    expect(formatTransferAmountIn("10,50", "onramp")).toBe("1050");
  });

  it("converts USDC display amounts to raw units for offramp quotes", () => {
    expect(formatTransferAmountIn("1", "offramp")).toBe("1000000");
    expect(formatTransferAmountIn("1.5", "offramp")).toBe("1500000");
    expect(formatTransferAmountIn("0.000001", "offramp")).toBe("1");
    expect(formatTransferAmountIn("1,25", "offramp")).toBe("1250000");
  });

  it("rejects invalid transfer amounts", () => {
    expect(formatTransferAmountIn("", "onramp")).toBeNull();
    expect(formatTransferAmountIn("10.555", "onramp")).toBeNull();
    expect(formatTransferAmountIn("1.0000001", "offramp")).toBeNull();
  });
});

describe("API error messages", () => {
  it("explains Sumsub signature mismatches as credential problems", () => {
    expect(
      getResponseMessage(
        {
          success: false,
          error: {
            code: "sumsub_upstream_error",
            message:
              "Sumsub API request failed with status 401 at /resources/applicants/test",
            details: {
              upstreamStatus: 401,
              description: "Request signature mismatch",
            },
          },
        },
        "fallback",
      ),
    ).toBe(
      "Sumsub API credentials are invalid. Check that SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY are from the same Sumsub app token pair, then restart the backend.",
    );
  });

  it("falls back to the API error message for ordinary failures", () => {
    expect(
      getResponseMessage(
        {
          success: false,
          error: {
            code: "validation_error",
            message: "Invalid request",
          },
        },
        "fallback",
      ),
    ).toBe("Invalid request");
  });
});
