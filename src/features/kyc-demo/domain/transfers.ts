import { demoSwapWebhookUrl, transferChains } from "../constants";
import type { TransferChain, TransferKind } from "../types";
import {
  firstJsonStringAtPath,
  firstNumberAtPath,
  firstStringAtPath,
  isRecord,
  readPath,
} from "../lib/records";

export type FeeCharge = {
  amount: string;
  asset: string | null;
  id: string;
  label: string;
  usdAmount: string | null;
};

export function buildQuery(
  path: string,
  params: Record<string, string>,
): string {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

export function buildTransferQuoteParams(
  kind: TransferKind,
  amountIn: string,
  walletAddress: string,
  chain: TransferChain,
): Record<string, string> {
  if (kind === "onramp") {
    const destination = transferChains[chain];

    const params = {
      amountIn,
      destinationAddress: walletAddress,
      destinationChain: chain,
      originChain: "fiat",
      tokenIn: "BRL",
      tokenOut: destination.usdcTokenAddress,
    };

    return addWebhookUrl(params);
  }

  const source = transferChains[chain];

  const params = {
    amountIn,
    destinationChain: "fiat",
    originAddress: walletAddress,
    originChain: chain,
    tokenIn: source.usdcTokenAddress,
    tokenOut: "BRL",
  };

  return addWebhookUrl(params);
}

function addWebhookUrl(
  params: Record<string, string>,
): Record<string, string> {
  if (!demoSwapWebhookUrl) {
    return params;
  }

  return {
    ...params,
    webhookURL: demoSwapWebhookUrl,
  };
}

export function buildOfframpBytecodeBody({
  pixKey,
  quoteId,
  walletAddress,
}: {
  pixKey: string;
  quoteId: string;
  walletAddress: string;
}): Record<string, string> {
  return {
    destinationAddress: pixKey,
    originAddress: walletAddress,
    pixKey,
    quoteId,
  };
}

export function buildTransferBytecodeBody({
  kind,
  pixKey,
  quoteId,
  walletAddress,
}: {
  kind: TransferKind;
  pixKey?: string;
  quoteId: string;
  walletAddress: string;
}): Record<string, string> {
  if (kind === "offramp") {
    return buildOfframpBytecodeBody({
      pixKey: pixKey ?? "",
      quoteId,
      walletAddress,
    });
  }

  return {
    destinationAddress: walletAddress,
    originAddress: walletAddress,
    quoteId,
  };
}

export function extractQuoteId(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["quoteId"],
    ["id"],
    ["data", "quoteId"],
    ["data", "id"],
    ["quote", "quoteId"],
    ["quote", "id"],
  ]);
}

export function extractTransferStatus(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["status"],
    ["data", "status"],
    ["data", "ticket", "status"],
    ["data", "withdrawal", "status"],
    ["quote", "status"],
    ["ticket", "status"],
    ["withdrawal", "status"],
  ]);
}

export function extractTransferAmount(
  value: unknown,
  field: "inputAmount" | "outputAmount",
): string | null {
  const paths: readonly (readonly string[])[] = [
    [field],
    ["data", field],
    ["data", "ticket", field],
    ["data", "withdrawal", field],
    ["ticket", field],
    ["withdrawal", field],
    ["data", "quote", field],
    ["quote", field],
  ];
  const quotePaths: readonly (readonly string[])[] =
    field === "inputAmount"
      ? [
          ["quote", "tokenIn", "amount"],
          ["paymentInstructions", "amount", "amountRaw"],
        ]
      : [
          ["quote", "tokenOut", "expectedAmountOut"],
          ["quote", "tokenOut", "amount"],
          ["quote", "tokenOut", "minAmountOut"],
        ];
  const allPaths = [...paths, ...quotePaths];
  const stringAmount = firstStringAtPath(value, allPaths);
  const numberAmount = firstNumberAtPath(value, allPaths);

  return stringAmount ?? (numberAmount === null ? null : String(numberAmount));
}

export function formatAmountWithSymbol(
  amount: string,
  symbol: string | null,
): string {
  if (!symbol) {
    return amount;
  }

  return `${amount} ${symbol}`;
}

export function extractFeeCharges(value: unknown): FeeCharge[] {
  const charges = readPath(value, ["quote", "feeBreakdown", "charges"]);

  if (!Array.isArray(charges)) {
    return [];
  }

  return charges.flatMap((charge, index) => {
    if (!isRecord(charge)) {
      return [];
    }

    const amountRaw =
      typeof charge.amountRaw === "string" ? charge.amountRaw : null;
    const label = typeof charge.label === "string" ? charge.label : null;
    const symbol = typeof charge.symbol === "string" ? charge.symbol : null;

    if (!amountRaw || !label) {
      return [];
    }

    const asset = typeof charge.asset === "string" ? charge.asset : null;
    const kind = typeof charge.kind === "string" ? charge.kind : `fee-${index}`;
    const usdAmount =
      typeof charge.amountInUSD === "number"
        ? charge.amountInUSD.toFixed(6)
        : null;

    return [
      {
        amount: formatAmountWithSymbol(amountRaw, symbol),
        asset,
        id: kind,
        label,
        usdAmount,
      },
    ];
  });
}

export function readPixCopyPasteCode(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["brCode"],
    ["data", "brCode"],
    ["data", "ticket", "brCode"],
    ["paymentInstructions", "pix", "copyPaste"],
    ["ticket", "brCode"],
  ]);
}

export function readTransferExpiration(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["expiration"],
    ["expiresAt"],
    ["data", "expiration"],
    ["data", "expiresAt"],
    ["data", "ticket", "expiration"],
    ["data", "withdrawal", "expiresAt"],
    ["paymentInstructions", "expiresAt"],
    ["quote", "deadlineDate"],
    ["ticket", "expiration"],
    ["withdrawal", "expiresAt"],
  ]);
}

export function readOfframpDepositAddress(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["depositAddress"],
    ["data", "depositAddress"],
    ["data", "withdrawal", "depositAddress"],
    ["withdrawal", "depositAddress"],
  ]);
}

export function readTransactionData(value: unknown): {
  payload: string | null;
  to: string | null;
  value: string | null;
} {
  return {
    payload: firstJsonStringAtPath(value, [
      ["transactionData"],
      ["data", "transactionData"],
    ]),
    to: firstStringAtPath(value, [
      ["to"],
      ["tx", "to"],
      ["data", "to"],
      ["data", "tx", "to"],
      ["transaction", "to"],
      ["data", "transaction", "to"],
    ]),
    value: firstStringAtPath(value, [
      ["value"],
      ["tx", "value"],
      ["data", "value"],
      ["data", "tx", "value"],
      ["transaction", "value"],
      ["data", "transaction", "value"],
    ]),
  };
}

export function readTransactionCalldata(value: unknown): string | null {
  return firstStringAtPath(value, [
    ["data"],
    ["calldata"],
    ["bytecode"],
    ["tx", "data"],
    ["data", "data"],
    ["data", "calldata"],
    ["data", "bytecode"],
    ["data", "tx", "data"],
    ["transaction", "data"],
    ["data", "transaction", "data"],
  ]);
}
