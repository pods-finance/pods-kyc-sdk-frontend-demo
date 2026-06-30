import { describe, expect, it } from "vitest";
import {
  getDemoKycSessionMetadata,
  storeDemoKycSessionMetadata,
} from "./session-store";

describe("demo KYC session metadata store", () => {
  it("stores metadata needed after the async Sumsub webhook", () => {
    storeDemoKycSessionMetadata({
      email: " user@example.com ",
      externalUserId: "app-user-001",
      phone: " +5511999999999 ",
      walletAddress: " 0x0000000000000000000000000000000000000001 ",
    });

    expect(getDemoKycSessionMetadata("app-user-001")).toMatchObject({
      email: "user@example.com",
      externalUserId: "app-user-001",
      phone: "+5511999999999",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
  });

  it("keeps existing metadata when later refreshes omit optional fields", () => {
    storeDemoKycSessionMetadata({
      email: "refresh@example.com",
      externalUserId: "app-user-refresh",
      walletAddress: "0x0000000000000000000000000000000000000002",
    });
    storeDemoKycSessionMetadata({
      externalUserId: "app-user-refresh",
    });

    expect(getDemoKycSessionMetadata("app-user-refresh")).toMatchObject({
      email: "refresh@example.com",
      walletAddress: "0x0000000000000000000000000000000000000002",
    });
  });
});
