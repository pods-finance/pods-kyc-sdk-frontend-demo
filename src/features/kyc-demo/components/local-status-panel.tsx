"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { StatusTone } from "../domain/status";
import { pollIntervalMs } from "../constants";
import type { RequestPhase } from "../types";
import { PanelHeader, StatusPill } from "./primitives";

export function LocalStatusPanel({
  canPollStatus,
  isPollingEnabled,
  lastCheckedAt,
  refreshStatus,
  setIsPollingEnabled,
  statusDetail,
  statusError,
  statusLabel,
  statusPhase,
  statusTone,
}: {
  canPollStatus: boolean;
  isPollingEnabled: boolean;
  lastCheckedAt: string | null;
  refreshStatus: (mode?: "manual" | "silent") => Promise<void>;
  setIsPollingEnabled: (value: boolean) => void;
  statusDetail: string;
  statusError: string | null;
  statusLabel: string;
  statusPhase: RequestPhase;
  statusTone: StatusTone;
}) {
  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<RefreshCw className="h-4 w-4" />}
        title="Local status"
        meta={lastCheckedAt ?? "Not checked"}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusPill label={statusLabel} tone={statusTone} />
          <p className="mt-2 text-sm text-slate-600">{statusDetail}</p>
        </div>
        {statusPhase === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={isPollingEnabled}
            className="h-4 w-4 accent-slate-900"
            disabled={!canPollStatus}
            onChange={(event) => setIsPollingEnabled(event.currentTarget.checked)}
            type="checkbox"
          />
          Auto-refresh
        </label>
        <button
          className="secondary-button"
          disabled={!canPollStatus || statusPhase === "loading"}
          onClick={() => void refreshStatus("manual")}
          title="Refresh status"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      {statusError ? <p className="inline-alert danger">{statusError}</p> : null}
      <p className="text-xs text-slate-500">
        Polls every {pollIntervalMs / 1000}s after a session is created.
      </p>
    </section>
  );
}
