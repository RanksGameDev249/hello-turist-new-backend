# Secret Manager production mapping

Cloud Run should receive production credentials from Google Secret Manager. Never commit real secret values, service-account JSON files, private keys, database passwords, or API secrets.

## Required secrets

| Secret | Environment variable | Purpose |
|---|---|---|
| hello-turist-database-url | DATABASE_URL | Cloud SQL PostgreSQL connection |
| hello-turist-redis-url | REDIS_URL | Memorystore Redis connection |
| hello-turist-access-token-secret | ACCESS_TOKEN_SECRET | Access-token signing secret |
| hello-turist-refresh-token-secret | REFRESH_TOKEN_SECRET | Refresh-token signing secret |
| hello-turist-google-maps-api-key | GOOGLE_MAPS_API_KEY | Maps integration |
| hello-turist-firebase-project-id | FIREBASE_PROJECT_ID | Firebase project |
| hello-turist-fcm-service-account-email | FCM_SERVICE_ACCOUNT_EMAIL | FCM service identity |
| hello-turist-fcm-private-key | FCM_PRIVATE_KEY | FCM signing private key |
| hello-turist-razorpay-key-id | RAZORPAY_KEY_ID | Razorpay API key |
| hello-turist-razorpay-key-secret | RAZORPAY_KEY_SECRET | Razorpay API secret |
| hello-turist-razorpay-webhook-secret | RAZORPAY_WEBHOOK_SECRET | Webhook signature verification |
| hello-turist-cloudinary-cloud-name | CLOUDINARY_CLOUD_NAME | Cloudinary account |
| hello-turist-cloudinary-api-key | CLOUDINARY_API_KEY | Cloudinary API key |
| hello-turist-cloudinary-api-secret | CLOUDINARY_API_SECRET | Cloudinary API secret |

These names match the checked-in Cloud Run service configuration and the backend production validation.

## Create/update secrets

Using gcloud, create each secret from a local value without putting the value into Git:

```bash
printf '%s' "$DATABASE_URL" | gcloud secrets versions add hello-turist-database-url --data-file=-
printf '%s' "$REDIS_URL" | gcloud secrets versions add hello-turist-redis-url --data-file=-
```

Repeat for the remaining variables. If a secret does not exist yet, create it first:

```bash
printf '%s' "$VALUE" | gcloud secrets create SECRET_NAME --data-file=-
```

Prefer granting the Cloud Run runtime service account `roles/secretmanager.secretAccessor` on only the required secrets rather than granting broad project-wide access.

## FCM private key

Store the private key exactly as required by the Firebase Admin SDK. Preserve newline characters; do not paste a JSON service-account file into the repository.

## Runtime validation

`src/config/production.ts` fails fast in production when any required variable is missing. This covers core database/Redis/auth, Google Maps, FCM, Razorpay and Cloudinary integrations.

After deployment:

- `GET /health` checks application startup.
- `GET /ready` checks PostgreSQL and Redis connectivity.
- Authentication tests verify Firebase ID-token validation.
- Payment webhook tests verify Razorpay webhook configuration.
- Notification tests verify FCM configuration.
- Media flows verify Cloudinary configuration.

Do not print secret values in CI logs or application logs.
