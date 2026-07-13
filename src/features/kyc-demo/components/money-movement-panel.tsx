"use client";

import { Loader2, RefreshCw, SendHorizontal, WalletCards } from "lucide-react";
import {
  getTransferDescription,
  getTransferLabel,
  supportedTransferChains,
  transferChains,
} from "../constants";
import {
  extractQuoteId,
} from "../domain/transfers";
import { getPhaseLabel } from "../lib/format";
import type {
  RequestPhase,
  TransferAction,
  TransferChain,
  TransferForm,
  TransferKind,
  TransferResult,
} from "../types";
import { Field, PanelHeader } from "./primitives";
import { TransferResultDetails } from "./transfer-result-details";

export function MoneyMovementPanel({
  disabledReason,
  form,
  kind,
  onChange,
  onRunAction,
  onSubmit,
  phaseAction,
  phase,
  result,
}: {
  disabledReason: string | null;
  form: TransferForm;
  kind: TransferKind;
  onChange: (form: TransferForm) => void;
  onRunAction: (kind: TransferKind, action: TransferAction) => void;
  onSubmit: (kind: TransferKind) => void;
  phaseAction: RequestPhase;
  phase: RequestPhase;
  result: TransferResult | null;
}) {
  const isDisabled =
    Boolean(disabledReason) || phase === "loading" || phaseAction === "loading";
  const title = getTransferLabel(kind, form.chain);
  const description = getTransferDescription(kind, form.chain);
  const isOfframp = kind === "offramp";
  const amountLabel = kind === "onramp" ? "BRL amount" : "USDC amount";
  const amountHint =
    kind === "onramp"
      ? "Example: 10 means BRL 10.00."
      : "Example: 1.5 means 1.5 USDC. The demo converts it to raw units for the API.";
  const amountStep = kind === "onramp" ? "0.01" : "0.000001";
  const hasSuccessfulResult = result?.status === "success";
  const quoteId = extractQuoteId(result?.payload);
  const submitLabel =
    kind === "onramp" ? "Generate Pix quote" : "Generate deposit address";
  const formGridClass =
    isOfframp
      ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_260px] xl:items-end"
      : "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px] xl:items-end";
  const chainLabel = isOfframp ? "USDC network" : "Settlement network";
  const chainHint = isOfframp
    ? "Choose the network that holds the USDC you will send."
    : "Choose the network where the acquired USDC will settle.";

  const handleAmountChange = (value: string) => {
    onChange({ ...form, amount: value });
  };
  const handlePixKeyChange = (value: string) => {
    onChange({ ...form, pixKey: value });
  };
  const handleChainChange = (value: string) => {
    if (value !== "base" && value !== "monad") {
      return;
    }

    onChange({ ...form, chain: value as TransferChain });
  };

  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<WalletCards className="h-4 w-4" />}
        title={title}
        meta={getPhaseLabel(phase)}
      />
      <p className="text-sm text-[var(--fg-secondary)]">{description}</p>
      <div className={formGridClass}>
        <div className="min-w-0">
          <Field
            inputMode="decimal"
            label={amountLabel}
            min="0"
            name={`${kind}-amount`}
            onChange={handleAmountChange}
            required
            step={amountStep}
            type="number"
            value={form.amount}
          />
          <p className="mt-1 text-xs leading-5 text-[var(--fg-secondary)]">
            {amountHint}
          </p>
        </div>
        {isOfframp ? (
          <div className="min-w-0">
            <Field
              label="Pix key"
              name={`${kind}-pix-key`}
              onChange={handlePixKeyChange}
              required
              value={form.pixKey}
            />
            <p className="mt-1 text-xs leading-5 text-[var(--fg-secondary)]">
              Required for the BRL Pix payout.
            </p>
          </div>
        ) : null}
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-[var(--fg-primary)]">
            {chainLabel}
          </span>
          <select
            className="text-field"
            name={`${kind}-usdc-network`}
            onChange={(event) => handleChainChange(event.currentTarget.value)}
            value={form.chain}
          >
            {supportedTransferChains.map((chain) => (
              <option key={chain} value={chain}>
                {transferChains[chain].label}
              </option>
            ))}
          </select>
          <span className="text-xs leading-5 text-[var(--fg-secondary)]">
            {chainHint}
          </span>
        </label>
        <button
          className="primary-button w-full"
          disabled={isDisabled}
          onClick={() => onSubmit(kind)}
          type="button"
        >
          {phase === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
          {submitLabel}
        </button>
      </div>
      {disabledReason ? (
        <p className="inline-alert neutral">{disabledReason}</p>
      ) : null}
      {result ? (
        <div className="flex flex-col gap-3">
          <p className={`inline-alert ${result.status}`}>{result.message}</p>
          {hasSuccessfulResult ? (
            <>
              <TransferResultDetails kind={kind} payload={result.payload} />
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                <button
                  className="secondary-button"
                  disabled={!quoteId || phaseAction === "loading"}
                  onClick={() => onRunAction(kind, "refresh")}
                  type="button"
                >
                  {phaseAction === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh quote
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
