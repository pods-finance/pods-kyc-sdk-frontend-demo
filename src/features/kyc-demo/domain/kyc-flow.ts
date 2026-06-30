import { initialSetupForm } from "../constants";
import { buildBody, firstStringAtPath } from "../lib/records";
import type { PersistedDemoState, SetupForm } from "../types";

export function readKycUserId(payload: unknown): string | null {
  return firstStringAtPath(payload, [
    ["data", "kycUserId"],
    ["kycUserId"],
  ]);
}

export function readExternalUserId(
  payload: unknown,
  fallback: string,
): string {
  return (
    firstStringAtPath(payload, [
      ["data", "externalUserId"],
      ["externalUserId"],
    ]) ?? fallback
  );
}

export function getInitialSetupForm(
  persisted: PersistedDemoState | null,
): SetupForm {
  return {
    ...initialSetupForm,
    email: persisted?.email ?? initialSetupForm.email,
    externalUserId:
      persisted?.externalUserId ?? initialSetupForm.externalUserId,
    walletAddress: persisted?.walletAddress ?? initialSetupForm.walletAddress,
  };
}

export function hasRecoverableCustomerSession(
  persisted: PersistedDemoState | null,
): boolean {
  if (!persisted) {
    return false;
  }

  if (persisted.kycUserId) {
    return true;
  }

  return Boolean(
    persisted.verificationStatus &&
      persisted.verificationStatus !== "not_started",
  );
}

export function createSessionExternalUserId({
  externalUserId,
  forceNewApplicant,
  nowMs,
}: {
  externalUserId: string;
  forceNewApplicant: boolean;
  nowMs: number;
}): string {
  const currentExternalUserId = externalUserId.trim();

  if (forceNewApplicant || !currentExternalUserId) {
    return `demo-user-${nowMs}`;
  }

  return currentExternalUserId;
}

export function buildKycSessionRequestBody({
  email,
  externalUserId,
  ttlInSecs,
  walletAddress,
}: {
  email: string;
  externalUserId: string;
  ttlInSecs: number;
  walletAddress: string;
}): Record<string, unknown> {
  return {
    ...buildBody({
      email,
      externalUserId,
      walletAddress,
    }),
    ttlInSecs,
  };
}
