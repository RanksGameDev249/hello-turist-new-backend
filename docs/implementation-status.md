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
- PostGIS/Redis Docker development services and durable-schema starting point
- `db:migrate` schema runner, infrastructure health reporting, Redis-backed (with local fallback) rate limiting, and authenticated Socket.IO user/ride subscription foundation
- Unit tests for access/refresh session rotation and ride state-transition rules

## Required before staging/production

- Replace the in-memory development store with PostgreSQL repositories and transactions.
- Signed, short-lived access tokens and refresh-token rotation are implemented for development. Move refresh-token and OTP challenge storage to PostgreSQL/Redis before staging.
- Replace the development role check with database-backed permissions/RBAC, Redis locks/presence, WebSocket authenticated channels and event replay.
- Add Google Maps, SMS/OTP, Razorpay, FCM, object-storage and secure-webhook adapters; credentials alone must not enable an adapter without server-side verification.
- Complete durable audit logs, provider verification, dispatch ranking/reservation and background workers.
- Add migrations, test suite, rate limiting, TLS, secrets manager and observability.

No endpoint may treat a client-side payment success, provider verification state, fare, or ride-state transition as authoritative.
