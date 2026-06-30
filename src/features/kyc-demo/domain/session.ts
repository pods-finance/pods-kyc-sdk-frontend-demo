import type { StatusTone, VerificationStatus } from "./status";
import type { DemoRuntimeEnvironment, SumsubEnvironment } from "../types";
import { firstStringAtPath, isRecord } from "../lib/records";

const verificationStatusValues = new Set<VerificationStatus>([
  "approved",
  "error",
  "in_review",
  "not_started",
  "pending",
  "rejected",
]);

export function isVerificationStatus(value: unknown): value is VerificationStatus {
  return (
    typeof value === "string" &&
    verificationStatusValues.has(value as VerificationStatus)
  );
}

export function extractAccessToken(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["accessToken"],
    ["sdkToken"],
    ["token"],
    ["data", "accessToken"],
    ["data", "sdkToken"],
    ["data", "token"],
    ["session", "accessToken"],
    ["session", "sdkToken"],
    ["session", "token"],
    ["kycSession", "accessToken"],
  ]);
}

export function extractApplicantId(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["applicantId"],
    ["data", "applicantId"],
    ["session", "applicantId"],
    ["kycSession", "applicantId"],
  ]);
}

export function extractSessionId(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["sessionId"],
    ["id"],
    ["data", "sessionId"],
    ["data", "id"],
    ["session", "id"],
    ["kycSession", "id"],
  ]);
}

export function extractDemoRuntimeEnvironment(
  value: unknown,
): DemoRuntimeEnvironment | null {
  const candidate = isRecord(value) && isRecord(value.data) ? value.data : value;

  if (!isRecord(candidate)) {
    return null;
  }

  const sumsubEnvironment = candidate.sumsubEnvironment;

  if (sumsubEnvironment !== "production" && sumsubEnvironment !== "sandbox") {
    return null;
  }

  return {
    podsApiBaseUrl:
      typeof candidate.podsApiBaseUrl === "string"
        ? candidate.podsApiBaseUrl
        : "",
    sumsubApiBaseUrl:
      typeof candidate.sumsubApiBaseUrl === "string"
        ? candidate.sumsubApiBaseUrl
        : "",
    sumsubAppTokenPrefix:
      typeof candidate.sumsubAppTokenPrefix === "string"
        ? candidate.sumsubAppTokenPrefix
        : "",
    sumsubEnvironment,
    sumsubLevelName:
      typeof candidate.sumsubLevelName === "string"
        ? candidate.sumsubLevelName
        : "",
    sumsubWebhookSecretCount:
      typeof candidate.sumsubWebhookSecretCount === "number"
        ? candidate.sumsubWebhookSecretCount
        : 0,
  };
}

export function getSumsubEnvironmentTone(
  environment: SumsubEnvironment | undefined,
): StatusTone {
  if (environment === "sandbox") {
    return "warning";
  }

  if (environment === "production") {
    return "success";
  }

  return "neutral";
}

export function formatSumsubEnvironment(value: string | null | undefined): string {
  if (value === "sandbox") {
    return "Sandbox";
  }

  if (value === "production") {
    return "Production";
  }

  return "Unknown";
}
