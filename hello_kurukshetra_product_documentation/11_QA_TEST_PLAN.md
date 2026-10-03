# QA and Test Plan

## Test layers
1. Static analysis/lint
2. Unit tests
3. Integration tests
4. API contract tests
5. Database migration tests
6. Android UI tests
7. Admin UI tests
8. Realtime tests
9. Payment webhook tests
10. Security tests
11. Load/performance tests
12. End-to-end tests

## Critical scenarios
### Auth
OTP success/failure/rate-limit, Google auth, expired refresh token, logout-all.

### Verification
Document upload, invalid file, expired document, rejection, resubmission, live verification, permission checks.

### Booking
Quote, confirmation, duplicate request, no supply, assignment timeout, driver rejection, cancellation.

### Fare calculation
Verify pickup → destination1 → destination2 → final dropoff routing, route-leg aggregation, minimum/base/per-km fare, RIDE_ONLY, GUIDE_ONLY and RIDE_AND_GUIDE, configured guide hours/rate, separate ride/guide GST amounts, final total, and payment recalculation from persisted destinations.

### Trip
Arriving, arrived, start, progress, completion, GPS loss, network loss, reconnect and process death.

### Interrupted ride
Freeze state, compute completed segment, replacement assignment, transparent fare adjustment, no double charge.

### Guide
Pickup discovery, destination discovery, filters, availability and independent assignment.

### Payments
Success, failure, delayed webhook, duplicate webhook, refund, partial refund, cash. Verify Razorpay/order amount exactly matches the server's multi-destination + guide + GST fare.

### Partner notifications
Verify only active Admin-curated partner/sponsor records can trigger nearby promotions; test homestay/hotel/restaurant/food copy, radius filtering, FCM delivery, in-app persistence, 24-hour per-place cooldown, and exclusion of generic Google merchant results.

### Emergency
SOS, duplicate SOS prevention, acknowledgement, responder assignment, escalation, arrival, resolution, audit.

### Safety heartbeat
GPS unavailable, network unavailable, backgrounded app, force-stop and device-off limitations.

### Security
Unauthorized role access, IDOR, privilege escalation, malicious upload, rate-limit bypass, webhook spoofing, token reuse.

## Release criteria
Zero open critical/high security defects, critical E2E paths passing, payment reconciliation validated, emergency workflows simulated, acceptable crash-free rate and performance budgets met.
## Localization tests
Test signup language selection, device-locale detection, regional recommendations, persistence, manual changes, notification localization, missing-translation fallback, spoken-language matching, RTL readiness and offline behavior. Verify location recommendations never override explicit language.
