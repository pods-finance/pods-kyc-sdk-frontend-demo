"use client";

import {
  ExternalLink,
  Fingerprint,
  FileCheck2,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import type { FormEvent } from "react";
import type { useBigDataKycFlow } from "../hooks/use-bigid-kyc-flow";
import { getPhaseLabel } from "../lib/format";
import {
  CompactDatum,
  CopyableValue,
  Field,
  OperationMessage,
  PanelHeader,
  StatusPill,
} from "./primitives";

type BigDataKycFlow = ReturnType<typeof useBigDataKycFlow>;

function formatApiPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function BigDataKycPanel({ flow }: { flow: BigDataKycFlow }) {
  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await flow.startSession();
  };
  const handleSubmitToAvenia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await flow.submitToAvenia();
  };
  const isStarting = flow.sessionPhase === "loading";
  const isRefreshing = flow.statusPhase === "loading";
  const isSubmitting = flow.submitPhase === "loading";

  return (
    <section className="panel flex flex-col gap-5">
      <PanelHeader
        icon={<Fingerprint className="h-4 w-4" />}
        meta={getPhaseLabel(flow.sessionPhase)}
        title="BigDataCorp iframe provider"
      />

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--fg-primary)]">
            Provider status
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--fg-secondary)]">
            Create the BigDataCorp iframe, let the user complete document and
            liveness, poll the canonical KYC status, then submit verified data to
            Avenia with the address fields.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={flow.statusLabel} tone={flow.statusTone} />
          {flow.lastCheckedAt ? (
            <span className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-xs font-medium text-[var(--fg-secondary)]">
              Checked {flow.lastCheckedAt}
            </span>
          ) : null}
        </div>
      </div>

      <form className="grid gap-4" onSubmit={handleStart}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            inputMode="numeric"
            label="CPF"
            name="bigidCpf"
            onChange={flow.updateSessionField("cpf")}
            placeholder="CPF digits"
            required
            value={flow.sessionForm.cpf}
          />
          <Field
            autoComplete="email"
            label="Email"
            name="bigidEmail"
            onChange={flow.updateSessionField("email")}
            required
            type="email"
            value={flow.sessionForm.email}
          />
          <Field
            label="Wallet address"
            name="bigidWalletAddress"
            onChange={flow.updateSessionField("walletAddress")}
            required
            value={flow.sessionForm.walletAddress}
          />
          <Field
            label="Customer user reference"
            name="bigidExternalUserId"
            onChange={flow.updateSessionField("externalUserId")}
            placeholder="Optional"
            value={flow.sessionForm.externalUserId}
          />
        </div>

        <button className="primary-button" disabled={isStarting} type="submit">
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Start BigDataCorp iframe
        </button>
        <OperationMessage
          error={flow.sessionError}
          idle="No BigDataCorp iframe generated in this page load."
          phase={flow.sessionPhase}
          success="BigDataCorp iframe generated."
        />
      </form>

      {flow.iframeUrl ? (
        <div className="grid gap-3">
          <div className="grid gap-2 lg:grid-cols-2">
            <CompactDatum label="KYC user ID" value={flow.kycUserId} />
            <CopyableValue label="Iframe URL" value={flow.iframeUrl} />
          </div>
          <iframe
            allow="camera; microphone; fullscreen"
            className="min-h-[640px] w-full rounded-lg border border-[var(--border-subtle)] bg-white"
            src={flow.iframeUrl}
            title="BigDataCorp KYC iframe"
          />
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border border-[var(--border-subtle)] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <Field
              label="KYC user ID"
              name="bigidKycUserId"
              onChange={flow.setKycUserId}
              placeholder="Paste a KYC user ID to recover status"
              required
              value={flow.kycUserId}
            />
          </div>
          <button
            className="secondary-button lg:w-auto"
            disabled={isRefreshing || !flow.kycUserId.trim()}
            onClick={() => void flow.refreshStatus()}
            type="button"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check status
          </button>
        </div>
        <p className="text-sm text-[var(--fg-secondary)]">
          {flow.statusDetail}
        </p>
        <OperationMessage
          error={flow.statusError}
          idle=""
          phase={flow.statusPhase}
          success="KYC status refreshed."
        />
        {flow.latestStatusPayload ? (
          <CopyableValue
            label="Status API response"
            multiline
            value={formatApiPayload(flow.latestStatusPayload)}
          />
        ) : null}
      </div>

      <form
        className="grid gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4"
        onSubmit={handleSubmitToAvenia}
      >
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-[var(--fg-secondary)]" />
          <div>
            <p className="font-medium text-[var(--fg-primary)]">
              Submit verified BigDataCorp KYC to Avenia
            </p>
            <p className="mt-1 text-sm text-[var(--fg-secondary)]">
              Address fields are sent directly to Avenia and are not meant to be
              stored by the KYC profile.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field
            label="Country"
            name="bigidCountry"
            onChange={flow.updateAddressField("country")}
            value={flow.addressForm.country}
          />
          <Field
            label="State"
            name="bigidState"
            onChange={flow.updateAddressField("state")}
            placeholder="SP"
            required
            value={flow.addressForm.state}
          />
          <Field
            label="City"
            name="bigidCity"
            onChange={flow.updateAddressField("city")}
            required
            value={flow.addressForm.city}
          />
          <Field
            inputMode="numeric"
            label="Zip code"
            name="bigidZipCode"
            onChange={flow.updateAddressField("zipCode")}
            placeholder="13000000"
            required
            value={flow.addressForm.zipCode}
          />
          <Field
            label="Street address"
            name="bigidStreetAddress"
            onChange={flow.updateAddressField("streetAddress")}
            required
            value={flow.addressForm.streetAddress}
          />
          <Field
            label="Number"
            name="bigidNumber"
            onChange={flow.updateAddressField("number")}
            required
            value={flow.addressForm.number}
          />
          <Field
            label="Complement"
            name="bigidComplement"
            onChange={flow.updateAddressField("complement")}
            placeholder="Optional"
            value={flow.addressForm.complement}
          />
          <Field
            inputMode="tel"
            label="Phone"
            name="bigidPhone"
            onChange={flow.updateAddressField("phone")}
            placeholder="Optional"
            value={flow.addressForm.phone}
          />
        </div>

        <button
          className="primary-button"
          disabled={isSubmitting || !flow.kycUserId.trim()}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit to Avenia
        </button>
        <OperationMessage
          error={flow.submitError}
          idle=""
          phase={flow.submitPhase}
          success="BigDataCorp KYC submitted to Avenia."
        />
        {flow.latestSubmitPayload ? (
          <CopyableValue
            label="Submit API response"
            multiline
            value={formatApiPayload(flow.latestSubmitPayload)}
          />
        ) : null}
      </form>
    </section>
  );
}
