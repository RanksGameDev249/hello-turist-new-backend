# Google + Firebase Phone Authentication

The application supports two identity steps:

1. `POST /api/v1/auth/google` accepts a Google ID token and client nonce. The backend verifies the JWT signature against Google's published signing keys and checks issuer, audience, expiry, verified email and nonce.
2. `POST /api/v1/auth/firebase/phone/link` requires the existing Hello Kurukshetra access token plus a Firebase ID token from Firebase Phone Authentication. The backend validates the Firebase token through Firebase Authentication REST `accounts:lookup`, then links the verified phone number to the current user.

For standalone phone sign-in, `POST /api/v1/auth/firebase/phone` can validate the Firebase ID token and create or restore the application account.

## Environment

```env
GOOGLE_WEB_CLIENT_ID=your-oauth-web-client-id
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
```

`GOOGLE_WEB_CLIENT_ID` must match the server client ID used by Android Credential Manager. `FIREBASE_WEB_API_KEY` is the Firebase project's Web API key used by the Authentication REST API.

The Android app requires a verified phone after Google/password authentication before it continues into onboarding. The normal Hello Kurukshetra access/refresh session remains the application session.
