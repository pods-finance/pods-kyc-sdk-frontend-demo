import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  generateSdkAccessToken: vi.fn(),
  storeDemoKycSessionMetadata: vi.fn(),
}));

vi.mock("@/lib/customer-simulator/env", () => ({
  getCustomerSimulatorEnv: () => ({
    podsApiBaseUrl: "https://pods-api.example",
    podsApiKey: "pods-api-key",
    sumsubAppToken: "sumsub-app-token",
    sumsubApiBaseUrl: "https://api.sumsub.com",
    sumsubEnvironment: "production",
    sumsubLevelName: "pods-kyc-level",
    sumsubSecretKey: "sumsub-secret-key",
  }),
}));

vi.mock("@/lib/customer-simulator/pods", () => ({
  PodsKycClient: class {
  },
}));

vi.mock("@/lib/customer-simulator/session-store", () => ({
  storeDemoKycSessionMetadata: (input: unknown) =>
    mocks.storeDemoKycSessionMetadata(input),
}));

vi.mock("@/lib/customer-simulator/sumsub", () => ({
  SumsubClient: class {
    generateSdkAccessToken = mocks.generateSdkAccessToken;
  },
}));

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/demo/kyc-session", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/demo/kyc-session", () => {
  beforeEach(() => {
    mocks.generateSdkAccessToken.mockReset();
    mocks.storeDemoKycSessionMetadata.mockReset();
  });

  it("rejects session creation without required user metadata", async () => {
    const response = await POST(jsonRequest({ externalUserId: "user-1" }));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toMatchObject({
      error: {
        code: "validation_error",
        message: "email is required to generate the Sumsub SDK link",
      },
      success: false,
    });
    expect(mocks.generateSdkAccessToken).not.toHaveBeenCalled();
    expect(mocks.storeDemoKycSessionMetadata).not.toHaveBeenCalled();
  });

  it("generates the Sumsub SDK token and stores metadata for the webhook", async () => {
    mocks.generateSdkAccessToken.mockResolvedValue({
      token: "sdk-access-token",
      userId: "user-1",
    });

    const response = await POST(
      jsonRequest({
        email: "user@example.com",
        externalUserId: "user-1",
        phone: "+5511999999999",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.generateSdkAccessToken).toHaveBeenCalledWith({
      externalUserId: "user-1",
      levelName: "pods-kyc-level",
      ttlInSecs: 600,
    });
    expect(mocks.storeDemoKycSessionMetadata).toHaveBeenCalledWith({
      email: "user@example.com",
      externalUserId: "user-1",
      phone: "+5511999999999",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
    expect(payload).toMatchObject({
      data: {
        accessToken: "sdk-access-token",
        externalUserId: "user-1",
        status: "sdk_token_issued",
      },
      success: true,
    });
  });
});
