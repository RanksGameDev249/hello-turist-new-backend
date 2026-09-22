# Backend implementation status

This backend follows the documentation's recommended **modular-monolith** starting point.

## Implemented development modules

- HTTP response envelope and correlation/request IDs
- Development OTP request/verify, signed access token, refresh rotation, logout and account deletion flow
- User profile, roles, explicit UI-language preference and separate provider spoken-language preferences
- Role verification request, private-document reference, live-session reference and resubmission lifecycle
- Quote, idempotent ride creation, history, detail and guarded state transitions
- Ride events, driver dispatch offers, provider-scoped assignment responses and guarded provider state transitions
- Automatic driver matching, offer expiry and dispatch recovery workers
- Trusted contacts, explicit invitation consent and expiry-bounded trip sharing
- SOS incident creation, lookup, acknowledgement, escalation and resolution
- Admin-protected operational read, verification-decision and audit-log endpoints
- Database-backed granular admin permissions/RBAC with persistent per-admin grants, permission enforcement on admin routes, permission management endpoints and self-lockout protection
- Saved places, notifications, ratings, support tickets and promotions development endpoints
- Place autocomplete/details and route-estimate adapters
- Development payment order persistence, server-side amount ownership checks, capture verification, refund guards and payment lookup; Razorpay webhook/provider settlement remains gated
- Wallet accounts with atomic coin ledger, idempotent watch-ad rewards, AdMob SSV verification, configurable reward/redemption rules, redeem codes, single-use redemption, monthly passes, expiry checks, FCM device registration and admin wallet configuration
- PostGIS/Redis Docker development services and durable-schema starting point
- `db:migrate` schema runner, infrastructure health reporting, Redis-backed (with local fallback) rate limiting, and authenticated Socket.IO user/ride subscription foundation
- Unit tests for access/refresh session rotation and ride state-transition rules
- Wallet/ad/redeem E2E coverage (`tests/wallet-e2e.ts`, `tests/wallet-redeem.e2e.ts`)
- Ride safety recording policy and explicit consent schema for audio/video recording

## Wallet / Coins

Wallet functionality is implemented behind authenticated routes. Users have a persistent wallet balance and append-only ledger entries. A watch-ad reward is idempotent by impression/transaction ID. AdMob rewarded-ad callbacks are verified using Google's signed SSV request before coins are credited. Redemption is server-side, atomic and single-use; insufficient balance, threshold, disabled redemption and expiry are enforced. Monthly-pass purchase/redemption is also transactional.

Admin wallet controls expose reward amount per ad, minimum redemption threshold, monthly-pass coin cost, redemption enablement, monthly-pass-code enablement and terms. Admins can create and list redemption codes. These operations are protected by the admin layer and are intended to be further permission-scoped as the central admin permission catalog expands.

## Admin RBAC

Admin access is now enforced in two layers:

1. `adminMiddleware` verifies the account is active and has the `ADMIN` role.
2. `requirePermission(...)` verifies one or more database-backed permissions before an admin route is executed.

Permissions are stored in `admin_user_permissions` and seeded for existing ADMIN users by migration. The supported permission catalog covers users, driver/guide verification, rides, payments, emergency, notifications, promotions, support, pricing, branding, remote UI, analytics, audit logs, settings and RBAC administration.

Admin permission management is exposed through:

- `GET /api/v1/admin/rbac/users/:userId/permissions`
- `PUT /api/v1/admin/rbac/users/:userId/permissions`

The permission update endpoint validates the permission catalog, requires `admin.permissions.manage`, verifies the target is an active admin, writes an audit log, and prevents an administrator from removing their own `admin.permissions.manage` permission.

## Production third-party E2E

A live-provider smoke suite is available at `tests/production-integrations.e2e.ts` and is exposed as `npm run test:production-integrations`.

The suite fails closed unless `NODE_ENV=production` (or the explicit `ALLOW_PRODUCTION_E2E=true` override is used). It verifies backend health/reachability, Google Maps live Directions API route response, Firebase service-account OAuth and a live FCM message to `E2E_FCM_DEVICE_TOKEN`, Razorpay live order creation using production/test credentials, and Cloudinary authenticated upload using a unique E2E asset.

AdMob SSV is deliberately not faked by this suite: production verification must use a real Google-signed SSV callback. Razorpay webhook settlement likewise remains an external webhook/deployment test rather than an artificial local signature.

## Required before staging/production

- Replace the in-memory development store with PostgreSQL repositories and transactions where still present.
- Signed, short-lived access tokens and refresh-token rotation are implemented for development. Move refresh-token and OTP challenge storage to PostgreSQL/Redis before staging.
- Complete Redis locks/presence, WebSocket authenticated channels and event replay.
- Run `npm run test:production-integrations` against the controlled production/staging environment with real provider credentials and a dedicated FCM test device token.
- Complete Google Maps, Firebase/FCM, Razorpay settlement/webhook, object-storage and secure-webhook production configuration; credentials alone must not enable an adapter without server-side verification.
- Complete provider verification and production dispatch ranking/reservation behavior where required by the source-of-truth docs.
- Complete production ride-recording capture/upload/retention integration described in `docs/ride-safety-recording.md`.
- Add/expand migrations, test suite, rate limiting, TLS, secrets manager and observability.

No endpoint may treat a client-side payment success, provider verification state, fare, recording state, or ride-state transition as authoritative.
