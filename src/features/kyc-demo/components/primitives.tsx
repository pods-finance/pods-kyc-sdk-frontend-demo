"use client";

import { Check, Copy } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import type { StatusTone } from "../domain/status";
import type { RequestPhase } from "../types";

export function PanelHeader({
  icon,
  meta,
  title,
}: {
  icon: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-subtle)] bg-white text-[var(--fg-secondary)]">
          {icon}
        </span>
        <h2 className="truncate text-sm font-semibold uppercase tracking-normal text-[var(--fg-primary)]">
          {title}
        </h2>
      </div>
      <span className="shrink-0 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-1 text-xs font-medium text-[var(--fg-secondary)]">
        {meta}
      </span>
    </div>
  );
}

export function Field({
  autoComplete = "off",
  inputMode,
  label,
  min,
  name,
  onChange,
  placeholder,
  required = false,
  step,
  type = "text",
  value,
}: {
  autoComplete?: string;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  min?: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-center gap-2 font-medium text-[var(--fg-primary)]">
        {label}
        {required ? (
          <span className="rounded-full bg-[var(--caregiver-100)] px-2 py-0.5 text-[10px] font-semibold text-[var(--caregiver-700)]">
            Required
          </span>
        ) : null}
      </span>
      <input
        autoComplete={autoComplete}
        className="text-field"
        inputMode={inputMode}
        min={min}
        name={name}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

export function OperationMessage({
  error,
  idle,
  phase,
  success,
}: {
  error: string | null;
  idle: string;
  phase: RequestPhase;
  success: string;
}) {
  if (phase === "error" && error) {
    return <p className="inline-alert danger">{error}</p>;
  }

  if (phase === "success") {
    return <p className="inline-alert success">{success}</p>;
  }

  if (phase === "loading") {
    return <p className="inline-alert neutral">Request in progress.</p>;
  }

  if (!idle) {
    return null;
  }

  return <p className="inline-alert neutral">{idle}</p>;
}

export function EmptyState({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="empty-state">
      <span className="text-[var(--fg-muted)]">{icon}</span>
      <div>
        <p className="font-medium text-[var(--fg-primary)]">{title}</p>
        <p className="mt-1 text-sm text-[var(--fg-secondary)]">{detail}</p>
      </div>
    </div>
  );
}

export function CompactDatum({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-xs text-[var(--fg-primary)]">
        {value}
      </p>
    </div>
  );
}

export function CopyableValue({
  label,
  multiline = false,
  value,
}: {
  label: string;
  multiline?: boolean;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[var(--border-subtle)] bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-normal text-[var(--fg-muted)]">
          {label}
        </p>
        <button
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--fg-secondary)] hover:bg-[var(--gray-100)]"
          onClick={() => void copy()}
          title={`Copy ${label}`}
          type="button"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <p
        className={
          multiline
            ? "mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-slate-700"
            : "mt-1 break-all font-mono text-xs text-slate-700"
        }
      >
        {value}
      </p>
    </div>
  );
}
