# Backend implementation status

This backend follows the documentation's recommended **modular-monolith** starting point.

## Implemented development modules

- HTTP response envelope and correlation/request IDs
- Development OTP request/verify, signed access token, refresh rotation, logout and account deletion flow
- User profile, roles, explicit UI-language preference and separate provider spoken-language preferences
- Role verification request, private-document reference, live-session reference and resubmission lifecycle
- Quote, idempotent ride creation, history, detail and guarded state transitions
- Ride events, development driver dispatch offers, provider-scoped assignment responses and guarded provider state transitions
- Trusted contacts, explicit invitation consent and expiry-bounded trip sharing
- SOS incident creation, lookup, acknowledgement, escalation and resolution
- Admin-protected operational read, verification-decision and audit-log development endpoints
- Saved places, notifications, ratings, support tickets and promotions development endpoints
- Place autocomplete/details and route-estimate adapters
- Development payment order persistence, server-side amount ownership checks, capture verification, refund guards and payment lookup; Razorpay webhook/provider settlement remains gated
- Wallet accounts, atomic ad-view rewards, wallet ledger, admin-configurable reward/redemption rules, redeem codes, monthly passes, expiry checks, FCM device registration and AdMob SSV-verified ad rewards
- PostGIS/Redis Docker development services and durable-schema starting point
- `db:migrate` schema runner, infrastructure health reporting, Redis-backed (with local fallback) rate limiting, and authenticated Socket.IO user/ride subscription foundation
- Unit tests for access/refresh session rotation and ride state-transition rules
- Ride safety recording policy and explicit consent schema for audio/video recording

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
- Replace the development role check with database-backed permissions/RBAC, Redis locks/presence, WebSocket authenticated channels and event replay.
- Complete Google Maps, SMS/OTP, Razorpay settlement, FCM, object-storage and secure-webhook production configuration; credentials alone must not enable an adapter without server-side verification.
- Complete provider verification, dispatch ranking/reservation and background workers.
- Complete production ride-recording capture/upload/retention integration described in `docs/ride-safety-recording.md`.
- Add migrations, test suite, rate limiting, TLS, secrets manager and observability.

No endpoint may treat a client-side payment success, provider verification state, fare, recording state, or ride-state transition as authoritative.
