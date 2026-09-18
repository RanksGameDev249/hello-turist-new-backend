# Android Application Specification

## 1. Recommended stack
Kotlin, Jetpack Compose, Navigation Compose, ViewModel, Coroutines/Flow, Hilt, Room, Retrofit/OkHttp, WorkManager, Firebase Cloud Messaging, Google Maps Compose/Maps SDK.

## 2. Architecture
Use Clean Architecture with:
- presentation
- domain
- data
- platform
- feature modules

Suggested modules:
`:app`, `:core:*`, `:feature-auth`, `:feature-onboarding`, `:feature-rider`, `:feature-driver`, `:feature-guide`, `:feature-maps`, `:feature-ride`, `:feature-payment`, `:feature-notification`, `:feature-safety`, `:feature-emergency`, `:feature-family`, `:feature-support`.

## 3. State
Unidirectional data flow. UI observes immutable state from ViewModels. Network is never assumed authoritative until server response confirms state.

## 4. Location
Foreground service for active-trip tracking where required. Background location only where justified. Persist last safe state locally; reconcile after process death/reconnect.

## 5. Offline
Room caches safe read data. Mutation queues use idempotency keys. Avoid replaying payment or booking mutations without server acknowledgement.

## 6. Security
Android Keystore-backed secure storage, certificate/network security configuration, no secrets in source, no sensitive logs, secure deep links and verified app links.

## 7. Maps
Google Maps integration for current location, autocomplete, routes, marker state, map styles, satellite and supported tilt/3D. Do not fake unavailable map capabilities.

## 8. Push
FCM with separate channels for operational, promotional and critical safety notifications. Respect Android notification permissions and sensible throttling.

## 9. Testing
Unit, repository, ViewModel, UI, navigation, permission, offline, realtime and end-to-end tests.
## Localization
Use Android resource localization. Add language selection during signup and Settings → Language & Region. Cache bundled translations for offline use. Use locale-aware start/end layout APIs for RTL readiness. Do not silently change language from location.
