"use client";

import { KeyRound, Loader2, Play, RefreshCw } from "lucide-react";
import type { FormEvent } from "react";
import { getPhaseLabel } from "../lib/format";
import type {
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
  disabledReason,
  externalUserId,
  kycUserId,
  setupForm,
  updateSetupField,
}: {
  createError: string | null;
  createPhase: RequestPhase;
  createSdkSession: (forceNewApplicant?: boolean) => Promise<void>;
  disabledReason: string | null;
  externalUserId: string;
  kycUserId: string;
  setupForm: SetupForm;
  updateSetupField: (field: keyof SetupForm) => (value: string) => void;
}) {
  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createSdkSession(false);
  };
  const isCreateDisabled = createPhase === "loading" || Boolean(disabledReason);

  return (
    <form className="panel flex flex-col gap-4" onSubmit={handleCreateSession}>
      <PanelHeader
        icon={<KeyRound className="h-4 w-4" />}
        title="Start KYC"
        meta={getPhaseLabel(createPhase)}
      />
      <p className="text-sm text-[var(--fg-secondary)]">
        Add the tester details once, generate the Sumsub verification link, and
        keep the approved KYC profile saved in this browser after refresh.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
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
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {externalUserId ? (
          <CompactDatum label="External user" value={externalUserId} />
        ) : null}
        {kycUserId ? (
          <CompactDatum label="Saved KYC profile" value={kycUserId} />
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          className="primary-button"
          disabled={isCreateDisabled}
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
          disabled={isCreateDisabled}
          onClick={() => void createSdkSession(true)}
          title="Create a fresh Sumsub applicant"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          New applicant
        </button>
      </div>
      {disabledReason ? (
        <p className="inline-alert neutral">{disabledReason}</p>
      ) : null}
      <OperationMessage
        error={createError}
        idle="No SDK link generated in this page load."
        phase={createPhase}
        success="SDK link generated and iframe ready."
      />
    </form>
  );
}
