import { describe, expect, it } from "vitest";
import {
  buildKycSessionRequestBody,
  createSessionExternalUserId,
  getInitialSetupForm,
  hasRecoverableCustomerSession,
  readExternalUserId,
  readKycUserId,
} from "./kyc-flow";

describe("KYC flow helpers", () => {
  it("reads KYC ids from wrapped and flat responses", () => {
    expect(readKycUserId({ data: { kycUserId: "kyc-1" } })).toBe("kyc-1");
    expect(readKycUserId({ kycUserId: "kyc-2" })).toBe("kyc-2");
    expect(readKycUserId({ data: {} })).toBeNull();
  });

  it("reads external user id with a fallback", () => {
    expect(
      readExternalUserId(
        {
          data: {
            externalUserId: "app-user-001",
          },
        },
        "fallback-user",
      ),
    ).toBe("app-user-001");
    expect(readExternalUserId({}, "fallback-user")).toBe("fallback-user");
  });

  it("hydrates the setup form from persisted state", () => {
    expect(
      getInitialSetupForm({
        email: "user@example.com",
        externalUserId: "user-1",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    ).toMatchObject({
      email: "user@example.com",
      externalUserId: "user-1",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
  });

  it("detects whether local state can recover a customer session", () => {
    expect(hasRecoverableCustomerSession(null)).toBe(false);
    expect(
      hasRecoverableCustomerSession({ verificationStatus: "not_started" }),
    ).toBe(false);
    expect(hasRecoverableCustomerSession({ kycUserId: "kyc-1" })).toBe(true);
    expect(
      hasRecoverableCustomerSession({ verificationStatus: "approved" }),
    ).toBe(true);
  });

  it("reuses a provided external user id unless a new applicant is requested", () => {
    expect(
      createSessionExternalUserId({
        externalUserId: " app-user-001 ",
        forceNewApplicant: false,
        nowMs: 123,
      }),
    ).toBe("app-user-001");
    expect(
      createSessionExternalUserId({
        externalUserId: "app-user-001",
        forceNewApplicant: true,
        nowMs: 123,
      }),
    ).toBe("demo-user-123");
  });

  it("builds the KYC session request without empty metadata", () => {
    expect(
      buildKycSessionRequestBody({
        email: "user@example.com",
        externalUserId: "app-user-001",
        ttlInSecs: 600,
        walletAddress: "",
      }),
    ).toEqual({
      email: "user@example.com",
      externalUserId: "app-user-001",
      ttlInSecs: 600,
    });
  });
});
