# Customer Integration Guides

These guides explain how to reproduce the Pods KYC demo flow inside your own
codebase.

The demo repository is intentionally a reference implementation. Your
production integration should keep the same API flow, but your backend should
own the credentials, secrets, polling/webhook logic, and calls to Pods.

## Guides

- [Temporary shared Sumsub demo](temporary-shared-sumsub-demo.md)
- [KYC providers: Sumsub share token and BigDataCorp iframe](kyc.md)
- [Pix BRL to USDC Base onramp](onramp.md)
- [USDC Base to BRL Pix offramp](offramp.md)

## Shared Rules

- Keep `PODS_API_KEY`, Sumsub app tokens, Sumsub secret keys, webhook secrets,
  and private keys on your backend.
- Never send Pods or Sumsub secrets to the browser.
- Do not call BigDataCorp directly from the browser. If you use the BigDataCorp
  provider flow, call Pods and let Pods own provider polling and `CheckResults`
  server-side.
- Do not store Sumsub share tokens. Generate a fresh share token only after the
  applicant is approved and submit it to Pods immediately.
- Use the wallet address that belongs to the approved KYC profile for onramp and
  offramp requests.
- Treat these guides as API integration contracts. The UI in this repository is
  only a demo client.

## Base URLs

Use the Pods API base URL provided during onboarding:

```text
PODS_API_BASE_URL=https://deframe-picn-papais-brl-brpga0.herokuapp.com
```

Use Sumsub's API URL from your Sumsub environment:

```text
SUMSUB_API_BASE_URL=https://api.sumsub.com
```

## Demo Code References

The demo keeps customer-style backend logic under:

- `src/app/api/demo/kyc-session/route.ts`
- `src/app/api/customer-webhooks/sumsub/route.ts`
- `src/app/api/demo/pods/route.ts`

The reusable frontend/domain helpers live under:

- `src/features/kyc-demo/domain`
- `src/features/kyc-demo/hooks`
- `src/features/kyc-demo/components`
