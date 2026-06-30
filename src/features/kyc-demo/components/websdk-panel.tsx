"use client";

import SumsubWebSdk from "@sumsub/websdk-react";
import { CircleDashed, ShieldCheck } from "lucide-react";
import {
  formatSumsubEnvironment,
} from "../domain/session";
import { trimOrNull } from "../lib/records";
import type { KycSession, SetupForm } from "../types";
import {
  CompactDatum,
  EmptyState,
  PanelHeader,
} from "./primitives";

export function WebSdkPanel({
  externalUserId,
  handleSdkError,
  handleSdkMessage,
  handleTokenRefresh,
  kycUserId,
  sdkError,
  session,
  setupForm,
}: {
  externalUserId: string;
  handleSdkError: (payload: unknown) => void;
  handleSdkMessage: (eventType: string, payload: unknown) => void;
  handleTokenRefresh: () => Promise<string>;
  kycUserId: string;
  sdkError: string | null;
  session: KycSession | null;
  setupForm: SetupForm;
}) {
  return (
    <section className="panel flex min-h-[620px] flex-col gap-4">
      <PanelHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Sumsub WebSDK"
        meta={session ? `Created ${session.createdAt}` : "Waiting"}
      />
      {session ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
            <CompactDatum label="External user" value={externalUserId} />
            {kycUserId ? <CompactDatum label="KYC user" value={kycUserId} /> : null}
            <CompactDatum
              label="Applicant"
              value={session.applicantId ?? "Pending"}
            />
            <CompactDatum
              label="Environment"
              value={formatSumsubEnvironment(session.sumsubEnvironment)}
            />
            <CompactDatum
              label="Session"
              value={session.sessionId ?? "Token issued"}
            />
          </div>
          <div className="sdk-frame flex-1">
            <SumsubWebSdk
              key={session.accessToken}
              accessToken={session.accessToken}
              config={{
                email: trimOrNull(setupForm.email) ?? undefined,
                lang: "en",
                theme: "light",
              }}
              expirationHandler={handleTokenRefresh}
              onError={handleSdkError}
              onMessage={handleSdkMessage}
              options={{
                adaptIframeHeight: true,
                addViewportTag: true,
                enableScrollIntoView: true,
              }}
            />
          </div>
          {sdkError ? <p className="inline-alert danger">{sdkError}</p> : null}
        </div>
      ) : (
        <EmptyState
          icon={<CircleDashed className="h-5 w-5" />}
          title="No SDK session"
          detail="Generate an SDK link to render the WebSDK iframe."
        />
      )}
    </section>
  );
}
