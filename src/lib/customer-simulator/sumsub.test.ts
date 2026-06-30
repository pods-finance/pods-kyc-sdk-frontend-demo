import { describe, expect, it, vi } from "vitest";
import { buildSumsubSignature, SumsubClient } from "./sumsub";

describe("buildSumsubSignature", () => {
  it("signs Sumsub requests using timestamp, method, path, and body", () => {
    expect(
      buildSumsubSignature({
        body: '{"hello":"world"}',
        method: "POST",
        path: "/resources/accessTokens/shareToken",
        secretKey: "secret",
        timestamp: "1710000000",
      }),
    ).toBe("7a2f71b08d918b86bfc9c77378ee86cef7ce03b331e84b4e138fcd946d332b90");
  });
});

describe("SumsubClient", () => {
  it("generates share tokens through the reusable KYC endpoint", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ forClientId: "avenia-client", token: "share-token" }),
      );
    });
    const client = new SumsubClient({
      appToken: "app-token",
      baseUrl: "https://api.sumsub.com",
      fetchImpl,
      now: () => 1710000000000,
      secretKey: "secret",
    });

    await expect(
      client.generateShareToken({
        applicantId: "applicant-1",
        forClientId: "avenia-client",
        ttlInSecs: 600,
      }),
    ).resolves.toEqual({ forClientId: "avenia-client", token: "share-token" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.sumsub.com/resources/accessTokens/shareToken",
      expect.objectContaining({
        body: JSON.stringify({
          applicantId: "applicant-1",
          forClientId: "avenia-client",
          ttlInSecs: 600,
        }),
        method: "POST",
      }),
    );
  });
});
