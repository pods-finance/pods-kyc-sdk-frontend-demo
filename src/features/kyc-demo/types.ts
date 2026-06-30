import type { VerificationStatus } from "./domain/status";

export type RequestPhase = "idle" | "loading" | "success" | "error";
export type TransferKind = "onramp" | "offramp";
export type TransferAction = "execute" | "refresh";
export type SumsubEnvironment = "production" | "sandbox";

export type SetupForm = {
  email: string;
  externalUserId: string;
  walletAddress: string;
};

export type KycSession = {
  accessToken: string;
  applicantId: string | null;
  sessionId: string | null;
  sumsubEnvironment: string | null;
  sumsubLevelName: string | null;
  createdAt: string;
};

export type SdkEvent = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
};

export type TransferForm = {
  amountBrl: string;
  pixKey: string;
};

export type TransferResult = {
  status: "success" | "error";
  message: string;
  payload?: unknown;
};

export type ApiRequestOptions = {
  apiKey?: string;
  body?: Record<string, unknown>;
  method?: "GET" | "POST";
  sessionToken?: string;
};

export type DemoRuntimeEnvironment = {
  podsApiBaseUrl: string;
  sumsubApiBaseUrl: string;
  sumsubAppTokenPrefix: string;
  sumsubEnvironment: SumsubEnvironment;
  sumsubLevelName: string;
  sumsubWebhookSecretCount: number;
};

export type PersistedDemoState = {
  email?: string;
  externalUserId?: string;
  kycUserId?: string;
  lastCheckedAt?: string;
  verificationStatus?: VerificationStatus;
  walletAddress?: string;
};

export type DemoStatusLookup = {
  email?: string;
  externalUserId?: string;
  kycUserId?: string;
  walletAddress?: string;
};
