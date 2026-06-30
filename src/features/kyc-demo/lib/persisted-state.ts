import { demoStateStorageKey } from "../constants";
import type { DemoStatusLookup, PersistedDemoState } from "../types";
import { isVerificationStatus } from "../domain/session";
import { isRecord } from "./records";

export function readPersistedDemoState(): PersistedDemoState | null {
  try {
    const raw = window.localStorage.getItem(demoStateStorageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    const nextState: PersistedDemoState = {};

    if (typeof parsed.email === "string") {
      nextState.email = parsed.email;
    }

    if (typeof parsed.externalUserId === "string") {
      nextState.externalUserId = parsed.externalUserId;
    }

    if (typeof parsed.kycUserId === "string") {
      nextState.kycUserId = parsed.kycUserId;
    }

    if (typeof parsed.lastCheckedAt === "string") {
      nextState.lastCheckedAt = parsed.lastCheckedAt;
    }

    if (isVerificationStatus(parsed.verificationStatus)) {
      nextState.verificationStatus = parsed.verificationStatus;
    }

    if (typeof parsed.walletAddress === "string") {
      nextState.walletAddress = parsed.walletAddress;
    }

    return nextState;
  } catch {
    return null;
  }
}

export function writePersistedDemoState(state: PersistedDemoState) {
  try {
    const hasIdentity = Boolean(
      state.email || state.walletAddress || state.externalUserId,
    );
    const hasKycState = Boolean(
      state.kycUserId ||
        (state.verificationStatus && state.verificationStatus !== "not_started"),
    );

    if (!hasIdentity && !hasKycState) {
      window.localStorage.removeItem(demoStateStorageKey);
      return;
    }

    window.localStorage.setItem(demoStateStorageKey, JSON.stringify(state));
  } catch {
    // Demo-only persistence should never block the live flow.
  }
}

export function identitiesMatch(
  state: PersistedDemoState | null,
  email: string,
  walletAddress: string,
): state is PersistedDemoState {
  return Boolean(
    state?.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      state.walletAddress?.trim().toLowerCase() ===
        walletAddress.trim().toLowerCase(),
  );
}

export function getPersistedStatusLookup(
  state: PersistedDemoState | null,
): DemoStatusLookup | null {
  if (!state) {
    return null;
  }

  if (state.kycUserId) {
    return { kycUserId: state.kycUserId };
  }

  if (state.email && state.walletAddress) {
    return {
      email: state.email,
      walletAddress: state.walletAddress,
    };
  }

  if (state.externalUserId) {
    return { externalUserId: state.externalUserId };
  }

  return null;
}
