import { getCustomerSimulatorEnv } from "@/lib/customer-simulator/env";

export const runtime = "nodejs";

type ProxyRequestBody = {
  body?: unknown;
  method?: unknown;
  path?: unknown;
};

const swapStatusPattern = /^\/v2\/swap\/status\/[^/]+$/;

function readProxyMethod(value: unknown): "GET" | "POST" {
  const method = typeof value === "string" ? value.toUpperCase() : "POST";

  if (method === "GET" || method === "POST") {
    return method;
  }

  throw new Error("Unsupported proxy method");
}

function readProxyPath(value: unknown): URL {
  if (
    typeof value !== "string" ||
    (!value.startsWith("/api/v1/") && !value.startsWith("/v2/"))
  ) {
    throw new Error("Unsupported proxy path");
  }

  return new URL(value, "http://pods-kyc-demo.local");
}

function isAllowedRoute(method: string, path: string): boolean {
  if (method === "GET" && path === "/v2/swap/quote") {
    return true;
  }

  if (method === "POST" && path === "/v2/swap/bytecode") {
    return true;
  }

  return method === "GET" && swapStatusPattern.test(path);
}

function assertAllowedRoute(method: string, path: string) {
  if (!isAllowedRoute(method, path)) {
    throw new Error("Unsupported proxy route");
  }
}

export async function POST(request: Request) {
  try {
    const env = getCustomerSimulatorEnv();
    const input = (await request.json()) as ProxyRequestBody;
    const method = readProxyMethod(input.method);
    const url = readProxyPath(input.path);

    assertAllowedRoute(method, url.pathname);

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${env.podsApiKey}`,
      "x-api-key": env.podsApiKey,
    };
    const init: RequestInit = {
      headers,
      method,
    };

    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(input.body ?? {});
    }

    const upstreamResponse = await fetch(
      `${env.podsApiBaseUrl}${url.pathname}${url.search}`,
      init,
    );
    const responseBody = await upstreamResponse.text();
    const contentType =
      upstreamResponse.headers.get("content-type") ?? "application/json";

    return new Response(responseBody, {
      headers: { "content-type": contentType },
      status: upstreamResponse.status,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: "customer_simulator_error",
          message:
            error instanceof Error ? error.message : "Unexpected failure",
        },
      },
      { status: 400 },
    );
  }
}
