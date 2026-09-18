# Google sign-in + mandatory mobile number

The Android app authenticates Google users with Firebase Authentication and sends the resulting Firebase ID token to `POST /api/v1/auth/google`. The backend verifies the token signature, issuer, audience and expiry before creating/linking the application account. This follows Firebase's custom-backend ID-token flow.

## Backend configuration

Add this to `.env`:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
```

`FIREBASE_PROJECT_ID` is the Firebase project ID from Firebase Console / `google-services.json` (`project_info.project_id`). No Firebase service-account private key is required by this implementation.

## API

### `POST /api/v1/auth/register`

Required JSON:

```json
{
  "name": "Example User",
  "username": "example_user",
  "email": "user@example.com",
  "password": "at-least-8-characters",
  "phone": "+919876543210"
}
```

The backend rejects registration without a valid phone number.

### `POST /api/v1/auth/google`

Required JSON:

```json
{
  "idToken": "<Firebase ID token>",
  "phone": "+919876543210"
}
```

The endpoint verifies the Firebase ID token and then links/creates the application account. Phone numbers are normalized to E.164-style format; a 10-digit Indian number is normalized with `+91`.

## Android setup

1. Put the Firebase `google-services.json` in `app/`.
2. Enable Google as a Firebase Authentication provider.
3. Add the Android app's SHA-1 fingerprint in Firebase.
4. Ensure the Web OAuth client ID is available to the app as `GOOGLE_WEB_CLIENT_ID` in `backend.properties`.
5. Build with the existing Firebase Auth + Credential Manager dependencies.

For production, use HTTPS for the backend API. Never put backend secrets in the Android app.
