import { DEMO_ENDPOINTS } from "./domain/status";
import type { SetupForm, TransferForm, TransferKind } from "./types";

export const initialSetupForm: SetupForm = {
  email: "",
  externalUserId: "",
  walletAddress: "",
};

export const initialTransferForm: TransferForm = {
  amountBrl: "1000000",
  pixKey: "",
};

export const initialOnrampTransferForm: TransferForm = {
  ...initialTransferForm,
  amountBrl: "10",
};

export const USDC_BASE_TOKEN_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const transferEndpoints: Record<TransferKind, string> = {
  onramp: DEMO_ENDPOINTS.swapQuote,
  offramp: DEMO_ENDPOINTS.swapQuote,
};

export const transferLabels: Record<TransferKind, string> = {
  onramp: "Pix BRL -> USDC Base",
  offramp: "USDC Base -> BRL Pix",
};

export const transferDescriptions: Record<TransferKind, string> = {
  onramp: "Generate a Pix BRL payment quote that settles USDC on Base.",
  offramp:
    "Generate a quote and deposit address for USDC on Base into BRL Pix.",
};

export const demoStateStorageKey = "pods-kyc-demo-state-v1";
export const pollIntervalMs = 8000;
