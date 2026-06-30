# Temporary Shared Sumsub Demo

This guide is for short-lived demos where Pods gives you temporary Sumsub
credentials so you can test the full KYC, onramp, and offramp flow without
setting up your own Sumsub workspace first.

These credentials are not your production Sumsub credentials. Store them only
in backend environment variables, never in frontend or mobile code, and never
commit them to Git. Pods will rotate or revoke them after the demo.

## What Pods Provides

Pods will send these values through a secure channel:

```env
SUMSUB_API_BASE_URL=https://api.sumsub.com
SUMSUB_ENVIRONMENT=production
SUMSUB_APP_TOKEN=<sent-by-pods>
SUMSUB_SECRET_KEY=<sent-by-pods>
SUMSUB_LEVEL_NAME=pods-kyc-level
AVENIA_FOR_CLIENT_ID=brla.digital_101963

PODS_API_BASE_URL=https://deframe-picn-papais-brl-brpga0.herokuapp.com
PODS_API_KEY=<sent-by-pods>
```

For this temporary demo, Pods already configured:

- the Sumsub verification level named `pods-kyc-level`;
- the reusable KYC recipient for Avenia;
- a Sumsub app token with reusable identity sharing permission;
- the Pods API customer key for the demo backend.

You do not need to create a Sumsub level, add Avenia as a recipient, or create a
new Sumsub app token for this temporary flow.

## What You Build

Your backend should:

1. Generate a Sumsub WebSDK access token.
2. Store the user's `externalUserId`, `email`, and `walletAddress`.
3. Poll Sumsub after the WebSDK flow finishes.
4. Continue only when Sumsub returns `completed` and `GREEN`.
5. Generate a fresh Sumsub share token for Avenia.
6. Submit the share token, email, and wallet address to Pods.
7. Store the returned `kycUserId`.
8. Use the normal Pods API guides for KYC status, onramp, and offramp.

## 1. Generate The Sumsub WebSDK Token

Call Sumsub from your backend:

```http
POST https://api.sumsub.com/resources/accessTokens/sdk
```

Request body:

```json
{
  "userId": "your-internal-demo-user-id",
  "levelName": "pods-kyc-level",
  "ttlInSecs": 600
}
```

The `userId` becomes the Sumsub `externalUserId`. Use a stable ID for the demo
user and store it before opening the WebSDK:

```json
{
  "externalUserId": "your-internal-demo-user-id",
  "email": "user@example.com",
  "walletAddress": "0x0000000000000000000000000000000000000001"
}
```

Sumsub API requests must be signed with the Sumsub app token and secret key.
Use the official Sumsub authentication headers:

- `X-App-Token`
- `X-App-Access-Ts`
- `X-App-Access-Sig`

Reference: https://docs.sumsub.com/reference/authentication

## 2. Run Sumsub WebSDK

Use the returned access token to render Sumsub WebSDK in your frontend.

The applicant should complete KYC using the `pods-kyc-level` verification level
from the shared Pods Sumsub account.

Reference: https://docs.sumsub.com/docs/websdk

## 3. Poll Sumsub For Approval

For this temporary demo, you do not need to configure Sumsub webhooks. Instead,
create a backend endpoint such as `POST /kyc/finalize` that runs after your
frontend receives the WebSDK completion callback.

That endpoint should:

1. Look up the stored `externalUserId`, `email`, and `walletAddress`.
2. Fetch the applicant by `externalUserId`.
3. Use the returned Sumsub `applicantId`.
4. Fetch the applicant review status.
5. Continue only if `reviewStatus` is `completed` and
   `reviewResult.reviewAnswer` is `GREEN`.

Fetch applicant by `externalUserId`:

```http
GET https://api.sumsub.com/resources/applicants/-;externalUserId={externalUserId}/one
```

Fetch review status:

```http
GET https://api.sumsub.com/resources/applicants/{applicantId}/status
```

Do not trust the frontend callback by itself as final KYC approval. Use it only
as a trigger for your backend to verify the result with Sumsub.

If the applicant is still pending, return a pending state and retry after a
short delay. If Sumsub returns `completed` and `RED`, do not submit the user to
Pods for money movement.

References:

- https://docs.sumsub.com/reference/get-applicant-data-via-externaluserid
- https://docs.sumsub.com/reference/get-applicant-review-status

## 4. Generate A Sumsub Share Token

After polling confirms `completed` and `GREEN`, generate a fresh share token
from your backend:

```http
POST https://api.sumsub.com/resources/accessTokens/shareToken
```

Request body:

```json
{
  "applicantId": "SUMSUB_APPLICANT_ID_FROM_POLLING",
  "forClientId": "brla.digital_101963",
  "ttlInSecs": 600
}
```

Important rules:

- Generate a fresh `shareToken` for every approved applicant.
- Sumsub share tokens are short-lived.
- Do not reuse the same token across users.
- Do not store the share token after sending it to Pods.

Reference: https://docs.sumsub.com/docs/reusable-kyc-via-api

## 5. Submit The Share Token To Pods

Once you have the Sumsub `shareToken`, call Pods:

```http
POST https://deframe-picn-papais-brl-brpga0.herokuapp.com/api/v1/kyc/sumsub-share-token
```

Headers:

```http
x-api-key: PODS_API_KEY
Content-Type: application/json
```

Request body:

```json
{
  "sumsubApplicantId": "SUMSUB_APPLICANT_ID_FROM_POLLING",
  "shareToken": "SUMSUB_SHARE_TOKEN",
  "email": "user@example.com",
  "walletAddress": "0x0000000000000000000000000000000000000001"
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "kycUserId": "00000000-0000-4000-8000-000000000001",
    "status": "provider_pending"
  }
}
```

Store `kycUserId`. You will use it for KYC status, onramp, and offramp calls.

## 6. Poll Pods KYC Status

After submitting the share token, poll Pods until the KYC status reaches a
terminal state:

```http
GET https://deframe-picn-papais-brl-brpga0.herokuapp.com/api/v1/kyc/status?kycUserId=00000000-0000-4000-8000-000000000001
```

Money movement is enabled only when Pods returns:

```json
{
  "status": "approved"
}
```

After that, continue with:

- [Pix BRL to USDC Base onramp](onramp.md)
- [USDC Base to BRL Pix offramp](offramp.md)

## Demo Safety Checklist

Before starting the demo, confirm:

- Sumsub credentials are stored only as backend environment variables.
- No credentials were committed to Git.
- Your backend persists `externalUserId`, `email`, and `walletAddress`.
- Your backend polls Sumsub and verifies `completed` plus `GREEN`.
- Your backend only calls Pods after Sumsub approval is confirmed.
- Your backend sends `sumsubApplicantId`, `shareToken`, `email`, and
  `walletAddress` to Pods.
- Your backend stores the returned `kycUserId`.

After the demo, ask Pods to rotate or revoke the shared Sumsub credentials.
