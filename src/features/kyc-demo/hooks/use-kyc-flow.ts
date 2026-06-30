"use client";

import { useCallback, useEffect, useState } from "react";
import { initialSetupForm, pollIntervalMs } from "../constants";
import {
  extractAccessToken,
  extractApplicantId,
  extractDemoRuntimeEnvironment,
  extractSessionId,
  formatSumsubEnvironment,
} from "../domain/session";
import {
  DEMO_ENDPOINTS,
  type VerificationStatus,
  getDemoStatusEndpoint,
  getResponseMessage,
  getStatusDetail,
  getStatusLabel,
  getStatusTone,
  normalizeVerificationStatus,
} from "../domain/status";
import { apiRequest } from "../lib/api";
import {
  formatTimestamp,
  getErrorMessage,
  makeEventId,
} from "../lib/format";
import {
  getPersistedStatusLookup,
  identitiesMatch,
  readPersistedDemoState,
  writePersistedDemoState,
} from "../lib/persisted-state";
import { buildBody, firstStringAtPath, trimOrNull } from "../lib/records";
import type {
  DemoRuntimeEnvironment,
  KycSession,
  PersistedDemoState,
  RequestPhase,
  SdkEvent,
  SetupForm,
} from "../types";

function readKycUserId(payload: unknown): string | null {
  return firstStringAtPath(payload, [
    ["data", "kycUserId"],
    ["kycUserId"],
  ]);
}

function readExternalUserId(
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

function readInitialPersistedState(): PersistedDemoState | null {
  if (typeof window === "undefined") {
    return null;
  }

  return readPersistedDemoState();
}

function getInitialSetupForm(
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

function hasCustomerSessionFromState(
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

export function useKycFlow() {
  const [initialPersistedState] = useState(readInitialPersistedState);
  const [setupForm, setSetupForm] = useState<SetupForm>(() =>
    getInitialSetupForm(initialPersistedState),
  );
  const [session, setSession] = useState<KycSession | null>(null);
  const [customerSessionToken, setCustomerSessionToken] = useState<
    string | null
  >(() => (hasCustomerSessionFromState(initialPersistedState) ? "demo" : null));
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(
      initialPersistedState?.verificationStatus ?? "not_started",
    );
  const [createPhase, setCreatePhase] = useState<RequestPhase>("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [lookupPhase, setLookupPhase] = useState<RequestPhase>("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [statusPhase, setStatusPhase] = useState<RequestPhase>("idle");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [runtimeEnvironment, setRuntimeEnvironment] =
    useState<DemoRuntimeEnvironment | null>(null);
  const [runtimeEnvironmentError, setRuntimeEnvironmentError] =
    useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(
    initialPersistedState?.lastCheckedAt ?? null,
  );
  const [isPollingEnabled, setIsPollingEnabled] = useState(false);
  const [sdkEvents, setSdkEvents] = useState<SdkEvent[]>([]);
  const [kycUserId, setKycUserId] = useState(
    initialPersistedState?.kycUserId ?? "",
  );

  const updateSetupField = useCallback(
    (field: keyof SetupForm) => (value: string) => {
      setSetupForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const externalUserId = setupForm.externalUserId.trim();
  const walletAddress = setupForm.walletAddress.trim();
  const hasCustomerSession = Boolean(customerSessionToken);
  const canPollStatus = kycUserId.length > 0 || externalUserId.length > 0;
  const statusTone = getStatusTone(verificationStatus);
  const statusLabel = getStatusLabel(verificationStatus);
  const statusDetail = getStatusDetail(verificationStatus);
  const statusEndpoint = getDemoStatusEndpoint({ externalUserId, kycUserId });
  const runtimeEnvironmentLabel = runtimeEnvironment
    ? `Sumsub ${formatSumsubEnvironment(runtimeEnvironment.sumsubEnvironment)}`
    : "Sumsub env";

  useEffect(() => {
    let isMounted = true;
    const persisted = initialPersistedState;

    async function refreshPersistedStatus() {
      if (!persisted) {
        return;
      }

      const lookup = getPersistedStatusLookup(persisted);

      if (!lookup) {
        return;
      }

      try {
        const payload = await apiRequest(getDemoStatusEndpoint(lookup), {
          method: "GET",
        });
        const nextKycUserId = readKycUserId(payload);

        if (!isMounted) {
          return;
        }

        if (nextKycUserId) {
          setKycUserId(nextKycUserId);
        }

        setVerificationStatus(normalizeVerificationStatus(payload));
        setLastCheckedAt(formatTimestamp(new Date()));
        setStatusPhase("success");
      } catch {
        // Keep the local demo state if the backend lookup is not available yet.
      }
    }

    void refreshPersistedStatus();

    return () => {
      isMounted = false;
    };
  }, [initialPersistedState]);

  useEffect(() => {
    writePersistedDemoState({
      email: trimOrNull(setupForm.email) ?? undefined,
      externalUserId: trimOrNull(setupForm.externalUserId) ?? undefined,
      kycUserId: trimOrNull(kycUserId) ?? undefined,
      lastCheckedAt: lastCheckedAt ?? undefined,
      verificationStatus,
      walletAddress: trimOrNull(setupForm.walletAddress) ?? undefined,
    });
  }, [
    kycUserId,
    lastCheckedAt,
    setupForm.email,
    setupForm.externalUserId,
    setupForm.walletAddress,
    verificationStatus,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeEnvironment() {
      try {
        const payload = await apiRequest(DEMO_ENDPOINTS.demoEnvironment, {
          method: "GET",
        });
        const nextRuntimeEnvironment = extractDemoRuntimeEnvironment(payload);

        if (!nextRuntimeEnvironment) {
          throw new Error("Demo environment response is invalid.");
        }

        if (isMounted) {
          setRuntimeEnvironment(nextRuntimeEnvironment);
          setRuntimeEnvironmentError(null);
        }
      } catch (error) {
        if (isMounted) {
          setRuntimeEnvironmentError(getErrorMessage(error));
        }
      }
    }

    void loadRuntimeEnvironment();

    return () => {
      isMounted = false;
    };
  }, []);

  const pushSdkEvent = useCallback((label: string, payload?: unknown) => {
    const nextStatus = normalizeVerificationStatus(payload);

    if (nextStatus !== "not_started") {
      setVerificationStatus(nextStatus);
    }

    setSdkEvents((current) => {
      const detail =
        nextStatus === "not_started" ? "Received" : getStatusLabel(nextStatus);
      const nextEvent: SdkEvent = {
        id: makeEventId(),
        label,
        detail,
        createdAt: formatTimestamp(new Date()),
      };

      return [nextEvent, ...current].slice(0, 6);
    });
  }, []);

  const requestKycSession = useCallback(
    async (forceNewApplicant = false) => {
      const nextExternalUserId =
        forceNewApplicant || !externalUserId
          ? `demo-user-${Date.now()}`
          : externalUserId;
      const sessionPayload: Record<string, unknown> = buildBody({
        email: setupForm.email,
        externalUserId: nextExternalUserId,
        walletAddress: setupForm.walletAddress,
      });
      sessionPayload.ttlInSecs = 600;

      const payload = await apiRequest(DEMO_ENDPOINTS.demoKycSession, {
        body: sessionPayload,
      });
      const accessToken = extractAccessToken(payload);

      if (!accessToken) {
        throw new Error("KYC session response did not include an access token.");
      }

      setKycUserId("");
      setSession({
        accessToken,
        applicantId: extractApplicantId(payload),
        sessionId: extractSessionId(payload),
        sumsubEnvironment: firstStringAtPath(payload, [
          ["data", "environment"],
          ["environment"],
        ]),
        sumsubLevelName: firstStringAtPath(payload, [
          ["data", "levelName"],
          ["levelName"],
        ]),
        createdAt: formatTimestamp(new Date()),
      });
      setSetupForm((current) => ({
        ...current,
        externalUserId: readExternalUserId(payload, nextExternalUserId),
      }));

      const sessionStatus = normalizeVerificationStatus(payload);

      if (sessionStatus !== "not_started") {
        setVerificationStatus(sessionStatus);
      }

      return accessToken;
    },
    [externalUserId, setupForm.email, setupForm.walletAddress],
  );

  const refreshStatus = useCallback(
    async (mode: "manual" | "silent" = "manual") => {
      if (!canPollStatus) {
        setStatusError("Generate an SDK session before polling status.");
        setStatusPhase("error");
        return;
      }

      if (mode === "manual") {
        setStatusPhase("loading");
      }

      setStatusError(null);

      try {
        const payload = await apiRequest(statusEndpoint, {
          method: "GET",
        });
        const nextKycUserId = readKycUserId(payload);

        if (nextKycUserId) {
          setKycUserId(nextKycUserId);
        }

        setVerificationStatus(normalizeVerificationStatus(payload));
        setLastCheckedAt(formatTimestamp(new Date()));
        setStatusPhase("success");
      } catch (error) {
        setStatusError(getErrorMessage(error));
        setStatusPhase("error");
      }
    },
    [canPollStatus, statusEndpoint],
  );

  useEffect(() => {
    if (!isPollingEnabled || !canPollStatus) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshStatus("silent");
    }, pollIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [canPollStatus, isPollingEnabled, refreshStatus]);

  const createSdkSession = async (forceNewApplicant = false) => {
    setCreatePhase("loading");
    setCreateError(null);
    setLookupPhase("idle");
    setLookupError(null);
    setSdkError(null);
    setSdkEvents([]);
    setSession(null);
    setLastCheckedAt(null);
    setCustomerSessionToken(null);

    try {
      await requestKycSession(forceNewApplicant);
      setCustomerSessionToken("demo");
      setVerificationStatus("pending");
      setIsPollingEnabled(true);
      setCreatePhase("success");
    } catch (error) {
      setCreateError(getErrorMessage(error));
      setCreatePhase("error");
    }
  };

  const loadExistingKyc = async () => {
    const email = trimOrNull(setupForm.email);
    const typedKycUserId = trimOrNull(kycUserId);
    const wallet = trimOrNull(setupForm.walletAddress);

    if (!typedKycUserId && (!email || !wallet)) {
      setLookupError("KYC user ID, or email and wallet address, is required.");
      setLookupPhase("error");
      return;
    }

    setLookupPhase("loading");
    setLookupError(null);
    setCreateError(null);
    setStatusError(null);
    setSdkError(null);

    const cachedState = readPersistedDemoState();
    const cachedStatus = cachedState?.verificationStatus;
    const canLoadCachedState =
      email &&
      wallet &&
      identitiesMatch(cachedState, email, wallet) &&
      cachedStatus;

    if (canLoadCachedState) {
      if (cachedState.kycUserId) {
        setKycUserId(cachedState.kycUserId);
      }

      if (cachedState.externalUserId) {
        setSetupForm((current) => ({
          ...current,
          externalUserId: cachedState.externalUserId ?? current.externalUserId,
        }));
      }

      setCustomerSessionToken("demo");
      setVerificationStatus(cachedStatus);
      setLastCheckedAt(cachedState.lastCheckedAt ?? formatTimestamp(new Date()));
      setStatusPhase("success");
      setLookupPhase("success");
      setIsPollingEnabled(Boolean(cachedState.kycUserId));
      return;
    }

    if (!typedKycUserId) {
      setLookupError(
        "No local KYC state found for this email and wallet. Paste the KYC user ID to recover it from the API.",
      );
      setLookupPhase("error");
      return;
    }

    try {
      const payload = await apiRequest(
        getDemoStatusEndpoint({
          kycUserId: typedKycUserId,
        }),
        {
          method: "GET",
        },
      );
      const nextKycUserId = readKycUserId(payload);

      setKycUserId(nextKycUserId ?? typedKycUserId);
      setCustomerSessionToken("demo");
      setVerificationStatus(normalizeVerificationStatus(payload));
      setLastCheckedAt(formatTimestamp(new Date()));
      setStatusPhase("success");
      setLookupPhase("success");
      setIsPollingEnabled(true);
    } catch (error) {
      setLookupError(getErrorMessage(error));
      setLookupPhase("error");
    }
  };

  const handleTokenRefresh = useCallback(async () => {
    try {
      return await requestKycSession();
    } catch (error) {
      setSdkError(getErrorMessage(error));
      throw error;
    }
  }, [requestKycSession]);

  const handleSdkMessage = useCallback(
    (eventType: string, payload: unknown) => {
      pushSdkEvent(eventType, payload);
    },
    [pushSdkEvent],
  );

  const handleSdkError = useCallback(
    (payload: unknown) => {
      const message = getResponseMessage(payload, "Sumsub WebSDK error.");

      setSdkError(message);
      pushSdkEvent("idCheck.onError", payload);
    },
    [pushSdkEvent],
  );

  return {
    canPollStatus,
    createError,
    createPhase,
    createSdkSession,
    externalUserId,
    handleSdkError,
    handleSdkMessage,
    handleTokenRefresh,
    hasCustomerSession,
    isPollingEnabled,
    kycUserId,
    lastCheckedAt,
    loadExistingKyc,
    lookupError,
    lookupPhase,
    refreshStatus,
    runtimeEnvironment,
    runtimeEnvironmentError,
    runtimeEnvironmentLabel,
    sdkError,
    sdkEvents,
    session,
    setIsPollingEnabled,
    setKycUserId,
    setupForm,
    statusDetail,
    statusError,
    statusLabel,
    statusPhase,
    statusTone,
    updateSetupField,
    verificationStatus,
    walletAddress,
  };
}
