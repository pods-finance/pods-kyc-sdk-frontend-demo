import crypto from "node:crypto";

export class SumsubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly responseBody: string,
  ) {
    super(`Sumsub API request failed with status ${status} at ${path}`);
    this.name = "SumsubApiError";
  }
}

type SumsubClientOptions = {
  appToken: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  secretKey: string;
};

type GenerateSdkAccessTokenInput = {
  externalUserId: string;
  levelName: string;
  ttlInSecs: number;
};

type GenerateSdkAccessTokenResponse = {
  token: string;
  userId: string;
};

type GenerateShareTokenInput = {
  applicantId: string;
  forClientId: string;
  ttlInSecs: number;
};

type GenerateShareTokenResponse = {
  token: string;
  forClientId: string;
};

export function buildSumsubSignature({
  body,
  method,
  path,
  secretKey,
  timestamp,
}: {
  body: string;
  method: string;
  path: string;
  secretKey: string;
  timestamp: string;
}): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(`${timestamp}${method.toUpperCase()}${path}${body}`)
    .digest("hex");
}

export class SumsubClient {
  private readonly appToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly secretKey: string;

  constructor(options: SumsubClientOptions) {
    this.appToken = options.appToken;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.secretKey = options.secretKey;
  }

  async generateSdkAccessToken(
    input: GenerateSdkAccessTokenInput,
  ): Promise<GenerateSdkAccessTokenResponse> {
    return this.request<GenerateSdkAccessTokenResponse>(
      "/resources/accessTokens/sdk",
      {
        levelName: input.levelName,
        ttlInSecs: input.ttlInSecs,
        userId: input.externalUserId,
      },
    );
  }

  async generateShareToken(
    input: GenerateShareTokenInput,
  ): Promise<GenerateShareTokenResponse> {
    return this.request<GenerateShareTokenResponse>(
      "/resources/accessTokens/shareToken",
      {
        applicantId: input.applicantId,
        forClientId: input.forClientId,
        ttlInSecs: input.ttlInSecs,
      },
    );
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const method = "POST";
    const bodyText = JSON.stringify(body);
    const timestamp = Math.floor(this.now() / 1000).toString();
    const signature = buildSumsubSignature({
      body: bodyText,
      method,
      path,
      secretKey: this.secretKey,
      timestamp,
    });

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      body: bodyText,
      headers: {
        "Content-Type": "application/json",
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": timestamp,
        "X-App-Token": this.appToken,
      },
      method,
    });
    const responseBody = await response.text();

    if (!response.ok) {
      throw new SumsubApiError(response.status, path, responseBody);
    }

    return JSON.parse(responseBody) as T;
  }
}
