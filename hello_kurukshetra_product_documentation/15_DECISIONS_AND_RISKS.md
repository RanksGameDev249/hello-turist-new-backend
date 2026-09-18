# Architecture Decisions, Assumptions and Risks

## Key decisions
### ADR-001: Modular monolith first
Start with clear domain modules before splitting services. Rationale: faster delivery, simpler transactions and lower operational overhead.

### ADR-002: PostgreSQL + PostGIS
Use one transactional source of truth with first-class geospatial indexing.

### ADR-003: Event-driven side effects
Persist domain events and process notifications, analytics and escalations asynchronously.

### ADR-004: Idempotent mutations
Booking, payment and webhook operations require idempotency.

### ADR-005: Explicit state machines
Trip and emergency workflows are modeled as validated state transitions.

## Risks
### Emergency expectations
Users may expect public emergency-service guarantees. Mitigation: clear product language, operational runbooks and legally valid integrations only.

### Background execution limits
Android can restrict background work. Mitigation: foreground service where justified, battery-aware scheduling and honest last-known-state behavior.

### GPS spoofing
Detection is imperfect. Mitigation: multiple signals and human review.

### Payment delays
Provider webhooks can be delayed or duplicated. Mitigation: idempotent webhook processing and reconciliation jobs.

### Location privacy
Real-time location is highly sensitive. Mitigation: least privilege, retention limits, scoped access and audit.

### Dispatch fairness
Pure nearest-driver matching may create poor outcomes. Mitigation: weighted eligibility/ranking and measurable operational KPIs.

### Scale
Live location can become expensive at high volume. Mitigation: adaptive update rates, aggregation, Redis presence and partitioned/retained location storage.

## Open questions before production
- Exact launch geography and applicable transport/licensing rules.
- Emergency operations staffing and escalation policy.
- Required Driver/Guide documents by jurisdiction.
- Exact commission/tax model.
- Service-area and operating-hour policy.
- Data retention periods.
- Supported payment methods and settlement workflow.
- Legal basis/consent model for safety recording features.
### ADR-006: Explicit language preference overrides location
Location is recommendation-only. This avoids surprising users and prevents location from becoming an implicit identity signal.

### Localization risk
Incomplete translations can harm safety communication. Mitigation: reviewed critical translations, stable fallback language and translation-status gates.
