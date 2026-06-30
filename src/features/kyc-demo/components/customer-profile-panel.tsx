"use client";

import { Check, Loader2, UserRound } from "lucide-react";
import {
  formatSumsubEnvironment,
} from "../domain/session";
import { getPhaseLabel } from "../lib/format";
import type {
  DemoRuntimeEnvironment,
  RequestPhase,
  SetupForm,
} from "../types";
import {
  CompactDatum,
  Field,
  OperationMessage,
  PanelHeader,
} from "./primitives";

export function CustomerProfilePanel({
  kycUserId,
  loadExistingKyc,
  lookupError,
  lookupPhase,
  runtimeEnvironment,
  runtimeEnvironmentError,
  setKycUserId,
  setupForm,
  updateSetupField,
}: {
  kycUserId: string;
  loadExistingKyc: () => Promise<void>;
  lookupError: string | null;
  lookupPhase: RequestPhase;
  runtimeEnvironment: DemoRuntimeEnvironment | null;
  runtimeEnvironmentError: string | null;
  setKycUserId: (value: string) => void;
  setupForm: SetupForm;
  updateSetupField: (field: keyof SetupForm) => (value: string) => void;
}) {
  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<UserRound className="h-4 w-4" />}
        title="Tester profile"
        meta={getPhaseLabel(lookupPhase)}
      />

      <p className="text-sm text-[var(--fg-secondary)]">
        These values stay saved in this browser after refresh. Change them when
        testing a different person.
      </p>

      <div className="grid gap-3">
        <Field
          autoComplete="email"
          label="Email"
          name="email"
          onChange={updateSetupField("email")}
          required
          type="email"
          value={setupForm.email}
        />
        <Field
          label="Wallet address"
          name="walletAddress"
          onChange={updateSetupField("walletAddress")}
          required
          value={setupForm.walletAddress}
        />
        <Field
          label="Saved KYC user ID"
          name="kycUserId"
          onChange={setKycUserId}
          value={kycUserId}
        />
      </div>

      <button
        className="secondary-button"
        disabled={lookupPhase === "loading"}
        onClick={() => void loadExistingKyc()}
        type="button"
      >
        {lookupPhase === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Restore KYC status
      </button>

      <OperationMessage
        error={lookupError}
        idle=""
        phase={lookupPhase}
        success="Saved KYC profile restored."
      />

      {runtimeEnvironment ? (
        <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--fg-secondary)]">
          <CompactDatum
            label="Sumsub env"
            value={formatSumsubEnvironment(runtimeEnvironment.sumsubEnvironment)}
          />
          <CompactDatum
            label="Sumsub level"
            value={runtimeEnvironment.sumsubLevelName}
          />
          <CompactDatum
            label="Pods API"
            value={runtimeEnvironment.podsApiBaseUrl}
          />
        </div>
      ) : null}

      {runtimeEnvironmentError ? (
        <p className="inline-alert danger">{runtimeEnvironmentError}</p>
      ) : null}
    </section>
  );
}
