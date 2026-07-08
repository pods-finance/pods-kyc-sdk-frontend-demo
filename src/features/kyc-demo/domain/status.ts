export type VerificationStatus =
  | "not_started"
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "error";

export type StatusTone = "neutral" | "warning" | "success" | "danger";

export const CUSTOMER_API_KEY_HEADER = "x-api-key";

export const DEMO_ENDPOINTS = {
  demoEnvironment: "/api/demo/environment",
  demoKycSession: "/api/demo/kyc-session",
  demoPodsProxy: "/api/demo/pods",
  demoStatus: "/api/demo/kyc-status",
  bigDataCorpSessions: "/api/v1/kyc/bigdatacorp/sessions",
  bigDataCorpSubmit: "/api/v1/kyc/bigdatacorp/submit",
  kycSessions: "/api/v1/kyc/sessions",
  status: "/api/v1/kyc/status",
  swapQuote: "/v2/swap/quote",
  swapBytecode: "/v2/swap/bytecode",
  swapStatus: "/v2/swap/status",
} as const;

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/api/demo/") || path.startsWith("/api/customer-webhooks/")) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}

const STATUS_PATHS = [
  ["status"],
  ["kycStatus"],
  ["verificationStatus"],
  ["reviewStatus"],
  ["reviewAnswer"],
  ["review", "reviewStatus"],
  ["review", "reviewResult", "reviewAnswer"],
  ["reviewResult", "reviewAnswer"],
  ["sumsub", "reviewAnswer"],
  ["avenia", "status"],
  ["data", "status"],
  ["data", "kycStatus"],
  ["data", "reviewStatus"],
  ["data", "reviewAnswer"],
  ["data", "reviewResult", "reviewAnswer"],
  ["user", "status"],
  ["user", "kycStatus"],
] as const;

const APPROVED_VALUES = new Set([
  "approved",
  "green",
  "verified",
  "accepted",
  "avenia_approved",
  "kyc_approved",
]);

const REJECTED_VALUES = new Set([
  "red",
  "rejected",
  "declined",
  "failed",
  "blocked",
  "final_rejected",
]);

const REVIEW_VALUES = new Set([
  "applicant_created",
  "in_review",
  "inreview",
  "on_hold",
  "onhold",
  "prechecked",
  "queued",
  "review",
  "review_pending",
  "reviewing",
  "pending_review",
  "sdk_token_issued",
  "yellow",
  "init",
]);

const ERROR_VALUES = new Set(["error", "errored", "invalid", "expired"]);
const NOT_STARTED_VALUES = new Set(["not_started", "none"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[segment];
  }

  return current;
}

function collectStatusCandidates(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  const candidates: string[] = [];

  for (const path of STATUS_PATHS) {
    const candidate = readPath(value, path);

    if (typeof candidate === "string") {
      candidates.push(candidate);
    }
  }

  return candidates;
}

export function normalizeVerificationStatus(value: unknown): VerificationStatus {
  const candidates = collectStatusCandidates(value).map(normalizeToken);

  if (candidates.some((candidate) => REJECTED_VALUES.has(candidate))) {
    return "rejected";
  }

  if (candidates.some((candidate) => APPROVED_VALUES.has(candidate))) {
    return "approved";
  }

  if (candidates.some((candidate) => ERROR_VALUES.has(candidate))) {
    return "error";
  }

  if (candidates.some((candidate) => REVIEW_VALUES.has(candidate))) {
    return "in_review";
  }

  if (candidates.some((candidate) => !NOT_STARTED_VALUES.has(candidate))) {
    return "pending";
  }

  return "not_started";
}

export function canUseMoneyMovement(status: VerificationStatus): boolean {
  return status === "approved";
}

export function getStatusTone(status: VerificationStatus): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
    case "error":
      return "danger";
    case "pending":
    case "in_review":
      return "warning";
    case "not_started":
      return "neutral";
  }
}

export function getStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "error":
      return "Error";
    case "pending":
      return "Pending";
    case "in_review":
      return "In review";
    case "not_started":
      return "Not started";
  }
}

export function getStatusDetail(status: VerificationStatus): string {
  switch (status) {
    case "approved":
      return "Onramp and offramp actions are enabled.";
    case "rejected":
      return "Money movement is blocked for this user.";
    case "error":
      return "The latest status check returned an error.";
    case "pending":
      return "Waiting for Sumsub or Avenia to finish processing.";
    case "in_review":
      return "The applicant is being reviewed.";
    case "not_started":
      return "Create a user and session to start verification.";
  }
}

type KycStatusLookup = string | {
  externalUserId?: string;
  email?: string;
  kycUserId?: string;
  walletAddress?: string;
};

function buildKycStatusParams(input: KycStatusLookup): URLSearchParams {
  const params = new URLSearchParams();

  if (typeof input === "string") {
    params.set("externalUserId", input.trim());
    return params;
  }

  if (input.kycUserId?.trim()) {
    params.set("kycUserId", input.kycUserId.trim());
  } else if (input.externalUserId?.trim()) {
    params.set("externalUserId", input.externalUserId.trim());
  } else if (input.email?.trim() && input.walletAddress?.trim()) {
    params.set("email", input.email.trim());
    params.set("walletAddress", input.walletAddress.trim());
  }

  return params;
}

export function getStatusEndpoint(input: KycStatusLookup): string {
  const params = buildKycStatusParams(input);
  return `${DEMO_ENDPOINTS.status}?${params.toString()}`;
}

export function getDemoStatusEndpoint(input: KycStatusLookup): string {
  const params = buildKycStatusParams(input);
  return `${DEMO_ENDPOINTS.demoStatus}?${params.toString()}`;
}

export function getSwapStatusEndpoint(quoteId: string): string {
  return `${DEMO_ENDPOINTS.swapStatus}/${encodeURIComponent(quoteId)}`;
}

export function formatTransferAmountIn(
  value: string,
  kind: "onramp" | "offramp",
): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (kind === "offramp") {
    return decimalToMinorUnits(trimmed, 6);
  }

  return decimalToMinorUnits(trimmed, 2);
}

function decimalToMinorUnits(value: string, decimals: number): string | null {
  const normalized = value.replace(",", ".");

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");

  if (fraction.length > decimals) {
    return null;
  }

  const raw = `${whole}${fraction.padEnd(decimals, "0")}`;
  const normalizedRaw = raw.replace(/^0+(?=\d)/, "");

  if (BigInt(normalizedRaw) <= BigInt(0)) {
    return null;
  }

  return normalizedRaw;
}

export function getResponseMessage(value: unknown, fallback: string): string {
  const errorCode = readStringPath(value, ["error", "code"]);
  const upstreamStatus = readPath(value, ["error", "details", "upstreamStatus"]);
  const upstreamDescription = readStringPath(value, [
    "error",
    "details",
    "description",
  ]);

  if (errorCode === "sumsub_upstream_error") {
    if (
      upstreamStatus === 401 &&
      upstreamDescription?.toLowerCase().includes("signature")
    ) {
      return "Sumsub API credentials are invalid. Check that SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY are from the same Sumsub app token pair, then restart the backend.";
    }

    if (upstreamDescription) {
      return `Sumsub API error: ${upstreamDescription}`;
    }
  }

  const message = firstStringAtPath(value, [
    ["message"],
    ["error"],
    ["error", "message"],
    ["data", "message"],
  ]);

  return message ?? fallback;
}

function readStringPath(value: unknown, path: readonly string[]): string | null {
  const candidate = readPath(value, path);

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }

  return null;
}

function firstStringAtPath(
  value: unknown,
  paths: readonly (readonly string[])[],
): string | null {
  for (const path of paths) {
    const candidate = readStringPath(value, path);

    if (candidate) {
      return candidate;
    }
  }

  return null;
}
