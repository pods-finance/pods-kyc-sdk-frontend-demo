import { describe, expect, it } from "vitest";
import { USDC_BASE_TOKEN_ADDRESS } from "../constants";
import {
  buildOfframpBytecodeBody,
  buildQuery,
  buildTransferQuoteParams,
  extractFeeCharges,
  extractQuoteId,
  extractTransferAmount,
  readOfframpDepositAddress,
  readPixCopyPasteCode,
  readTransactionCalldata,
  readTransferExpiration,
} from "./transfers";

const walletAddress = "0x0000000000000000000000000000000000000001";

describe("buildTransferQuoteParams", () => {
  it("builds fixed Pix BRL to USDC Base onramp quote params", () => {
    expect(buildTransferQuoteParams("onramp", "1000", walletAddress)).toEqual({
      amountIn: "1000",
      destinationAddress: walletAddress,
      destinationChain: "base",
      originChain: "fiat",
      tokenIn: "BRL",
      tokenOut: USDC_BASE_TOKEN_ADDRESS,
    });
  });

  it("builds fixed USDC Base to BRL Pix offramp quote params", () => {
    expect(buildTransferQuoteParams("offramp", "1000000", walletAddress)).toEqual({
      amountIn: "1000000",
      destinationChain: "fiat",
      originAddress: walletAddress,
      originChain: "base",
      tokenIn: USDC_BASE_TOKEN_ADDRESS,
      tokenOut: "BRL",
    });
  });

  it("preserves quote query params", () => {
    expect(
      buildQuery("/v2/swap/quote", {
        amountIn: "1000",
        destinationAddress: walletAddress,
        originChain: "fiat",
      }),
    ).toBe(
      "/v2/swap/quote?amountIn=1000&destinationAddress=0x0000000000000000000000000000000000000001&originChain=fiat",
    );
  });
});

describe("buildOfframpBytecodeBody", () => {
  it("builds the Pix payout transaction body expected by Swap v2", () => {
    expect(
      buildOfframpBytecodeBody({
        pixKey: "47567512882",
        quoteId: "quote-1",
        walletAddress,
      }),
    ).toEqual({
      destinationAddress: "47567512882",
      originAddress: walletAddress,
      pixKey: "47567512882",
      quoteId: "quote-1",
    });
  });
});

describe("transfer response readers", () => {
  it("reads quote, Pix code, expiration, amounts, and fees from onramp responses", () => {
    const payload = {
      paymentInstructions: {
        amount: { amountRaw: "1000", currency: "BRL" },
        expiresAt: "2026-06-30T12:00:00.000Z",
        pix: { copyPaste: "pix-copy-paste" },
      },
      quote: {
        feeBreakdown: {
          charges: [
            {
              amountInUSD: 0.14,
              amountRaw: "77",
              asset: "tokenIn",
              kind: "paymentRail",
              label: "Pix fee",
              symbol: "BRL",
            },
          ],
        },
        quoteId: "quote-onramp",
        tokenOut: {
          amount: "1768913",
          symbol: "USDC",
        },
      },
    };

    expect(extractQuoteId(payload)).toBe("quote-onramp");
    expect(readPixCopyPasteCode(payload)).toBe("pix-copy-paste");
    expect(readTransferExpiration(payload)).toBe("2026-06-30T12:00:00.000Z");
    expect(extractTransferAmount(payload, "inputAmount")).toBe("1000");
    expect(extractTransferAmount(payload, "outputAmount")).toBe("1768913");
    expect(extractFeeCharges(payload)).toEqual([
      {
        amount: "77 BRL",
        asset: "tokenIn",
        id: "paymentRail",
        label: "Pix fee",
        usdAmount: "0.140000",
      },
    ]);
  });

  it("reads deposit address and calldata from offramp bytecode responses", () => {
    const payload = {
      data: {
        depositAddress: "0x1111111111111111111111111111111111111111",
        transaction: {
          data: "0xabcdef",
        },
      },
    };

    expect(readOfframpDepositAddress(payload)).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(readTransactionCalldata(payload)).toBe("0xabcdef");
  });
});
