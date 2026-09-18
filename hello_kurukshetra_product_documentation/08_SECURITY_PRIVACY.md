# Security, Privacy and Abuse Prevention

## 1. Security baseline
- TLS/HTTPS only.
- Short-lived access tokens.
- Refresh-token rotation and revocation.
- Secure Android token storage.
- Server-side RBAC and object-level authorization.
- Rate limiting and abuse controls.
- Strong input validation.
- Parameterized database queries.
- Secure file upload validation and malware scanning where practical.
- Signed webhook verification.
- Private document storage with expiring access URLs.
- Security headers for web admin.
- Secure CORS/CSRF configuration where applicable.

## 2. Privacy by design
Collect only data required for a clear purpose. Explain sensitive permissions at the moment of use. Provide deletion and applicable data-access/export mechanisms.

## 3. Location privacy
- Store only required precision.
- Restrict who can access precise location.
- Separate live operational location from historical analytics.
- Apply retention windows.
- Never expose public permanent live tracking.
- Trip-sharing links must be temporary and revocable.

## 4. Emergency privacy
Nearby responders receive the minimum information necessary to act. Admin access is role-scoped and audited. Family/trusted contacts receive only the scope the Rider consented to.

## 5. Payment security
Never store raw card credentials. Verify provider signatures and server-side payment state. Reconcile webhooks idempotently.

## 6. Abuse prevention
Signals may include impossible travel, repeated cancellations, duplicate devices, suspicious payment patterns, fake-location indicators and document anomalies. Use signals to flag/review rather than automatically punish solely from uncertain detection.

## 7. Android permissions
Request location, background location, notifications, camera, microphone, Bluetooth and activity/sensor permissions only when genuinely needed and supported by current Android policies.

## 8. Logging
Never log passwords, tokens, card data, document contents or unnecessary precise location. Use correlation IDs for support/debugging.

## 9. Audit
Audit:
- role changes
- verification decisions
- payment/refund actions
- fare adjustments
- emergency actions
- user suspension/blocking
- admin configuration changes
## Language/location privacy
Use coarse location only for language recommendations. Do not continuously track location for this purpose. Never infer ethnicity, religion or other sensitive characteristics from language/location.
