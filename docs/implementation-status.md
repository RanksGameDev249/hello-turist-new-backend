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
- Wallet accounts, atomic ad-view rewards, wallet ledger, admin-configurable reward/redemption rules, redeem codes, monthly passes, expiry checks, FCM device registration and AdMob SSV-verified ad rewards
- PostGIS/Redis Docker development services and durable-schema starting point
- `db:migrate` schema runner, infrastructure health reporting, Redis-backed (with local fallback) rate limiting, and authenticated Socket.IO user/ride subscription foundation
- Unit tests for access/refresh session rotation and ride state-transition rules
- Ride safety recording policy and explicit consent schema for audio/video recording

## Admin RBAC

Admin access is now enforced in two layers:

1. `adminMiddleware` verifies the account is active and has the `ADMIN` role.
2. `requirePermission(...)` verifies one or more database-backed permissions before an admin route is executed.

Permissions are stored in `admin_user_permissions` and seeded for existing ADMIN users by migration. The supported permission catalog covers users, driver/guide verification, rides, payments, emergency, notifications, promotions, support, pricing, branding, remote UI, analytics, audit logs and RBAC administration.

Admin permission management is exposed through:

- `GET /api/v1/admin/rbac/users/:userId/permissions`
- `PUT /api/v1/admin/rbac/users/:userId/permissions`

The permission update endpoint validates the permission catalog, requires `admin.permissions.manage`, verifies the target is an active admin, writes an audit log, and prevents an administrator from removing their own `admin.permissions.manage` permission.

## Safety recording requirements

- Audio/video recording is restricted to active rides and must never run silently.
- Rider recording consent is explicitly required.
- Driver and guide recording acknowledgement/permission is mandatory before accepting or starting a ride when recording is enabled.
- Android camera/microphone runtime permissions must be requested before recording.
- Recording must visibly indicate that capture is active and stop when the ride ends/cancels.
- Media must use private encrypted storage, authenticated access, audit logging and bounded configurable retention.
- The backend must validate ride membership and role for every recording operation; client-side recording state is not authoritative.
- Full Android capture/upload and production storage configuration remain a required integration before this feature can be called production-ready.

## Required before staging/production

- Replace the in-memory development store with PostgreSQL repositories and transactions where still present.
- Signed, short-lived access tokens and refresh-token rotation are implemented for development. Move refresh-token and OTP challenge storage to PostgreSQL/Redis before staging.
- Complete Redis locks/presence, WebSocket authenticated channels and event replay.
- Complete Google Maps, SMS/OTP, Razorpay settlement, FCM, object-storage and secure-webhook production configuration; credentials alone must not enable an adapter without server-side verification.
- Complete provider verification and production dispatch ranking/reservation behavior where required by the source-of-truth docs.
- Complete production ride-recording capture/upload/retention integration described in `docs/ride-safety-recording.md`.
- Add/expand migrations, test suite, rate limiting, TLS, secrets manager and observability.

No endpoint may treat a client-side payment success, provider verification state, fare, recording state, or ride-state transition as authoritative.
