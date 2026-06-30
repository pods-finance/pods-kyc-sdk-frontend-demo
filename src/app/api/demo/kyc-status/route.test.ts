import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getDemoKycSessionMetadata: vi.fn(),
  getKycStatus: vi.fn(),
  PodsApiError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly path: string,
      public readonly responseBody: string,
    ) {
      super(`Pods API request failed with status ${status} at ${path}`);
    }
  },
}));

vi.mock("@/lib/customer-simulator/env", () => ({
  getCustomerSimulatorEnv: () => ({
    podsApiBaseUrl: "https://pods-api.example",
    podsApiKey: "pods-api-key",
  }),
}));

vi.mock("@/lib/customer-simulator/pods", () => ({
  PodsApiError: mocks.PodsApiError,
  PodsKycClient: class {
    getKycStatus = mocks.getKycStatus;
  },
}));

vi.mock("@/lib/customer-simulator/session-store", () => ({
  getDemoKycSessionMetadata: (externalUserId: string) =>
    mocks.getDemoKycSessionMetadata(externalUserId),
}));

function requestFor(query: string) {
  return new Request(`http://localhost/api/demo/kyc-status?${query}`);
}

describe("GET /api/demo/kyc-status", () => {
  beforeEach(() => {
    mocks.getDemoKycSessionMetadata.mockReset();
    mocks.getKycStatus.mockReset();
  });

  it("returns pending while the demo waits for the webhook kycUserId", async () => {
    mocks.getDemoKycSessionMetadata.mockReturnValue({
      email: "user@example.com",
      externalUserId: "demo-user-001",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });

    const response = await GET(requestFor("externalUserId=demo-user-001"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getKycStatus).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      data: {
        externalUserId: "demo-user-001",
        status: "pending",
      },
      success: true,
    });
  });

  it("returns locally stored rejection state without calling Pods", async () => {
    mocks.getDemoKycSessionMetadata.mockReturnValue({
      clientComment: "User made duplicate submission.",
      externalUserId: "demo-user-001",
      rejectLabels: ["DUPLICATE"],
      reviewRejectType: "FINAL",
      status: "rejected",
    });

    const response = await GET(requestFor("externalUserId=demo-user-001"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getKycStatus).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      data: {
        clientComment: "User made duplicate submission.",
        externalUserId: "demo-user-001",
        rejectLabels: ["DUPLICATE"],
        reviewRejectType: "FINAL",
        status: "rejected",
      },
      success: true,
    });
  });

  it("queries Pods by kycUserId when it is available", async () => {
    mocks.getKycStatus.mockResolvedValue({
      data: {
        kycUserId: "kyc_123",
        status: "approved",
      },
      success: true,
    });

    const response = await GET(requestFor("kycUserId=kyc_123"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getKycStatus).toHaveBeenCalledWith({
      kycUserId: "kyc_123",
    });
    expect(payload).toMatchObject({
      data: {
        kycUserId: "kyc_123",
        status: "approved",
      },
      success: true,
    });
  });

  it("queries Pods by email and wallet address for existing KYC recovery", async () => {
    mocks.getKycStatus.mockResolvedValue({
      data: {
        kycUserId: "kyc_456",
        status: "approved",
      },
      success: true,
    });

    const response = await GET(
      requestFor(
        "email=user%40example.com&walletAddress=0x0000000000000000000000000000000000000001",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getKycStatus).toHaveBeenCalledWith({
      email: "user@example.com",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
    expect(payload).toMatchObject({
      data: {
        kycUserId: "kyc_456",
        status: "approved",
      },
      success: true,
    });
  });

  it("returns not found when email and wallet address do not match a KYC profile", async () => {
    mocks.getKycStatus.mockRejectedValue(
      new mocks.PodsApiError(404, "/api/v1/kyc/status", "{}"),
    );

    const response = await GET(
      requestFor(
        "email=user%40example.com&walletAddress=0x0000000000000000000000000000000000000001",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      error: {
        code: "kyc_profile_not_found",
      },
      success: false,
    });
  });
});
