import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createWebhookDigest } from "@/lib/customer-simulator/webhook";

const walletAddress = "0x0000000000000000000000000000000000000001";

const mocks = vi.hoisted(() => ({
  generateShareToken: vi.fn(),
  getDemoKycSessionMetadata: vi.fn(),
  importSumsubShareToken: vi.fn(),
  storeDemoKycSessionMetadata: vi.fn(),
}));

vi.mock("@/lib/customer-simulator/env", () => ({
  getCustomerSimulatorEnv: () => ({
    aveniaForClientId: "brla.digital_101963",
    podsApiBaseUrl: "https://pods-api.example",
    podsApiKey: "pods-api-key",
    sumsubAppToken: "sumsub-app-token",
    sumsubApiBaseUrl: "https://api.sumsub.com",
    sumsubEnvironment: "production",
    sumsubSecretKey: "sumsub-secret-key",
    sumsubWebhookSecrets: ["webhook-secret"],
  }),
}));

vi.mock("@/lib/customer-simulator/pods", () => ({
  PodsKycClient: class {
    importSumsubShareToken = mocks.importSumsubShareToken;
  },
}));

vi.mock("@/lib/customer-simulator/session-store", () => ({
  getDemoKycSessionMetadata: (externalUserId: string) =>
    mocks.getDemoKycSessionMetadata(externalUserId),
  storeDemoKycSessionMetadata: (input: unknown) =>
    mocks.storeDemoKycSessionMetadata(input),
}));

vi.mock("@/lib/customer-simulator/sumsub", () => ({
  SumsubClient: class {
    generateShareToken = mocks.generateShareToken;
  },
}));

function webhookRequest(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const digest = createWebhookDigest({ body, secret: "webhook-secret" });

  return new Request("http://localhost/api/customer-webhooks/sumsub", {
    body,
    headers: {
      "Content-Type": "application/json",
      "x-payload-digest": digest,
      "x-payload-digest-alg": "HMAC_SHA256_HEX",
    },
    method: "POST",
  });
}

describe("POST /api/customer-webhooks/sumsub", () => {
  beforeEach(() => {
    mocks.generateShareToken.mockReset();
    mocks.getDemoKycSessionMetadata.mockReset();
    mocks.importSumsubShareToken.mockReset();
    mocks.storeDemoKycSessionMetadata.mockReset();
  });

  it("uses local demo metadata to submit approved Sumsub KYC to Pods", async () => {
    mocks.getDemoKycSessionMetadata.mockReturnValue({
      email: "user@example.com",
      externalUserId: "app-user-001",
      walletAddress,
    });
    mocks.generateShareToken.mockResolvedValue({ token: "sumsub-share-token" });
    mocks.importSumsubShareToken.mockResolvedValue({
      data: {
        kycUserId: "00000000-0000-4000-8000-000000000001",
        status: "provider_pending",
      },
      success: true,
    });

    const response = await POST(
      webhookRequest({
        applicantId: "sumsub-applicant-id",
        externalUserId: "app-user-001",
        reviewResult: { reviewAnswer: "GREEN" },
        reviewStatus: "completed",
        type: "applicantReviewed",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.importSumsubShareToken).toHaveBeenCalledWith({
      email: "user@example.com",
      shareToken: "sumsub-share-token",
      sumsubApplicantId: "sumsub-applicant-id",
      walletAddress,
    });
    expect(mocks.storeDemoKycSessionMetadata).toHaveBeenCalledWith({
      email: "user@example.com",
      externalUserId: "app-user-001",
      kycUserId: "00000000-0000-4000-8000-000000000001",
      walletAddress,
    });
    expect(payload).toMatchObject({
      data: {
        processed: true,
        status: "submitted_to_pods",
      },
      success: true,
    });
  });

  it("does not call Pods when approved webhook metadata is missing", async () => {
    mocks.getDemoKycSessionMetadata.mockReturnValue(null);

    const response = await POST(
      webhookRequest({
        applicantId: "sumsub-applicant-id",
        externalUserId: "app-user-001",
        reviewResult: { reviewAnswer: "GREEN" },
        reviewStatus: "completed",
        type: "applicantReviewed",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(mocks.generateShareToken).not.toHaveBeenCalled();
    expect(mocks.importSumsubShareToken).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      error: {
        code: "customer_simulator_error",
        message:
          "Demo session metadata is missing email or walletAddress for this externalUserId. Generate the SDK link again from the demo UI with email and wallet address filled before completing Sumsub.",
      },
      success: false,
    });
  });

  it("stores rejected Sumsub KYC locally without calling a missing Pods route", async () => {
    const response = await POST(
      webhookRequest({
        applicantId: "sumsub-applicant-id",
        externalUserId: "app-user-001",
        reviewResult: {
          clientComment: "User made duplicate submission.",
          moderationComment: "Duplicate profile.",
          rejectLabels: ["DUPLICATE"],
          reviewAnswer: "RED",
          reviewRejectType: "FINAL",
        },
        reviewStatus: "completed",
        type: "applicantReviewed",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.generateShareToken).not.toHaveBeenCalled();
    expect(mocks.importSumsubShareToken).not.toHaveBeenCalled();
    expect(mocks.storeDemoKycSessionMetadata).toHaveBeenCalledWith({
      clientComment: "User made duplicate submission.",
      externalUserId: "app-user-001",
      moderationComment: "Duplicate profile.",
      rejectLabels: ["DUPLICATE"],
      reviewRejectType: "FINAL",
      status: "rejected",
    });
    expect(payload).toMatchObject({
      data: {
        externalUserId: "app-user-001",
        processed: true,
        reviewAnswer: "RED",
        reviewRejectType: "FINAL",
        status: "sumsub_rejected",
      },
      success: true,
    });
  });
});
