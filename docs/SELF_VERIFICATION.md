# Application-Owned Driver / Guide Verification

The backend no longer depends on a third-party KYC or live-verification provider.

## Flow

1. Driver/Guide creates a verification request.
2. The user uploads required documents to private storage and supplies the object key/checksum to the backend.
3. The user starts an application-owned live verification session.
4. The server generates an internal `SELF-*` session reference. Clients cannot choose a provider reference or mark the session completed.
5. An authorized admin reviews the documents and live-session activity.
6. Admin approval atomically verifies documents, completes the live session and verification steps, marks the request `VERIFIED`, and marks the DRIVER/GUIDE role assignment `APPROVED`.
7. Rejection requires a reason; the user can resubmit.

## Security rules

- No third-party provider credentials are required.
- Clients never choose an external provider or provider status.
- Live-session completion is an admin decision.
- Expired documents cannot be approved.
- Approval requires at least one document and an in-progress live session.
- Verification state changes are transactional.

## Limitation

This is a manual/application-owned verification workflow. It does not independently authenticate government identity records or perform biometric liveness/face matching. Those capabilities can be added later as optional providers without changing the core verification state machine.
