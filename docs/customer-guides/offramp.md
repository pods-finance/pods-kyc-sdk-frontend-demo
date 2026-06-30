# USDC Base to BRL Pix Offramp Guide

This guide shows how to generate a USDC Base offramp quote and the deposit
address/transaction data needed to pay BRL through Pix.

The current route is fixed to:

```text
USDC Base -> BRL Pix
```

Do not expose the Pods API key in the browser. Your backend should call Pods and
return only the quote/deposit data your frontend needs.

## Preconditions

- The user completed KYC through the [KYC guide](kyc.md).
- Pods KYC status is `approved`.
- The wallet address used as `originAddress` matches the approved KYC profile.
- You collected the user's Pix key for the BRL payout.
- You have a server-side `PODS_API_KEY`.

## Step 1: Create the Offramp Quote

Your backend calls Pods:

```http
GET /v2/swap/quote
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Required query parameters:

```text
originChain=base
destinationChain=fiat
tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
tokenOut=BRL
amountIn=1000000
originAddress=0x0000000000000000000000000000000000000001
```

Parameter notes:

- `amountIn` is USDC raw units. For example, `1000000` means `1 USDC`.
- `originAddress` is the approved EVM wallet that sends USDC on Base.
- `tokenIn` is fixed to USDC on Base for this demo.

Example URL:

```text
GET /v2/swap/quote?originChain=base&destinationChain=fiat&tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=BRL&amountIn=1000000&originAddress=0x0000000000000000000000000000000000000001
```

Save the returned `quoteId`.

## Step 2: Generate the Deposit Address or Transaction Payload

After receiving the quote, your backend calls:

```http
POST /v2/swap/bytecode
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
Content-Type: application/json
```

Request body:

```json
{
  "quoteId": "QUOTE_ID",
  "originAddress": "0x0000000000000000000000000000000000000001",
  "pixKey": "USER_PIX_KEY",
  "destinationAddress": "USER_PIX_KEY"
}
```

Field notes:

- `quoteId`: quote id from step 1.
- `originAddress`: approved wallet that sends USDC on Base.
- `pixKey`: user's Pix key for the BRL payout.
- `destinationAddress`: same Pix key for the current Pix payout integration.

Important terminology:

- In this flow, `depositAddress` means the address where the user sends USDC on
  Base at the beginning of the offramp execution.
- It is not the user's destination wallet. The destination is BRL Pix.

## Response Fields to Use

The bytecode response can include:

```json
{
  "quoteId": "QUOTE_ID",
  "depositAddress": "0xDepositAddressForUSDC",
  "transaction": {
    "to": "0xContractOrDepositAddress",
    "data": "0x...",
    "value": "0"
  }
}
```

Your frontend should display:

- `depositAddress`: where the user should send USDC on Base.
- `transaction.to`, `transaction.data`, `transaction.value`: transaction data
  if the backend returns an on-chain payload.
- `quoteId`: quote id for support/status lookup.
- Fee breakdown and expected BRL output from the quote response when available.

The demo response readers are in:

- `src/features/kyc-demo/domain/transfers.ts`
- `src/features/kyc-demo/components/transfer-result-details.tsx`

## Step 3: User Sends USDC on Base

The user sends USDC on Base from `originAddress` to the returned
`depositAddress`, or executes the returned transaction payload if your frontend
supports wallet transaction execution.

After the transfer is detected, the provider continues the BRL Pix payout.

## Status Tracking

After creating a quote or deposit address, you can check status:

```http
GET /v2/swap/status/QUOTE_ID
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Display provider/status updates to the user, especially when the payout is
processing, paid, failed, or expired.

## Implementation Notes

- Keep this route as USDC Base -> BRL Pix. Do not implement it as BRLA -> BRL.
- Validate Pix key presence before calling `/v2/swap/bytecode`.
- Keep `originChain`, `destinationChain`, `tokenIn`, and `tokenOut` fixed unless
  Pods explicitly enables more routes for your integration.
- Store `quoteId` for support and status tracking.
