"use client";

import { AlertCircle, CircleDashed } from "lucide-react";
import type { SdkEvent } from "../types";
import { EmptyState, PanelHeader } from "./primitives";

export function SdkEventsPanel({ sdkEvents }: { sdkEvents: SdkEvent[] }) {
  return (
    <section className="panel flex flex-col gap-4">
      <PanelHeader
        icon={<AlertCircle className="h-4 w-4" />}
        title="SDK events"
        meta={`${sdkEvents.length} shown`}
      />
      {sdkEvents.length > 0 ? (
        <ul className="divide-y divide-slate-200 text-sm">
          {sdkEvents.map((event) => (
            <li className="grid grid-cols-[1fr_auto] gap-3 py-2" key={event.id}>
              <span className="min-w-0 truncate font-medium text-slate-800">
                {event.label}
              </span>
              <span className="text-xs text-slate-500">{event.createdAt}</span>
              <span className="col-span-2 text-xs text-slate-500">
                {event.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<CircleDashed className="h-5 w-5" />}
          title="No SDK events"
          detail="Events appear here after the WebSDK initializes."
        />
      )}
    </section>
  );
}
