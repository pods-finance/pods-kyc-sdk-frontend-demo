"use client";

import {
  extractFeeCharges,
  extractQuoteId,
  extractTransferAmount,
  extractTransferStatus,
  formatAmountWithSymbol,
  readOfframpDepositAddress,
  readPixCopyPasteCode,
  readTransactionCalldata,
  readTransactionData,
  readTransferExpiration,
} from "../domain/transfers";
import type { TransferKind } from "../types";
import { firstStringAtPath } from "../lib/records";
import { CompactDatum, CopyableValue } from "./primitives";
import { PixQrCode } from "./pix-qr-code";

export function TransferResultDetails({
  kind,
  payload,
}: {
  kind: TransferKind;
  payload: unknown;
}) {
  const quoteId = extractQuoteId(payload);
  const status = extractTransferStatus(payload);
  const inputAmount = extractTransferAmount(payload, "inputAmount");
  const outputAmount = extractTransferAmount(payload, "outputAmount");
  const inputSymbol = firstStringAtPath(payload, [
    ["quote", "tokenIn", "symbol"],
    ["paymentInstructions", "amount", "currency"],
  ]);
  const outputSymbol = firstStringAtPath(payload, [
    ["quote", "tokenOut", "symbol"],
  ]);
  const displayInputAmount = inputAmount
    ? formatAmountWithSymbol(inputAmount, inputSymbol)
    : null;
  const displayOutputAmount = outputAmount
    ? formatAmountWithSymbol(outputAmount, outputSymbol)
    : null;
  const brCode = readPixCopyPasteCode(payload);
  const expiration = readTransferExpiration(payload);
  const depositAddress = readOfframpDepositAddress(payload);
  const walletAddress = firstStringAtPath(payload, [
    ["walletAddress"],
    ["data", "walletAddress"],
    ["data", "ticket", "walletAddress"],
    ["data", "withdrawal", "walletAddress"],
    ["quote", "destinationAddress"],
    ["ticket", "walletAddress"],
    ["withdrawal", "walletAddress"],
  ]);
  const transaction = readTransactionData(payload);
  const transactionCalldata = readTransactionCalldata(payload);
  const feeCharges = extractFeeCharges(payload);

  return (
    <div className="grid gap-3 border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {quoteId ? <CopyableValue label="Quote ID" value={quoteId} /> : null}
        {status ? <CompactDatum label="Status" value={status} /> : null}
        {displayInputAmount ? (
          <CompactDatum label="Input amount" value={displayInputAmount} />
        ) : null}
        {displayOutputAmount ? (
          <CompactDatum label="Output amount" value={displayOutputAmount} />
        ) : null}
        {expiration ? <CompactDatum label="Expiration" value={expiration} /> : null}
        {walletAddress ? <CopyableValue label="Wallet" value={walletAddress} /> : null}
      </div>

      {kind === "onramp" && brCode ? (
        <div className="grid gap-3 border-t border-slate-200 pt-3">
          <PixQrCode brCode={brCode} />
          <CopyableValue label="Pix copy-paste code" multiline value={brCode} />
        </div>
      ) : null}

      {feeCharges.length > 0 ? (
        <div className="grid gap-2 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Fee breakdown
          </p>
          <ul className="grid gap-2">
            {feeCharges.map((fee) => (
              <li
                className="grid gap-1 rounded border border-slate-200 bg-white p-2"
                key={fee.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{fee.label}</span>
                  <span className="font-mono text-slate-700">{fee.amount}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                  {fee.asset ? <span>{fee.asset}</span> : null}
                  {fee.usdAmount ? <span>${fee.usdAmount}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {kind === "offramp" ? (
        <div className="grid gap-2 border-t border-slate-200 pt-3">
          {depositAddress ? (
            <CopyableValue label="USDC deposit address" value={depositAddress} />
          ) : null}
          {transaction.to ? (
            <CopyableValue label="Transaction to" value={transaction.to} />
          ) : null}
          {transaction.value ? (
            <CompactDatum label="Transaction value" value={transaction.value} />
          ) : null}
          {transactionCalldata ? (
            <CopyableValue
              label="Transaction data"
              multiline
              value={transactionCalldata}
            />
          ) : null}
          {transaction.payload ? (
            <CopyableValue
              label="Transaction payload"
              multiline
              value={transaction.payload}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
