import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_ENDPOINTS } from "../domain/status";
import { apiRequest } from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("apiRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes BigDataCorp session creation through the Pods demo proxy", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ kycUserId: "kyc_123" }));

    await apiRequest(DEMO_ENDPOINTS.bigDataCorpSessions, {
      body: {
        cpf: "CPF_FROM_USER",
        email: "user@example.com",
        walletAddress: "0x0000000000000000000000000000000000000001",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      DEMO_ENDPOINTS.demoPodsProxy,
      expect.objectContaining({
        body: JSON.stringify({
          body: {
            cpf: "CPF_FROM_USER",
            email: "user@example.com",
            walletAddress: "0x0000000000000000000000000000000000000001",
          },
          method: "POST",
          path: DEMO_ENDPOINTS.bigDataCorpSessions,
        }),
        method: "POST",
      }),
    );
  });

  it("routes canonical KYC status polling through the Pods demo proxy", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ status: "created" }));
    const statusPath = `${DEMO_ENDPOINTS.status}?kycUserId=kyc_123`;

    await apiRequest(statusPath, { method: "GET" });

    expect(fetchMock).toHaveBeenCalledWith(
      DEMO_ENDPOINTS.demoPodsProxy,
      expect.objectContaining({
        body: JSON.stringify({
          method: "GET",
          path: statusPath,
        }),
        method: "POST",
      }),
    );
  });

  it("routes BigDataCorp final submit through the Pods demo proxy", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ status: "provider_pending" }));

    await apiRequest(DEMO_ENDPOINTS.bigDataCorpSubmit, {
      body: {
        address: {
          city: "Sao Paulo",
          country: "BRA",
          number: "100",
          state: "SP",
          streetAddress: "Avenida Example",
          zipCode: "01001000",
        },
        kycUserId: "kyc_123",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      DEMO_ENDPOINTS.demoPodsProxy,
      expect.objectContaining({
        body: JSON.stringify({
          body: {
            address: {
              city: "Sao Paulo",
              country: "BRA",
              number: "100",
              state: "SP",
              streetAddress: "Avenida Example",
              zipCode: "01001000",
            },
            kycUserId: "kyc_123",
          },
          method: "POST",
          path: DEMO_ENDPOINTS.bigDataCorpSubmit,
        }),
        method: "POST",
      }),
    );
  });
});
