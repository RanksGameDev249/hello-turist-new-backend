# API Specification

Base path: `/api/v1`

## Standard response envelope
```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "uuid"
}
```

## Auth
- POST `/auth/otp/request`
- POST `/auth/otp/verify`
- POST `/auth/google`
- POST `/auth/refresh`
- POST `/auth/logout`
- POST `/auth/logout-all`
- DELETE `/auth/account`

## Users/Roles
- GET `/users/me`
- PATCH `/users/me`
- GET `/users/me/roles`
- POST `/users/me/roles`
- PATCH `/users/me/roles/:role`

## Verification
- POST `/verification/requests`
- GET `/verification/requests/:id`
- POST `/verification/requests/:id/documents`
- POST `/verification/requests/:id/live-session`
- POST `/verification/requests/:id/resubmit`

## Rides
- POST `/rides/quote`
- POST `/rides`
- GET `/rides/:id`
- POST `/rides/:id/cancel`
- POST `/rides/:id/start`
- POST `/rides/:id/complete`
- GET `/rides/:id/events`
- GET `/rides/history`

## Dispatch
- GET `/rides/:id/assignments`
- POST `/rides/:id/guide-search`
- POST `/rides/:id/assignments/:assignmentId/accept`
- POST `/rides/:id/assignments/:assignmentId/reject`

## Maps/Search
- GET `/places/autocomplete`
- GET `/places/details`
- POST `/routes/estimate`

## Payments
- POST `/payments/orders`
- POST `/payments/:id/verify`
- POST `/payments/:id/refund`
- POST `/webhooks/razorpay`

## Safety
- GET `/safety`
- POST `/emergency/incidents`
- GET `/emergency/incidents/:id`
- POST `/emergency/incidents/:id/acknowledge`
- POST `/emergency/incidents/:id/escalate`
- POST `/emergency/incidents/:id/resolve`
- POST `/rides/:id/heartbeat`

## Trusted contacts
- GET `/trusted-contacts`
- POST `/trusted-contacts/invitations`
- POST `/trusted-contacts/invitations/:id/accept`
- DELETE `/trusted-contacts/:id`
- POST `/trips/:id/share`

## Admin
Admin endpoints are under `/admin` and require explicit permissions:
`users.read`, `users.manage`, `drivers.verify`, `guides.verify`, `rides.manage`, `payments.refund`, `emergency.manage`, `notifications.manage`, `settings.manage`, etc.

## API rules
- Validate all request bodies.
- Return stable machine-readable error codes.
- Use cursor pagination for large operational lists.
- Require idempotency keys for booking/payment mutations.
- Enforce authorization server-side on every endpoint.
- Never return more location precision or personal data than necessary.
## Language APIs
- GET `/languages`
- GET `/languages/recommended`
- GET `/users/me/language`
- PATCH `/users/me/language`
- GET `/users/me/spoken-language-preferences`
- PATCH `/users/me/spoken-language-preferences`
- GET `/providers/:id/languages`

Recommendations may use coarse region when available; they must never silently change the account preference.
