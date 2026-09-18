# React Admin Panel Specification

## 1. Navigation
Dashboard
Users
Drivers
Guides
Verification
Rides
Emergency Command Center
Payments
Earnings
Notifications
Promotions
Support
Analytics
Settings
Admin Roles

## 2. Dashboard
KPIs:
- Riders, Drivers, Guides
- Active/completed/cancelled/interrupted rides
- Active emergencies
- Revenue and commissions
- Online supply
- Verification queue
- operational response times

## 3. Verification
Queue filters, profile summary, documents, expiry, verification history, live-session outcome, notes, approve/reject/resubmit/suspend/revoke.

## 4. Ride operations
Live operational map, ride timeline, assignment status, fare ledger, payment status, interruption handling and audited admin intervention.

## 5. Emergency Command Center
Incident queue, severity/category, current/last location, heartbeat, ride state, assigned responders, event timeline and escalation controls.

## 6. Finance
Payments, refunds, cash reconciliation, provider transactions, earnings, commissions and adjustments.

## 7. Configuration
Fare rules, radius, timeout, heartbeat thresholds, notification policies, service categories, commission rules.

## 8. RBAC
Use permission-based route guards and API authorization. Never rely on hiding UI controls as a security mechanism.

## 9. Audit UX
Every sensitive action shows actor, timestamp, reason where applicable and resulting state. Immutable audit history should be viewable to authorized admins.

## 10. Frontend standards
React + TypeScript, query/cache layer, form validation, accessible components, error boundaries, route guards, pagination, optimistic UI only for safe reversible operations.
## Language management
Add Settings → Languages for language activation, priority, region mapping, translation status, fallback language and localized notification templates. Restrict changes with `settings.manage` and audit production changes.
