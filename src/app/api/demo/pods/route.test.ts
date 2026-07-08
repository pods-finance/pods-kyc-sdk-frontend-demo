import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const fetchMock = vi.fn();

vi.mock("@/lib/customer-simulator/env", () => ({
  getCustomerSimulatorEnv: () => ({
    podsApiBaseUrl: "https://pods-api.example",
    podsApiKey: "pods-demo-key",
  }),
}));

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/demo/pods", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/demo/pods", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("proxies allowed Swap v2 bytecode requests with the configured API key", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        body: {
          destinationAddress: "0x0000000000000000000000000000000000000001",
          originAddress: "0x0000000000000000000000000000000000000001",
          quoteId: "quote-1",
        },
        method: "POST",
        path: "/v2/swap/bytecode",
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/v2/swap/bytecode",
      expect.objectContaining({
        body: JSON.stringify({
          destinationAddress: "0x0000000000000000000000000000000000000001",
          originAddress: "0x0000000000000000000000000000000000000001",
          quoteId: "quote-1",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "POST",
      }),
    );
  });

  it("proxies dynamic Swap v2 status routes", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "pending" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/v2/swap/status/quote-1",
      }),
    );

    await expect(response.json()).resolves.toEqual({ status: "pending" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/v2/swap/status/quote-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "GET",
      }),
    );
  });

  it("proxies the Swap v2 quote route and preserves query params", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ quote: { quoteId: "quote-1" } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/v2/swap/quote?originChain=fiat&destinationChain=base&tokenIn=BRL&tokenOut=0xToken&amountIn=1000&destinationAddress=0xWallet",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      quote: { quoteId: "quote-1" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/v2/swap/quote?originChain=fiat&destinationChain=base&tokenIn=BRL&tokenOut=0xToken&amountIn=1000&destinationAddress=0xWallet",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "GET",
      }),
    );
  });

  it("proxies fiat destination Swap v2 quote routes", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ quote: { quoteId: "quote-2" } }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/v2/swap/quote?originChain=base&destinationChain=fiat&tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=BRL&amountIn=1000000&originAddress=0xWallet",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      quote: { quoteId: "quote-2" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/v2/swap/quote?originChain=base&destinationChain=fiat&tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=BRL&amountIn=1000000&originAddress=0xWallet",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "GET",
      }),
    );
  });

  it("proxies the BigDataCorp session route", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          iframeUrl: "https://iframe.example/session",
          kycUserId: "8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );

    const response = await POST(
      jsonRequest({
        body: {
          cpf: "47567512882",
          email: "bruno@pods.finance",
          walletAddress: "0x0000000000000000000000000000000000000001",
        },
        method: "POST",
        path: "/api/v1/kyc/bigdatacorp/sessions",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      iframeUrl: "https://iframe.example/session",
      kycUserId: "8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/api/v1/kyc/bigdatacorp/sessions",
      expect.objectContaining({
        body: JSON.stringify({
          cpf: "47567512882",
          email: "bruno@pods.finance",
          walletAddress: "0x0000000000000000000000000000000000000001",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "POST",
      }),
    );
  });

  it("proxies BigDataCorp KYC status lookups", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "created" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/api/v1/kyc/status?kycUserId=8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
      }),
    );

    await expect(response.json()).resolves.toEqual({ status: "created" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/api/v1/kyc/status?kycUserId=8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "GET",
      }),
    );
  });

  it("proxies the BigDataCorp submit route", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "provider_pending" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(
      jsonRequest({
        body: {
          address: {
            city: "Campinas",
            country: "BRA",
            number: "42",
            state: "SP",
            streetAddress: "Rua Teste",
            zipCode: "13000000",
          },
          kycUserId: "8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
        },
        method: "POST",
        path: "/api/v1/kyc/bigdatacorp/submit",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      status: "provider_pending",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pods-api.example/api/v1/kyc/bigdatacorp/submit",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer pods-demo-key",
          "x-api-key": "pods-demo-key",
        }),
        method: "POST",
      }),
    );
  });

  it("rejects unsupported Swap v2 routes", async () => {
    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/v2/swap/history",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "customer_simulator_error",
        message: "Unsupported proxy route",
      },
      success: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported proxy routes", async () => {
    const response = await POST(
      jsonRequest({
        method: "GET",
        path: "/api/v1/admin/customers",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: {
        code: "customer_simulator_error",
        message: "Unsupported proxy route",
      },
      success: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
