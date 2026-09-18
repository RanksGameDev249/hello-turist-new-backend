# Hello Kurukshetra — Product Documentation Pack

Version: 1.0  
Date: 03 September 2026  
Product: Multi-role Rider / Driver / Guide mobility, guide marketplace, safety and operations platform.

## Purpose
This pack turns the supplied master product prompt into implementation-ready product, UX, architecture, API, data, security, QA and delivery specifications.

## Document index
1. `01_PRD.md` — Product Requirements Document
2. `02_UX_UI_DESIGN_SPEC.md` — UX, UI and Design System
3. `03_SYSTEM_ARCHITECTURE.md` — End-to-end technical architecture
4. `04_DATABASE_SCHEMA.md` — Data model and ERD
5. `05_API_SPECIFICATION.md` — Versioned REST API contract
6. `06_REALTIME_EVENTS.md` — WebSocket/event architecture
7. `07_STATE_MACHINES.md` — Ride, verification, payment and emergency state machines
8. `08_SECURITY_PRIVACY.md` — Security, privacy and abuse-prevention specification
9. `09_ADMIN_PANEL_SPEC.md` — React Admin Panel requirements
10. `10_ANDROID_APP_SPEC.md` — Android application module specification
11. `11_QA_TEST_PLAN.md` — QA, automation and acceptance test plan
12. `12_PRODUCT_ROADMAP.md` — Phased delivery plan
13. `13_REQUIREMENTS_TRACEABILITY.md` — Requirement-to-module traceability matrix
14. `14_ENVIRONMENT_DEPLOYMENT.md` — Environments, configuration and deployment
15. `15_DECISIONS_AND_RISKS.md` — Architecture decisions, assumptions and risks

## Core principle
The backend is the source of truth for identity authorization, verification, pricing, payment confirmation, assignment, trip state and emergency state. The clients are presentation and interaction layers.

## Recommended implementation baseline
- Android: Kotlin + Jetpack Compose + Coroutines + Flow + Hilt + Room
- Backend: TypeScript + NestJS (or equivalent modular framework)
- Database: PostgreSQL + PostGIS
- Cache / coordination: Redis
- Realtime: WebSockets / Socket.IO
- Async jobs: Redis-backed queue or managed queue
- Admin: React + TypeScript
- Maps: Google Maps Platform
- Payments: Razorpay where supported
- Push: Firebase Cloud Messaging
- Object storage: S3-compatible private buckets
- Observability: OpenTelemetry-compatible traces/metrics + centralized structured logs

These are architecture recommendations; final choices should be confirmed during technical discovery.
16. `16_LANGUAGE_LOCATION_LOCALIZATION.md` — Language selection, location-based recommendations and localization
