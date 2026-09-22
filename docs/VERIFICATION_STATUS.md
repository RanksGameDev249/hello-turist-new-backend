# Hello Kurukshetra Backend — Verification Status

Last updated: 2026-09-22

This checklist records the backend items verified as working from the local verification steps completed during deployment preparation.

## Completed / Working

- [x] Git working tree clean and `main` synchronized with `origin/main` during final verification.
- [x] Prisma Client generation succeeds with Prisma 7.10.0.
- [x] TypeScript production build succeeds: `NODE_ENV=production npm run build`.
- [x] Prisma migration status is up to date after resolving the pre-existing `notification_devices` migration state.
- [x] Firebase Phone Authentication is the production phone OTP flow. Backend verifies the Firebase ID token rather than using the previous Twilio OTP delivery path.
- [x] Firebase/FCM notification device lifecycle integration is present.
- [x] Cloudinary storage integration is present for ride recordings, replacing the production R2 requirement.
- [x] Cloudinary TypeScript signing issue was fixed and the project build passes.
- [x] Ride recordings support the planned video/audio media types through Cloudinary public-ID generation.
- [x] Google Maps server-side API key configuration is wired through `GOOGLE_MAPS_API_KEY`.
- [x] Ride fare calculation uses Google route data and configurable INR pricing values.
- [x] Ride API routes are present for fare quotes, ride creation/listing, assignment, guide assignment, cancellation, locations, and ride events.
- [x] Production startup validation correctly fails when required third-party production credentials are missing instead of silently running with incomplete integrations.
- [x] Razorpay credentials/webhook configuration variables are wired in the backend.
- [x] `RAZORPAY_WEBHOOK_SECRET` is the preferred webhook secret; `PAYMENT_WEBHOOK_SECRET` remains as a backward-compatible alias.
- [x] OTP Redis key deletion was fixed for the Redis v5 API.
- [x] Obsolete Prisma skills postinstall command was removed.

## Partial / Requires Real Production Credentials or External Test

- [ ] Google Maps: code/configuration verified, but the production API key still needs to be supplied and the real route API tested against the deployed environment.
- [ ] Firebase Phone Auth/FCM: backend integration verified; Firebase project credentials and Android/client configuration must be supplied and real device OTP + notification delivery tested.
- [ ] Razorpay: backend configuration verified; production credentials and a real webhook delivery test remain.
- [ ] Cloudinary: integration verified; production Cloudinary credentials must be supplied and an actual video/audio upload + retrieval test remains.
- [ ] Ride safety recording retention: configuration exists; production media lifecycle/retention should be tested with real Cloudinary assets.
- [ ] Wallet/ad rewards: reward hardening secret can be configured, but AdMob SSV verification and an end-to-end reward test remain before treating production wallet crediting as complete.

## Deferred Until Final Deployment Test

- [ ] Razorpay webhook end-to-end test using a public tunnel/deployed HTTPS endpoint.
- [ ] Full production smoke test covering auth, Firebase OTP, FCM notification registration/delivery, maps/route/fare, ride lifecycle, safety recording, Cloudinary media, wallet/payment, and admin flows.
- [ ] Production environment variable audit with real values in the hosting provider's secret/environment configuration.
- [ ] Security review of all production secrets, CORS origins, webhook verification, and provider restrictions.

## Current Build Gate

The backend build is currently considered **code-clean** when these commands complete without errors:

```bash
npx prisma generate
npx prisma migrate status
NODE_ENV=production npm run build
```

Do not use `npm audit fix --force` as a deployment step without reviewing the resulting Prisma/package version changes; the current audit output indicates that the forced fix would downgrade Prisma and is therefore a breaking dependency change.

## Environment Variables

### Core

- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`

### Firebase / Notifications

- `FIREBASE_PROJECT_ID`
- `FCM_SERVICE_ACCOUNT_EMAIL`
- `FCM_PRIVATE_KEY`

### Maps

- `GOOGLE_MAPS_API_KEY`

### Payments

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Ride pricing

- `RIDE_BASE_FARE_INR`
- `RIDE_PER_KM_FARE_INR`
- `RIDE_MINIMUM_FARE_INR`

### Wallet hardening

- `WALLET_AD_REWARD_SECRET`

### Runtime

- `REDIS_URL`
- `PORT`
- `HOST`
- `NODE_ENV`
- `CORS_ORIGINS`

### Safety / recordings

- `RIDE_RECORDING_RETENTION_DAYS`
- `SAFETY_MONITOR_INTERVAL_MS`
- `RIDE_HEARTBEAT_STALE_MS`

## Important Deployment Note

Firebase Phone Authentication is the selected SMS/OTP architecture. Do not re-enable the old Twilio production OTP requirement unless the architecture is intentionally changed again. Cloudinary is the selected recording-storage provider, so R2 credentials are not part of the production storage requirement for this deployment.
