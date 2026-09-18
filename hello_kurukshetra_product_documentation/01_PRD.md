# Product Requirements Document (PRD)

## 1. Executive summary
Hello Kurukshetra is a trusted mobility and travel-assistance platform connecting Riders with verified Drivers and Guides. It combines ride booking, guide discovery, real-time trip tracking, payments, trip sharing, safety monitoring, SOS/emergency operations and a React-based operations console.

## 2. Product goals
- Provide reliable ride booking with transparent pricing.
- Create a trusted marketplace of verified Drivers and Guides.
- Support ride-only, guide-only and ride+guide services.
- Provide robust active-trip safety and emergency workflows.
- Give operations teams real-time control without overexposing personal data.
- Build a scalable foundation for multiple cities and service categories.

## 3. Non-goals
- The app does not itself replace public emergency services.
- The app must not claim guaranteed detection of a powered-off phone.
- The platform must not infer sensitive traits or discriminate based on ride purpose.
- Clients must not be authoritative for payment, fare, verification or trip state.

## 4. Personas
### Rider
Books rides, discovers Guides, pays, shares trips and accesses safety tools.

### Driver
Completes rides, manages availability, receives assignments, tracks earnings and maintains verification.

### Guide
Provides local/tourism/religious/site guidance, manages availability, assignments, pricing and earnings.

### Operations Admin
Monitors trips, dispatch and service health.

### Verification Admin
Reviews Driver/Guide documents and live verification.

### Safety Admin
Handles SOS incidents, responders and escalation.

### Finance Admin
Handles payments, refunds, commissions and financial reconciliation.

## 5. Functional requirements
### Authentication
Mobile OTP, email, Google Sign-In, refresh sessions, device/session management, logout-all, recovery and account deletion.

### Role onboarding
Rider: minimal profile. Driver and Guide: three-step onboarding — profile, documents, human/live verification — with independent status per role.

### Rider
Home, search, saved places, booking, purpose selection, driver/guide discovery, active trip, history, payments, Safety Center, trusted contacts, notifications and profile.

### Maps
Current location, search/autocomplete, pickup/drop selection, routes, ETA, navigation handoff, satellite/terrain/standard styles and 3D/tilt only where supported.

### Ride booking
Pickup, destination, service type, purpose, payment method, optional Guide. Display fare breakdown before confirmation.

### Dispatch
Select eligible verified/available Drivers using weighted matching. Prevent duplicate assignments. Retry intelligently after rejection/timeout.

### Guide marketplace
Search by pickup or destination. Filter by language, category, rating, distance, price, experience and availability.

### Combined service
Support ride-only, guide-only and ride+guide with independent assignment and billing records.

### Payments
Razorpay where supported, UPI/card/etc. through provider, cash. Server-side verification and webhook reconciliation.

### Realtime
Live location, trip state, Guide availability, emergency events and notifications with reconnect/offline recovery.

### Safety
Safety Center, SOS incident creation, controlled responder dispatch, trusted contacts, heartbeat monitoring, route deviation/stop checks and explicit permission handling.

### Interrupted ride
Freeze state, record interruption, preserve fare ledger, dispatch replacement, notify Rider and prevent double charging.

### Reviews
1–5 ratings, predefined feedback, optional text and issue reporting.

### Admin
Dashboard, user management, verification queue, ride operations, emergency command center, notifications, promotions, configuration, finance, analytics, support and RBAC.

## 6. Critical acceptance principles
- No unverified Driver/Guide can receive customer assignments.
- No client-only payment success is accepted.
- No invalid state transition is accepted by the backend.
- SOS creates an auditable incident immediately.
- Reconnect/retry cannot create duplicate rides or payments.
- Admin actions affecting users, trips, money or emergencies are audited.
- Location access is minimized and permission-aware.

## 7. Success metrics
- Booking completion rate
- Driver acceptance rate
- Median pickup ETA
- Cancellation rate
- Interrupted-trip recovery time
- Payment success/reconciliation rate
- Verification turnaround time
- Guide conversion rate
- Emergency acknowledgement time
- App crash-free sessions
- API p95 latency
- Notification delivery/acknowledgement rate

## 8. Business rules
Business-critical rules such as fares, commissions, search radius, dispatch timeout, heartbeat thresholds and notification policy must be configurable server-side.

## 9. Release gates
Production release requires security review, payment verification testing, background-location review, privacy review, emergency workflow simulation, load testing and end-to-end acceptance testing.
## Language & localization
Language is a first-class capability. Users select a preferred language during account creation and can change it later. Device locale and coarse location provide recommendations only. Explicit user choice always takes precedence. Driver/Guide spoken languages are separate service capabilities.
