"use client";

import { useState } from "react";
import { getSumsubEnvironmentTone } from "../domain/session";
import { useKycFlow } from "../hooks/use-kyc-flow";
import { useMoneyMovement } from "../hooks/use-money-movement";
import { LocalStatusPanel } from "./local-status-panel";
import { MoneyMovementPanel } from "./money-movement-panel";
import { StatusPill } from "./primitives";
import { SdkEventsPanel } from "./sdk-events-panel";
import { SdkSetupPanel } from "./sdk-setup-panel";
import { WebhookPanel } from "./webhook-panel";
import { WebSdkPanel } from "./websdk-panel";

export function PodsKycDemoConsole() {
  const [demoOrigin] = useState(() => {
    if (typeof window === "undefined") {
      return "http://localhost:3000";
    }

    return window.location.origin;
  });
  const kyc = useKycFlow();
  const moneyMovement = useMoneyMovement({
    verificationStatus: kyc.verificationStatus,
    walletAddress: kyc.walletAddress,
  });
  const webhookTarget = `${demoOrigin}/api/customer-webhooks/sumsub`;
  const sessionStatusLabel = kyc.hasCustomerSession
    ? "Session active"
    : "No session";
  const sessionStatusTone = kyc.hasCustomerSession ? "success" : "neutral";

  const createSdkSession = async (forceNewApplicant = false) => {
    moneyMovement.resetTransfers();
    await kyc.createSdkSession(forceNewApplicant);
  };

  const loadExistingKyc = async () => {
    moneyMovement.resetTransfers();
    await kyc.loadExistingKyc();
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Demo console
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              Pods KYC Demo
            </h1>
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

        <section className="grid gap-4 xl:grid-cols-[360px_minmax(420px,1fr)_390px]">
          <SdkSetupPanel
            createError={kyc.createError}
            createPhase={kyc.createPhase}
            createSdkSession={createSdkSession}
            externalUserId={kyc.externalUserId}
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

          <aside className="flex flex-col gap-4">
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
          </aside>
        </section>
      </div>
    </main>
  );
}
