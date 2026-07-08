"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildBigDataKycSessionBody,
  buildBigDataKycSubmitBody,
  defaultBigDataKycAddressForm,
  defaultBigDataKycSessionForm,
  hasRequiredBigDataSessionFields,
  hasRequiredBigDataSubmitFields,
  readBigDataIframeUrl,
  readBigDataKycUserId,
  type BigDataKycAddressForm,
  type BigDataKycSessionForm,
} from "../domain/bigid-kyc";
import {
  DEMO_ENDPOINTS,
  type VerificationStatus,
  getResponseMessage,
  getStatusDetail,
  getStatusEndpoint,
  getStatusLabel,
  getStatusTone,
  normalizeVerificationStatus,
} from "../domain/status";
import { apiRequest } from "../lib/api";
import { formatTimestamp, getErrorMessage } from "../lib/format";
import { trimOrNull } from "../lib/records";
import type { RequestPhase } from "../types";

const storageKey = "pods-kyc-demo-bigid-state-v1";

type BigDataPersistedState = {
  addressForm?: Partial<BigDataKycAddressForm>;
  iframeUrl?: string;
  kycUserId?: string;
  lastCheckedAt?: string;
  sessionForm?: Partial<BigDataKycSessionForm>;
  verificationStatus?: VerificationStatus;
};

type BigDataKycDefaults = {
  email?: string;
  walletAddress?: string;
};

function readPersistedState(): BigDataPersistedState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as BigDataPersistedState) : null;
  } catch {
    return null;
  }
}

function writePersistedState(state: BigDataPersistedState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function useBigDataKycFlow(defaults: BigDataKycDefaults) {
  const [initialState] = useState(readPersistedState);
  const [sessionForm, setSessionForm] = useState<BigDataKycSessionForm>(() => ({
    ...defaultBigDataKycSessionForm,
    email: defaults.email ?? "",
    walletAddress: defaults.walletAddress ?? "",
    ...initialState?.sessionForm,
  }));
  const [addressForm, setAddressForm] = useState<BigDataKycAddressForm>(() => ({
    ...defaultBigDataKycAddressForm,
    ...initialState?.addressForm,
  }));
  const [kycUserId, setKycUserId] = useState(initialState?.kycUserId ?? "");
  const [iframeUrl, setIframeUrl] = useState(initialState?.iframeUrl ?? "");
  const [lastCheckedAt, setLastCheckedAt] = useState(
    initialState?.lastCheckedAt ?? "",
  );
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(
      initialState?.verificationStatus ?? "not_started",
    );
  const [sessionPhase, setSessionPhase] = useState<RequestPhase>("idle");
  const [statusPhase, setStatusPhase] = useState<RequestPhase>("idle");
  const [submitPhase, setSubmitPhase] = useState<RequestPhase>("idle");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [latestStatusPayload, setLatestStatusPayload] =
    useState<unknown>(null);
  const [latestSubmitPayload, setLatestSubmitPayload] =
    useState<unknown>(null);

  useEffect(() => {
    writePersistedState({
      addressForm,
      iframeUrl: trimOrNull(iframeUrl) ?? undefined,
      kycUserId: trimOrNull(kycUserId) ?? undefined,
      lastCheckedAt: trimOrNull(lastCheckedAt) ?? undefined,
      sessionForm,
      verificationStatus,
    });
  }, [addressForm, iframeUrl, kycUserId, lastCheckedAt, sessionForm, verificationStatus]);

  const updateSessionField = useCallback(
    (field: keyof BigDataKycSessionForm) => (value: string) => {
      setSessionForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateAddressField = useCallback(
    (field: keyof BigDataKycAddressForm) => (value: string) => {
      setAddressForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const startSession = useCallback(async () => {
    if (!hasRequiredBigDataSessionFields(sessionForm)) {
      setSessionError("CPF, email, and wallet address are required.");
      setSessionPhase("error");
      return;
    }

    setSessionPhase("loading");
    setSessionError(null);
    setStatusError(null);
    setSubmitError(null);
    setLatestStatusPayload(null);
    setLatestSubmitPayload(null);

    try {
      const payload = await apiRequest(DEMO_ENDPOINTS.bigDataCorpSessions, {
        body: buildBigDataKycSessionBody(sessionForm),
      });
      const nextKycUserId = readBigDataKycUserId(payload);
      const nextIframeUrl = readBigDataIframeUrl(payload);

      if (!nextKycUserId) {
        throw new Error("BigDataCorp session response did not include kycUserId.");
      }

      if (!nextIframeUrl) {
        throw new Error("BigDataCorp session response did not include iframeUrl.");
      }

      setKycUserId(nextKycUserId);
      setIframeUrl(nextIframeUrl);
      setVerificationStatus(normalizeVerificationStatus(payload));
      setLastCheckedAt(formatTimestamp(new Date()));
      setSessionPhase("success");
    } catch (error) {
      setSessionError(getErrorMessage(error));
      setSessionPhase("error");
    }
  }, [sessionForm]);

  const refreshStatus = useCallback(async () => {
    if (!kycUserId.trim()) {
      setStatusError("Start a BigDataCorp session before checking status.");
      setStatusPhase("error");
      return;
    }

    setStatusPhase("loading");
    setStatusError(null);

    try {
      const payload = await apiRequest(getStatusEndpoint({ kycUserId }), {
        method: "GET",
      });
      const nextKycUserId = readBigDataKycUserId(payload);

      if (nextKycUserId) {
        setKycUserId(nextKycUserId);
      }

      setLatestStatusPayload(payload);
      setVerificationStatus(normalizeVerificationStatus(payload));
      setLastCheckedAt(formatTimestamp(new Date()));
      setStatusPhase("success");
    } catch (error) {
      setStatusError(getErrorMessage(error));
      setStatusPhase("error");
    }
  }, [kycUserId]);

  const submitToAvenia = useCallback(async () => {
    if (!kycUserId.trim()) {
      setSubmitError("Start a BigDataCorp session before submitting to Avenia.");
      setSubmitPhase("error");
      return;
    }

    if (!hasRequiredBigDataSubmitFields(addressForm)) {
      setSubmitError(
        "State, city, zip code, street address, and number are required.",
      );
      setSubmitPhase("error");
      return;
    }

    setSubmitPhase("loading");
    setSubmitError(null);

    try {
      const payload = await apiRequest(DEMO_ENDPOINTS.bigDataCorpSubmit, {
        body: buildBigDataKycSubmitBody({
          address: addressForm,
          kycUserId,
        }),
      });

      setLatestSubmitPayload(payload);
      setVerificationStatus(normalizeVerificationStatus(payload));
      setLastCheckedAt(formatTimestamp(new Date()));
      setSubmitPhase("success");
    } catch (error) {
      setSubmitError(
        getResponseMessage(error, "BigDataCorp submit failed."),
      );
      setSubmitPhase("error");
    }
  }, [addressForm, kycUserId]);

  return {
    addressForm,
    iframeUrl,
    kycUserId,
    lastCheckedAt,
    latestStatusPayload,
    latestSubmitPayload,
    refreshStatus,
    sessionError,
    sessionForm,
    sessionPhase,
    setKycUserId,
    startSession,
    statusDetail: getStatusDetail(verificationStatus),
    statusError,
    statusLabel: getStatusLabel(verificationStatus),
    statusPhase,
    statusTone: getStatusTone(verificationStatus),
    submitError,
    submitPhase,
    submitToAvenia,
    updateAddressField,
    updateSessionField,
    verificationStatus,
  };
}
