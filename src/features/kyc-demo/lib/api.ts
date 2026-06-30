import {
  DEMO_ENDPOINTS,
  buildApiUrl,
  getResponseMessage,
} from "../domain/status";
import type { ApiRequestOptions } from "../types";

function shouldUsePodsProxy(path: string, apiKey?: string): boolean {
  if (apiKey) {
    return false;
  }

  return path.startsWith("/api/v1/") || path.startsWith("/v2/");
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

export async function apiRequest(path: string, options: ApiRequestOptions) {
  const method = options.method ?? "POST";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (shouldUsePodsProxy(path, options.apiKey)) {
    const response = await fetch(DEMO_ENDPOINTS.demoPodsProxy, {
      body: JSON.stringify({
        body: options.body,
        method,
        path,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const fallback = `POST ${DEMO_ENDPOINTS.demoPodsProxy} failed with ${response.status}`;
      throw new Error(getResponseMessage(payload, fallback));
    }

    return payload;
  }

  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
    headers["x-api-key"] = options.apiKey;
  }

  if (options.sessionToken) {
    headers.Authorization = `Bearer ${options.sessionToken}`;
    headers["x-customer-session"] = options.sessionToken;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const requestUrl = buildApiUrl(path);
  const response = await fetch(requestUrl, fetchOptions);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const fallback = `${method} ${requestUrl} failed with ${response.status}`;
    throw new Error(getResponseMessage(payload, fallback));
  }

  return payload;
}
