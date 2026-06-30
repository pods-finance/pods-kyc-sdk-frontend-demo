"use client";

import { Link2 } from "lucide-react";
import { CompactDatum, PanelHeader } from "./primitives";

export function WebhookPanel({ webhookTarget }: { webhookTarget: string }) {
  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<Link2 className="h-4 w-4" />}
        title="Customer webhook"
        meta="Customer simulator"
      />
      <p className="text-sm text-slate-600">
        Point Sumsub to this path through your public tunnel.
      </p>
      <CompactDatum label="Target path" value={webhookTarget} />
      <div className="grid gap-2 text-xs text-slate-600">
        <CompactDatum label="Webhook type" value="applicantReviewed" />
        <CompactDatum label="Signature" value="HMAC_SHA256_HEX" />
      </div>
      <p className="text-xs text-slate-500">
        This demo endpoint verifies Sumsub, generates the Avenia share token,
        then calls the Pods API.
      </p>
    </section>
  );
}
