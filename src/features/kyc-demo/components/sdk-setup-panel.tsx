"use client";

import { Check, KeyRound, Loader2, Play, RefreshCw } from "lucide-react";
import type { FormEvent } from "react";
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

export function SdkSetupPanel({
  createError,
  createPhase,
  createSdkSession,
  externalUserId,
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
  createError: string | null;
  createPhase: RequestPhase;
  createSdkSession: (forceNewApplicant?: boolean) => Promise<void>;
  externalUserId: string;
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
  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createSdkSession(false);
  };

  return (
    <form className="panel flex flex-col gap-4" onSubmit={handleCreateSession}>
      <PanelHeader
        icon={<KeyRound className="h-4 w-4" />}
        title="SDK link"
        meta={getPhaseLabel(createPhase)}
      />
      {externalUserId ? (
        <CompactDatum label="External user" value={externalUserId} />
      ) : null}
      {kycUserId ? <CompactDatum label="KYC user" value={kycUserId} /> : null}
      {runtimeEnvironment ? (
        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <CompactDatum
            label="Sumsub env"
            value={formatSumsubEnvironment(runtimeEnvironment.sumsubEnvironment)}
          />
          <CompactDatum
            label="Sumsub token"
            value={runtimeEnvironment.sumsubAppTokenPrefix}
          />
          <CompactDatum
            label="Sumsub level"
            value={runtimeEnvironment.sumsubLevelName}
          />
          <CompactDatum
            label="Webhook secrets"
            value={String(runtimeEnvironment.sumsubWebhookSecretCount)}
          />
        </div>
      ) : null}
      {runtimeEnvironmentError ? (
        <p className="inline-alert danger">{runtimeEnvironmentError}</p>
      ) : null}
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
          label="KYC user ID"
          name="kycUserId"
          onChange={setKycUserId}
          value={kycUserId}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="primary-button"
          disabled={createPhase === "loading"}
          type="submit"
        >
          {createPhase === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Generate SDK link
        </button>
        <button
          className="secondary-button"
          disabled={createPhase === "loading"}
          onClick={() => void createSdkSession(true)}
          title="Create a fresh Sumsub applicant"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          New applicant
        </button>
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
        Load existing KYC
      </button>
      <OperationMessage
        error={createError}
        idle="No SDK link generated in this page load."
        phase={createPhase}
        success="SDK link generated and iframe ready."
      />
      <OperationMessage
        error={lookupError}
        idle=""
        phase={lookupPhase}
        success="Existing KYC loaded."
      />
    </form>
  );
}
