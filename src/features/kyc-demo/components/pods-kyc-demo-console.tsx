"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { getSumsubEnvironmentTone } from "../domain/session";
import { useBigDataKycFlow } from "../hooks/use-bigid-kyc-flow";
import { useKycFlow } from "../hooks/use-kyc-flow";
import { useMoneyMovement } from "../hooks/use-money-movement";
import { BigDataKycPanel } from "./bigid-kyc-panel";
import { CustomerProfilePanel } from "./customer-profile-panel";
import { LocalStatusPanel } from "./local-status-panel";
import { MoneyMovementPanel } from "./money-movement-panel";
import { StatusPill } from "./primitives";
import { SdkEventsPanel } from "./sdk-events-panel";
import { SdkSetupPanel } from "./sdk-setup-panel";
import { WebhookPanel } from "./webhook-panel";
import { WebSdkPanel } from "./websdk-panel";

type DemoTab = "kyc" | "onramp" | "offramp" | "devtools";

const tabs: Array<{
  description: string;
  id: DemoTab;
  label: string;
}> = [
  {
    description: "Verify a user with BigDataCorp or Sumsub and save the KYC ID.",
    id: "kyc",
    label: "KYC Flow",
  },
  {
    description: "Create a Pix payment code that settles USDC on Base.",
    id: "onramp",
    label: "Onramp",
  },
  {
    description: "Generate the USDC transfer instructions for a BRL Pix payout.",
    id: "offramp",
    label: "Offramp",
  },
  {
    description: "Inspect status polling, webhook details, SDK events, and raw IDs.",
    id: "devtools",
    label: "Dev Tools",
  },
];

export function PodsKycDemoConsole() {
  const [activeTab, setActiveTab] = useState<DemoTab>("kyc");
  const [demoOrigin] = useState(() => {
    if (typeof window === "undefined") {
      return "http://localhost:3000";
    }

    return window.location.origin;
  });
  const kyc = useKycFlow();
  const bigDataKyc = useBigDataKycFlow({
    email: kyc.setupForm.email,
    walletAddress: kyc.setupForm.walletAddress,
  });
  const moneyMovement = useMoneyMovement({
    verificationStatus: kyc.verificationStatus,
    walletAddress: kyc.walletAddress,
  });
  const webhookTarget = `${demoOrigin}/api/customer-webhooks/sumsub`;
  const sessionStatusLabel = kyc.hasCustomerSession
    ? "Session active"
    : "No session";
  const sessionStatusTone = kyc.hasCustomerSession ? "success" : "neutral";
  const missingProfileReason = getMissingProfileReason({
    email: kyc.setupForm.email,
    walletAddress: kyc.setupForm.walletAddress,
  });

  const createSdkSession = async (forceNewApplicant = false) => {
    moneyMovement.resetTransfers();
    await kyc.createSdkSession(forceNewApplicant);
  };

  const loadExistingKyc = async () => {
    moneyMovement.resetTransfers();
    await kyc.loadExistingKyc();
  };

  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--fg-primary)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6 md:px-12 lg:px-16">
        <header className="demo-hero">
          <div className="min-w-0">
            <p className="eyebrow-pill">
              REST API demo
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-light leading-tight tracking-normal text-[var(--pods-sage)]">
              Test KYC, Pix onramp, and Pix offramp in one guided flow.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fg-secondary)]">
              Save a tester profile once, complete Sumsub, then use the same
              approved KYC profile for BRL to USDC and USDC to BRL Pix flows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={kyc.statusLabel} tone={kyc.statusTone} />
            <StatusPill
              label={kyc.runtimeEnvironmentLabel}
              tone={getSumsubEnvironmentTone(
                kyc.runtimeEnvironment?.sumsubEnvironment,
              )}
            />
            <StatusPill label="Demo customer" tone="success" />
            <StatusPill label={sessionStatusLabel} tone={sessionStatusTone} />
          </div>
        </header>

        <section>
          <section className="flex min-w-0 flex-col gap-5">
            <div>
              <div className="grid gap-2 md:grid-cols-4">
                {tabs.map((tab) => (
                  <button
                    className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <span>{getTabIcon(tab.id)}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{tab.label}</span>
                      <span className="mt-1 block text-xs font-normal leading-5">
                        {tab.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {activeTab === "kyc" ? (
                <div className="grid gap-4">
                  <BigDataKycPanel flow={bigDataKyc} />

                  <details className="panel flex flex-col gap-4">
                    <summary className="cursor-pointer text-sm font-semibold uppercase tracking-normal text-[var(--fg-primary)]">
                      Sumsub reusable KYC flow
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <SdkSetupPanel
                        createError={kyc.createError}
                        createPhase={kyc.createPhase}
                        createSdkSession={createSdkSession}
                        disabledReason={missingProfileReason}
                        externalUserId={kyc.externalUserId}
                        kycUserId={kyc.kycUserId}
                        setupForm={kyc.setupForm}
                        updateSetupField={kyc.updateSetupField}
                      />

                      {kyc.session ? (
                        <WebSdkPanel
                          externalUserId={kyc.externalUserId}
                          handleSdkError={kyc.handleSdkError}
                          handleSdkMessage={kyc.handleSdkMessage}
                          handleTokenRefresh={kyc.handleTokenRefresh}
                          kycUserId={kyc.kycUserId}
                          sdkError={kyc.sdkError}
                          session={kyc.session}
                          setupForm={kyc.setupForm}
                        />
                      ) : null}
                    </div>
                  </details>
                </div>
              ) : null}

              {activeTab === "onramp" ? (
                <MoneyMovementPanel
                  disabledReason={moneyMovement.transferDisabledReason}
                  form={moneyMovement.onrampForm}
                  kind="onramp"
                  onChange={moneyMovement.setOnrampForm}
                  onRunAction={moneyMovement.submitTransferAction}
                  onSubmit={moneyMovement.submitTransfer}
                  phase={moneyMovement.transferPhases.onramp}
                  phaseAction={moneyMovement.transferActionPhases.onramp}
                  result={moneyMovement.transferResults.onramp}
                />
              ) : null}

              {activeTab === "offramp" ? (
                <MoneyMovementPanel
                  disabledReason={moneyMovement.transferDisabledReason}
                  form={moneyMovement.offrampForm}
                  kind="offramp"
                  onChange={moneyMovement.setOfframpForm}
                  onRunAction={moneyMovement.submitTransferAction}
                  onSubmit={moneyMovement.submitTransfer}
                  phase={moneyMovement.transferPhases.offramp}
                  phaseAction={moneyMovement.transferActionPhases.offramp}
                  result={moneyMovement.transferResults.offramp}
                />
              ) : null}

              {activeTab === "devtools" ? (
                <div className="grid min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <CustomerProfilePanel
                      kycUserId={kyc.kycUserId}
                      loadExistingKyc={loadExistingKyc}
                      lookupError={kyc.lookupError}
                      lookupPhase={kyc.lookupPhase}
                      runtimeEnvironment={kyc.runtimeEnvironment}
                      runtimeEnvironmentError={kyc.runtimeEnvironmentError}
                      setKycUserId={kyc.setKycUserId}
                      setupForm={kyc.setupForm}
                      updateSetupField={kyc.updateSetupField}
                    />
                    <LocalStatusPanel
                      canPollStatus={kyc.canPollStatus}
                      isPollingEnabled={kyc.isPollingEnabled}
                      lastCheckedAt={kyc.lastCheckedAt}
                      refreshStatus={kyc.refreshStatus}
                      setIsPollingEnabled={kyc.setIsPollingEnabled}
                      statusDetail={kyc.statusDetail}
                      statusError={kyc.statusError}
                      statusLabel={kyc.statusLabel}
                      statusPhase={kyc.statusPhase}
                      statusTone={kyc.statusTone}
                    />
                    <WebhookPanel webhookTarget={webhookTarget} />
                    <SdkEventsPanel sdkEvents={kyc.sdkEvents} />
                  </div>

                  <div className="min-w-0">
                    <WebSdkPanel
                      externalUserId={kyc.externalUserId}
                      handleSdkError={kyc.handleSdkError}
                      handleSdkMessage={kyc.handleSdkMessage}
                      handleTokenRefresh={kyc.handleTokenRefresh}
                      kycUserId={kyc.kycUserId}
                      sdkError={kyc.sdkError}
                      session={kyc.session}
                      setupForm={kyc.setupForm}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function getMissingProfileReason({
  email,
  walletAddress,
}: {
  email: string;
  walletAddress: string;
}): string | null {
  if (!email.trim() && !walletAddress.trim()) {
    return "Add an email and wallet address before generating the SDK link.";
  }

  if (!email.trim()) {
    return "Add an email before generating the SDK link.";
  }

  if (!walletAddress.trim()) {
    return "Add a wallet address before generating the SDK link.";
  }

  return null;
}

function getTabIcon(tab: DemoTab) {
  switch (tab) {
    case "kyc":
      return <ShieldCheck className="h-4 w-4" />;
    case "onramp":
      return <ArrowDownToLine className="h-4 w-4" />;
    case "offramp":
      return <ArrowUpFromLine className="h-4 w-4" />;
    case "devtools":
      return <Settings2 className="h-4 w-4" />;
  }
}
