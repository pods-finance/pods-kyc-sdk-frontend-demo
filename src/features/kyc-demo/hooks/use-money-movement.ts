"use client";

import { useCallback, useState } from "react";
import {
  initialOnrampTransferForm,
  initialTransferForm,
  transferEndpoints,
  transferLabels,
} from "../constants";
import {
  DEMO_ENDPOINTS,
  type VerificationStatus,
  canUseMoneyMovement,
  formatTransferAmountIn,
  getResponseMessage,
  getSwapStatusEndpoint,
} from "../domain/status";
import {
  buildQuery,
  buildTransferBytecodeBody,
  buildTransferQuoteParams,
  extractQuoteId,
} from "../domain/transfers";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import { trimOrNull } from "../lib/records";
import type {
  RequestPhase,
  TransferAction,
  TransferForm,
  TransferKind,
  TransferResult,
} from "../types";

type TransferState<T> = Record<TransferKind, T>;

function createPhaseState(): TransferState<RequestPhase> {
  return {
    onramp: "idle",
    offramp: "idle",
  };
}

function createResultState(): TransferState<TransferResult | null> {
  return {
    onramp: null,
    offramp: null,
  };
}

function getTransferDisabledReason(
  status: VerificationStatus,
  walletAddress: string,
): string | null {
  if (!canUseMoneyMovement(status)) {
    return "Locked until local status is Approved.";
  }

  if (!trimOrNull(walletAddress)) {
    return "Wallet address is required.";
  }

  return null;
}

function getInvalidAmountMessage(kind: TransferKind): string {
  if (kind === "onramp") {
    return "Enter a valid BRL amount, for example 10 or 10.00.";
  }

  return "Enter a valid USDC raw amount, for example 1000000.";
}

export function useMoneyMovement({
  verificationStatus,
  walletAddress,
}: {
  verificationStatus: VerificationStatus;
  walletAddress: string;
}) {
  const [onrampForm, setOnrampForm] =
    useState<TransferForm>(initialOnrampTransferForm);
  const [offrampForm, setOfframpForm] =
    useState<TransferForm>(initialTransferForm);
  const [transferPhases, setTransferPhases] =
    useState<TransferState<RequestPhase>>(createPhaseState);
  const [transferActionPhases, setTransferActionPhases] =
    useState<TransferState<RequestPhase>>(createPhaseState);
  const [transferResults, setTransferResults] =
    useState<TransferState<TransferResult | null>>(createResultState);

  const transferDisabledReason = getTransferDisabledReason(
    verificationStatus,
    walletAddress,
  );

  const resetTransfers = useCallback(() => {
    setTransferResults(createResultState());
    setTransferActionPhases(createPhaseState());
    setTransferPhases(createPhaseState());
  }, []);

  const submitTransfer = useCallback(
    async (kind: TransferKind) => {
      if (transferDisabledReason) {
        return;
      }

      const form = kind === "onramp" ? onrampForm : offrampForm;
      const amountInput = trimOrNull(form.amountBrl);

      if (!amountInput) {
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: "Amount is required.",
          },
        }));
        return;
      }

      const amountIn = formatTransferAmountIn(amountInput, kind);

      if (!amountIn) {
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: getInvalidAmountMessage(kind),
          },
        }));
        return;
      }

      const pixKey = trimOrNull(offrampForm.pixKey);

      if (kind === "offramp" && !pixKey) {
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: "Pix key is required to generate the deposit address.",
          },
        }));
        return;
      }

      setTransferPhases((current) => ({ ...current, [kind]: "loading" }));
      setTransferResults((current) => ({ ...current, [kind]: null }));

      try {
        const queryParams = buildTransferQuoteParams(
          kind,
          amountIn,
          walletAddress,
        );

        const payload = await apiRequest(
          buildQuery(transferEndpoints[kind], queryParams),
          { method: "GET" },
        );
        let resultPayload = payload;
        const fallbackMessage =
          kind === "onramp"
            ? "Pix quote generated."
            : "Offramp quote and deposit address generated.";

        if (kind === "offramp") {
          const quoteId = extractQuoteId(payload);

          if (!quoteId) {
            throw new Error("Quote ID missing from offramp quote response.");
          }

          resultPayload = await apiRequest(DEMO_ENDPOINTS.swapBytecode, {
            body: buildTransferBytecodeBody({
              kind,
              pixKey: pixKey ?? undefined,
              quoteId,
              walletAddress,
            }),
          });
        }

        const message = getResponseMessage(resultPayload, fallbackMessage);

        setTransferPhases((current) => ({ ...current, [kind]: "success" }));
        setTransferResults((current) => ({
          ...current,
          [kind]: { status: "success", message, payload: resultPayload },
        }));
      } catch (error) {
        setTransferPhases((current) => ({ ...current, [kind]: "error" }));
        setTransferResults((current) => ({
          ...current,
          [kind]: { status: "error", message: getErrorMessage(error) },
        }));
      }
    },
    [offrampForm, onrampForm, transferDisabledReason, walletAddress],
  );

  const submitTransferAction = useCallback(
    async (kind: TransferKind, action: TransferAction) => {
      const currentResult = transferResults[kind];
      const quoteId = extractQuoteId(currentResult?.payload);

      if (!quoteId) {
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: "Generate a quote before running this action.",
            payload: currentResult?.payload,
          },
        }));
        return;
      }

      if (action === "execute" && !trimOrNull(walletAddress)) {
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: "Wallet address is required to build the transaction.",
            payload: currentResult?.payload,
          },
        }));
        return;
      }

      setTransferActionPhases((current) => ({ ...current, [kind]: "loading" }));

      try {
        let payload: unknown;

        if (action === "refresh") {
          payload = await apiRequest(getSwapStatusEndpoint(quoteId), {
            method: "GET",
          });
        } else {
          const pixKey = trimOrNull(offrampForm.pixKey);

          if (kind === "offramp" && !pixKey) {
            setTransferActionPhases((current) => ({
              ...current,
              [kind]: "idle",
            }));
            setTransferResults((current) => ({
              ...current,
              [kind]: {
                status: "error",
                message:
                  "Pix key is required to build the Pix withdrawal transaction.",
                payload: currentResult?.payload,
              },
            }));
            return;
          }

          payload = await apiRequest(DEMO_ENDPOINTS.swapBytecode, {
            body: buildTransferBytecodeBody({
              kind,
              pixKey: pixKey ?? undefined,
              quoteId,
              walletAddress,
            }),
          });
        }

        const message = getResponseMessage(
          payload,
          `${transferLabels[kind]} ${action} completed.`,
        );

        setTransferActionPhases((current) => ({
          ...current,
          [kind]: "success",
        }));
        setTransferResults((current) => ({
          ...current,
          [kind]: { status: "success", message, payload },
        }));
      } catch (error) {
        setTransferActionPhases((current) => ({ ...current, [kind]: "error" }));
        setTransferResults((current) => ({
          ...current,
          [kind]: {
            status: "error",
            message: getErrorMessage(error),
            payload: currentResult?.payload,
          },
        }));
      }
    },
    [offrampForm.pixKey, transferResults, walletAddress],
  );

  return {
    onrampForm,
    offrampForm,
    resetTransfers,
    setOfframpForm,
    setOnrampForm,
    submitTransfer,
    submitTransferAction,
    transferActionPhases,
    transferDisabledReason,
    transferPhases,
    transferResults,
  };
}
