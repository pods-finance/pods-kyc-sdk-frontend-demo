# Pix BRL to USDC Base Onramp Guide

This guide shows how to generate a Pix payment quote that settles USDC on Base
into an approved user wallet.

The current route is fixed to:

```text
Pix BRL -> USDC Base
```

Do not expose the Pods API key in the browser. Your backend should call Pods and
return only the quote/payment data your frontend needs.

## Preconditions

- The user completed KYC through the [KYC guide](kyc.md).
- Pods KYC status is `approved`.
- The wallet address used in the request matches the approved KYC profile.
- You have a server-side `PODS_API_KEY`.

## Request

Your backend calls Pods:

```http
GET /v2/swap/quote
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Required query parameters:

```text
originChain=fiat
destinationChain=base
tokenIn=BRL
tokenOut=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
amountIn=1000
destinationAddress=0x0000000000000000000000000000000000000001
```

Parameter notes:

- `amountIn` is BRL minor units. For example, `1000` means BRL `10.00`.
- `destinationAddress` is the approved EVM wallet that receives USDC on Base.
- `tokenOut` is fixed to USDC on Base for this demo.

Example URL:

```text
GET /v2/swap/quote?originChain=fiat&destinationChain=base&tokenIn=BRL&tokenOut=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&amountIn=1000&destinationAddress=0x0000000000000000000000000000000000000001
```

## Response Fields to Use

The quote response can include:

```json
{
  "quote": {
    "quoteId": "QUOTE_ID",
    "originChain": "fiat",
    "destinationChain": "base",
    "tokenIn": {
      "symbol": "BRL",
      "decimals": 2,
      "amount": "1000"
    },
    "tokenOut": {
      "symbol": "USDC",
      "decimals": 6,
      "amount": "1768913",
      "expectedAmountOut": "1768913",
      "chainId": 8453
    },
    "status": "pending",
    "feeBreakdown": {
      "charges": []
    }
  },
  "paymentInstructions": {
    "pix": {
      "copyPaste": "PIX_COPY_PASTE_CODE"
    },
    "expiresAt": "2026-06-25T15:31:33.110Z"
  }
}
```

Your frontend should display:

- `paymentInstructions.pix.copyPaste`: Pix copy-paste code.
- `paymentInstructions.expiresAt`: Pix expiration.
- `quote.quoteId`: quote id for support/status lookup.
- `quote.tokenOut.expectedAmountOut` or `quote.tokenOut.amount`: expected USDC.
- `quote.feeBreakdown.charges`: fee details.

The demo response readers are in:

- `src/features/kyc-demo/domain/transfers.ts`
- `src/features/kyc-demo/components/transfer-result-details.tsx`

## Status Tracking

After creating a quote, you can check status:

```http
GET /v2/swap/status/QUOTE_ID
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Display provider/status updates to the user, especially when the Pix payment is
pending, paid, failed, or expired.

## Implementation Notes

- Convert user-entered BRL display amounts to minor units before calling Pods.
- Keep `originChain`, `destinationChain`, `tokenIn`, and `tokenOut` fixed unless
  Pods explicitly enables more routes for your integration.
- Do not ask users to choose the output payment method; this route is fixed to
  USDC on Base.
