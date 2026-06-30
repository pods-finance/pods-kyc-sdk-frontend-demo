export class PodsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly responseBody: string,
  ) {
    super(`Pods API request failed with status ${status} at ${path}`);
    this.name = "PodsApiError";
  }
}

type PodsClientOptions = {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

type ImportShareTokenInput = {
  email: string;
  shareToken: string;
  sumsubApplicantId: string;
  walletAddress: string;
};

export class PodsKycClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PodsClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getKycStatus(
    input: string | {
      email?: string;
      externalUserId?: string;
      kycUserId?: string;
      walletAddress?: string;
    },
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (typeof input === "string") {
      params.set("externalUserId", input);
    } else {
      if (input.kycUserId) {
        params.set("kycUserId", input.kycUserId);
      } else if (input.externalUserId) {
        params.set("externalUserId", input.externalUserId);
      } else if (input.email && input.walletAddress) {
        params.set("email", input.email);
        params.set("walletAddress", input.walletAddress);
      }
    }
    return this.request(
      `/api/v1/kyc/status?${params.toString()}`,
      "GET",
    );
  }

  async importSumsubShareToken(input: ImportShareTokenInput): Promise<unknown> {
    return this.request("/api/v1/kyc/sumsub-share-token", "POST", input);
  }

  private async request(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "x-api-key": this.apiKey,
    };
    const init: RequestInit = { headers, method };

    if (body) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    const responseBody = await response.text();

    if (!response.ok) {
      throw new PodsApiError(response.status, path, responseBody);
    }

    if (responseBody.trim().length === 0) {
      return null;
    }

    return JSON.parse(responseBody) as unknown;
  }
}
