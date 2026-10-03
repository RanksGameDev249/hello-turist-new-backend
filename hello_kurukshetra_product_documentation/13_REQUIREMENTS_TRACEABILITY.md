# Requirements Traceability Matrix

| Requirement | Primary modules | Verification |
|---|---|---|
| Authentication | Auth, Android, API | Auth E2E + security |
| Role selection | Onboarding | UI + API |
| Driver 3-step verification | Verification, Driver, Admin | E2E |
| Guide 3-step verification | Verification, Guide, Admin | E2E |
| Google Maps | Maps, Ride | UI + integration |
| Ride-purpose popup | Rider/Ride | UI |
| Ride booking | Ride, Dispatch, Fare | E2E + fare contract |
| Multi-destination fare | Ride, Fare, Maps | Route-leg integration + payment amount |
| Ride + Guide combined fare | Ride, Guide, Fare | Quote + payment E2E |
| GST breakup | Fare, Payment | Tax calculation contract + payment E2E |
| Driver assignment | Dispatch | Integration/load |
| Guide discovery | Guide | E2E |
| Ride + Guide | Ride + Guide assignments | E2E |
| Razorpay | Payment | Provider sandbox + webhook |
| Cash | Payment/Earnings | E2E |
| Realtime tracking | Realtime/Ride | Integration |
| Notifications | Notification | Delivery/retry tests |
| Partner/sponsor nearby promotions | Discovery, Notification, FCM | Radius + cooldown + curated-only E2E |
| SOS | Safety/Emergency | E2E + simulation |
| Lost heartbeat | Safety | Integration |
| Trusted contacts | Family/Safety | E2E |
| Interrupted ride | Recovery/Dispatch | E2E |
| Ratings | Rating | E2E |
| Admin dashboard | Admin | UI/API |
| Verification admin | Admin/Verification | E2E |
| Emergency command center | Admin/Safety | E2E |
| RBAC | Auth/Admin | Security |
| Privacy | All | Privacy review |
| Offline | Android/API | Network tests |
| Observability | Platform | Operational tests |
| Language/location localization | Auth, Onboarding, Settings, Localization, Notifications, Admin | Signup + language persistence + notification E2E |
