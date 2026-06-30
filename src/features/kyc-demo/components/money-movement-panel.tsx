"use client";

import { Loader2, RefreshCw, SendHorizontal, WalletCards } from "lucide-react";
import {
  transferDescriptions,
  transferLabels,
} from "../constants";
import {
  extractQuoteId,
} from "../domain/transfers";
import { getPhaseLabel } from "../lib/format";
import type {
  RequestPhase,
  TransferAction,
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
  const title = transferLabels[kind];
  const description = transferDescriptions[kind];
  const amountLabel =
    kind === "onramp"
      ? "BRL amount"
      : "USDC raw amount (1000000 = 1 USDC)";
  const hasSuccessfulResult = result?.status === "success";
  const quoteId = extractQuoteId(result?.payload);
  const submitLabel =
    kind === "onramp" ? "Generate Pix quote" : "Generate deposit address";

  const handleAmountChange = (value: string) => {
    onChange({ ...form, amountBrl: value });
  };
  const handlePixKeyChange = (value: string) => {
    onChange({ ...form, pixKey: value });
  };

  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<WalletCards className="h-4 w-4" />}
        title={title}
        meta={getPhaseLabel(phase)}
      />
      <p className="text-sm text-slate-600">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <Field
          label={amountLabel}
          name={`${kind}-amount`}
          onChange={handleAmountChange}
          required
          type="number"
          value={form.amountBrl}
        />
        {kind === "offramp" ? (
          <Field
            label="Pix key"
            name={`${kind}-pix-key`}
            onChange={handlePixKeyChange}
            required
            value={form.pixKey}
          />
        ) : null}
      </div>
      <button
        className="secondary-button"
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
