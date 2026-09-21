# Wallet, notifications and redemption

## Wallet
- `GET /api/v1/wallet` returns the authenticated user's coin balance and active monthly passes.
- `POST /api/v1/wallet/ad-reward` rewards one idempotent ad impression. The same `impressionId` can never be rewarded twice.
- `GET /api/v1/wallet/ad-reward/ssv` accepts AdMob server-side verification callbacks. The backend verifies Google's signed callback, validates the reward amount against the server-side wallet configuration, and credits the authenticated user identified by signed `custom_data` using the AdMob `transaction_id` as the idempotency key.
- `POST /api/v1/wallet/redeem` redeems an admin-issued code. Redemption is disabled by default until enabled in admin settings.
- Coins are changed atomically in `wallet_accounts` and every change is written to `wallet_ledger`.
- Admins control coins per ad, minimum redemption threshold, redemption enablement, monthly-pass enablement and monthly-pass terms.
- Admins can create `COIN_REWARD` and `MONTHLY_PASS` codes, with optional expiry and terms.

## Monthly pass terms
Every monthly-pass code carries the configured terms. The app must show those terms before redemption. A pass starts at redemption and expires after the configured number of calendar months.

## Notifications
- Android requests `POST_NOTIFICATIONS` at first app entry on Android 13+ and the app does not continue until permission is granted.
- The client registers its FCM token at `/api/v1/wallet/devices` after authentication.
- Backend creates an in-app notification and attempts FCM delivery. Invalid/unregistered FCM tokens are disabled.
- Required backend FCM environment variables: `FIREBASE_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_EMAIL`, `FCM_PRIVATE_KEY`.

## Security
- Wallet mutations are authenticated and redemption configuration/code management is admin-only.
- Wallet balance is never accepted from the client.
- Duplicate ad rewards are rejected transactionally.
- AdMob rewards are credited only after cryptographic SSV verification; the client cannot directly assert that an ad was completed through this production callback.
- Redeem codes are locked during redemption to prevent double-spend.
- Do not put FCM service-account credentials in the Android app or admin frontend.
