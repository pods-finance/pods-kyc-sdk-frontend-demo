import { DEMO_ENDPOINTS } from "./domain/status";
import type {
  SetupForm,
  TransferChain,
  TransferForm,
  TransferKind,
} from "./types";

export const initialSetupForm: SetupForm = {
  email: "",
  externalUserId: "",
  walletAddress: "",
};

export const initialOfframpTransferForm: TransferForm = {
  amount: "1",
  chain: "base",
  pixKey: "",
};

export const initialOnrampTransferForm: TransferForm = {
  amount: "10",
  chain: "base",
  pixKey: "",
};

export const USDC_BASE_TOKEN_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_MONAD_TOKEN_ADDRESS =
  "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

export const transferChains: Record<
  TransferChain,
  { label: string; usdcTokenAddress: string }
> = {
  base: {
    label: "Base",
    usdcTokenAddress: USDC_BASE_TOKEN_ADDRESS,
  },
  monad: {
    label: "Monad",
    usdcTokenAddress: USDC_MONAD_TOKEN_ADDRESS,
  },
};

export const supportedTransferChains: readonly TransferChain[] = [
  "base",
  "monad",
];

export const demoSwapWebhookUrl =
  process.env.NEXT_PUBLIC_DEMO_SWAP_WEBHOOK_URL?.trim() || null;

export const transferEndpoints: Record<TransferKind, string> = {
  onramp: DEMO_ENDPOINTS.swapQuote,
  offramp: DEMO_ENDPOINTS.swapQuote,
};

export function getTransferLabel(kind: TransferKind, chain: TransferChain): string {
  if (kind === "onramp") {
    return `Pix BRL -> USDC ${transferChains[chain].label}`;
  }

  return `USDC ${transferChains[chain].label} -> BRL Pix`;
}

export function getTransferDescription(
  kind: TransferKind,
  chain: TransferChain,
): string {
  if (kind === "onramp") {
    return `Generate a Pix BRL payment quote that settles USDC on ${transferChains[chain].label}.`;
  }

  return `Generate a quote and deposit address for USDC on ${transferChains[chain].label} into BRL Pix.`;
}

export const demoStateStorageKey = "pods-kyc-demo-state-v1";
export const pollIntervalMs = 8000;
