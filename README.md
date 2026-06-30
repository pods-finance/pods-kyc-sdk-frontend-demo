# Pods KYC Demo

Customer-shareable Next.js demo for the Pods KYC flow with Sumsub reusable KYC
and Swap v2 Pix money movement.

The app is intentionally small and explicit. It lets a customer see how their
backend should:

- generate a Sumsub WebSDK session;
- receive or poll for an approved Sumsub applicant;
- generate a fresh Sumsub share token for Avenia;
- submit the share token to Pods;
- call Pods Swap v2 for Pix BRL -> USDC Base onramp;
- call Pods Swap v2 for USDC Base -> BRL Pix offramp.

The current demo backend is:

```text
https://deframe-picn-papais-brl-brpga0.herokuapp.com
```

## Local Setup

```bash
cd pods-kyc-sdk-frontend-demo
cp .env.example .env.local
npm install
npm run dev -- -p 3000
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Use `.env.local` for real credentials. Do not commit `.env.local` or any copied
credential backup.

```env
NEXT_PUBLIC_API_BASE_URL="https://deframe-picn-papais-brl-brpga0.herokuapp.com"

PODS_KYC_API_BASE_URL="https://deframe-picn-papais-brl-brpga0.herokuapp.com"
PODS_KYC_API_KEY="change-me"

SUMSUB_API_BASE_URL="https://api.sumsub.com"
SUMSUB_ENVIRONMENT="production"
SUMSUB_APP_TOKEN="change-me"
SUMSUB_SECRET_KEY="change-me"
SUMSUB_LEVEL_NAME="pods-kyc-level"
SUMSUB_WEBHOOK_SECRET="change-me"
SUMSUB_WEBHOOK_SECRETS=""

AVENIA_FOR_CLIENT_ID="brla.digital_101963"
```

Optional sandbox variables are supported when `SUMSUB_ENVIRONMENT=sandbox`:

```env
SUMSUB_SANDBOX_APP_TOKEN="change-me"
SUMSUB_SANDBOX_SECRET_KEY="change-me"
SUMSUB_SANDBOX_WEBHOOK_SECRET="change-me"
```

Optional production-specific variables are supported when you want both sandbox
and production values in the same local file:

```env
SUMSUB_PRODUCTION_APP_TOKEN="change-me"
SUMSUB_PRODUCTION_SECRET_KEY="change-me"
```

## Architecture

The UI lives under `src/features/kyc-demo` and is split by responsibility:

- `components/`: small UI panels and display components.
- `domain/`: pure KYC, status, and transfer helpers.
- `hooks/`: KYC/session/status state and money movement state.
- `lib/`: API, local persistence, formatting, and record readers.
- `types.ts`: shared feature types.
- `constants.ts`: fixed demo constants such as USDC on Base and endpoint names.

`src/app/page.tsx` only renders the demo console. The API routes under
`src/app/api/demo` simulate the customer backend during local demos.

## Customer Integration Guides

Use these guides when implementing the same flow inside a customer codebase:

- [KYC and Sumsub share token](docs/customer-guides/kyc.md)
- [Pix BRL to USDC Base onramp](docs/customer-guides/onramp.md)
- [USDC Base to BRL Pix offramp](docs/customer-guides/offramp.md)

They are intentionally generic: no local machine paths, no real credentials,
and no assumptions about the customer's frontend framework.

## Code Map

Line numbers below point to the current repository shape and should be refreshed
if the files move.

### KYC and Sumsub Share Token

- UI composition starts in
  [src/features/kyc-demo/components/pods-kyc-demo-console.tsx:23](src/features/kyc-demo/components/pods-kyc-demo-console.tsx#L23).
- The SDK setup, WebSDK frame, and status panels are wired in
  [src/features/kyc-demo/components/pods-kyc-demo-console.tsx:69](src/features/kyc-demo/components/pods-kyc-demo-console.tsx#L69).
- KYC state, SDK session creation, status polling, and local restore live in
  [src/features/kyc-demo/hooks/use-kyc-flow.ts:58](src/features/kyc-demo/hooks/use-kyc-flow.ts#L58).
- The SDK session request body is built in
  [src/features/kyc-demo/domain/kyc-flow.ts:71](src/features/kyc-demo/domain/kyc-flow.ts#L71).
- The demo backend validates `email` and `walletAddress`, creates the Sumsub SDK
  token, and stores local metadata in
  [src/app/api/demo/kyc-session/route.ts:80](src/app/api/demo/kyc-session/route.ts#L80).
- KYC status polling runs through
  [src/features/kyc-demo/hooks/use-kyc-flow.ts:248](src/features/kyc-demo/hooks/use-kyc-flow.ts#L248).
- Sumsub `GREEN` is checked in
  [src/lib/customer-simulator/webhook.ts:91](src/lib/customer-simulator/webhook.ts#L91).
  The condition is `type=applicantReviewed`, `reviewStatus=completed`, and
  `reviewResult.reviewAnswer=GREEN`.
- Approved/rejected provider statuses are normalized in
  [src/features/kyc-demo/domain/status.ts:140](src/features/kyc-demo/domain/status.ts#L140).
- Money movement is unlocked only when the normalized status is `approved` in
  [src/features/kyc-demo/domain/status.ts:166](src/features/kyc-demo/domain/status.ts#L166).
- The Sumsub webhook handler generates the share token and submits it to Pods in
  [src/app/api/customer-webhooks/sumsub/route.ts:143-165](src/app/api/customer-webhooks/sumsub/route.ts#L143-L165).

### Pix BRL -> USDC Base Onramp

- The onramp card is mounted in
  [src/features/kyc-demo/components/pods-kyc-demo-console.tsx:113](src/features/kyc-demo/components/pods-kyc-demo-console.tsx#L113).
- The shared money movement card UI lives in
  [src/features/kyc-demo/components/money-movement-panel.tsx:22](src/features/kyc-demo/components/money-movement-panel.tsx#L22).
- Onramp validation and quote submission start in
  [src/features/kyc-demo/hooks/use-money-movement.ts:103](src/features/kyc-demo/hooks/use-money-movement.ts#L103).
- Onramp query params are built in
  [src/features/kyc-demo/domain/transfers.ts:27](src/features/kyc-demo/domain/transfers.ts#L27).
- The Swap v2 quote request is sent from
  [src/features/kyc-demo/hooks/use-money-movement.ts:153](src/features/kyc-demo/hooks/use-money-movement.ts#L153).
- Pix copy-paste, QR code, quote ID, output amount, expiration, and fee
  breakdown are rendered in
  [src/features/kyc-demo/components/transfer-result-details.tsx:27](src/features/kyc-demo/components/transfer-result-details.tsx#L27).

### USDC Base -> BRL Pix Offramp

- The offramp card is mounted in
  [src/features/kyc-demo/components/pods-kyc-demo-console.tsx:124](src/features/kyc-demo/components/pods-kyc-demo-console.tsx#L124).
- The Pix key field is rendered in
  [src/features/kyc-demo/components/money-movement-panel.tsx:80](src/features/kyc-demo/components/money-movement-panel.tsx#L80).
- Offramp validation, quote submission, and deposit-address generation start in
  [src/features/kyc-demo/hooks/use-money-movement.ts:103](src/features/kyc-demo/hooks/use-money-movement.ts#L103).
- The required Pix key check for offramp is in
  [src/features/kyc-demo/hooks/use-money-movement.ts:136](src/features/kyc-demo/hooks/use-money-movement.ts#L136).
- Offramp quote params are built in
  [src/features/kyc-demo/domain/transfers.ts:43](src/features/kyc-demo/domain/transfers.ts#L43).
- After the quote, the demo calls `POST /v2/swap/bytecode` in
  [src/features/kyc-demo/hooks/use-money-movement.ts:169](src/features/kyc-demo/hooks/use-money-movement.ts#L169).
- The bytecode/deposit-address request body is built in
  [src/features/kyc-demo/domain/transfers.ts:53](src/features/kyc-demo/domain/transfers.ts#L53)
  and routed through
  [src/features/kyc-demo/domain/transfers.ts:70](src/features/kyc-demo/domain/transfers.ts#L70).
- The USDC deposit address and transaction payload are rendered in
  [src/features/kyc-demo/components/transfer-result-details.tsx:107](src/features/kyc-demo/components/transfer-result-details.tsx#L107).

### Pods API Proxy

- Browser-side API calls decide whether to go through the server proxy in
  [src/features/kyc-demo/lib/api.ts:8](src/features/kyc-demo/lib/api.ts#L8).
- The browser sends proxied Pods calls to `/api/demo/pods` in
  [src/features/kyc-demo/lib/api.ts:30](src/features/kyc-demo/lib/api.ts#L30).
- The Next.js proxy allowlist is in
  [src/app/api/demo/pods/route.ts:34](src/app/api/demo/pods/route.ts#L34).
- The proxy attaches `PODS_KYC_API_KEY` server-side and forwards the request in
  [src/app/api/demo/pods/route.ts:52](src/app/api/demo/pods/route.ts#L52).

## Server-Side Proxy

The browser never receives `PODS_KYC_API_KEY`.

Browser requests for Pods API calls go through:

```text
POST /api/demo/pods
```

The Next.js route validates the requested path, attaches `PODS_KYC_API_KEY`
server-side, and forwards only supported routes:

- `GET /v2/swap/quote`
- `POST /v2/swap/bytecode`
- `GET /v2/swap/status/{quoteId}`

This is a demo proxy. Production customers should implement the same rule in
their backend: keep API keys server-side.

## KYC Flow

1. Fill email and wallet address.
2. Click **Generate SDK link**.
3. Complete Sumsub WebSDK.
4. When the applicant is GREEN, the customer backend generates a fresh Sumsub
   share token for Avenia.
5. The customer backend sends the share token to Pods:

```text
POST /api/v1/kyc/sumsub-share-token
```

The demo's Sumsub webhook route can automate steps 4 and 5:

```text
POST /api/customer-webhooks/sumsub
```

## Money Movement Flow

### Pix BRL -> USDC Base

The onramp card calls:

```text
GET /v2/swap/quote
```

with:

```text
originChain=fiat
destinationChain=base
tokenIn=BRL
tokenOut=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
amountIn=<BRL minor units>
destinationAddress=<approved wallet>
```

The response displays the Pix copy-paste code, quote ID, expiration, USDC output,
and fee breakdown.

### USDC Base -> BRL Pix

The offramp card first calls:

```text
GET /v2/swap/quote
```

with:

```text
originChain=base
destinationChain=fiat
tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
tokenOut=BRL
amountIn=<USDC raw units>
originAddress=<approved wallet>
```

Then it calls:

```text
POST /v2/swap/bytecode
```

with:

```json
{
  "quoteId": "QUOTE_ID",
  "originAddress": "0xApprovedWallet",
  "pixKey": "PIX_KEY",
  "destinationAddress": "PIX_KEY"
}
```

The response displays the USDC deposit address or transaction data returned by
the backend. After the user sends USDC on Base as instructed, the backend
continues the BRL Pix payout flow.

## Tests

```bash
npm test
npm run lint
npx tsc --noEmit
```

The helper tests cover status normalization, amount conversion, Swap v2 query
builders, bytecode payloads, proxy allowlisting, and response parsing.

## Git Safety

This project is prepared as the standalone
`pods-kyc-sdk-frontend-demo` repository. Keep these files out of commits:

- `.env.local`
- `.env.*` backups
- `.next/`
- `node_modules/`
- local logs or reports with credentials, wallet keys, Pix keys, or API keys
