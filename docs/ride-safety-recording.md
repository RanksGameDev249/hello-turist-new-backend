# Ride safety audio/video recording

## Purpose
Audio/video recording is a safety feature for active rides. It is not a general-purpose background recorder.

## Consent and mandatory roles
- The rider must see a clear recording disclosure and explicitly grant recording consent before an active ride can start when recording is enabled by policy.
- Drivers and guides must have recording permission enabled and acknowledged as a mandatory safety requirement before they can accept/start rides.
- The application must never silently record. Camera and microphone runtime permissions must be requested by Android at the point of use.
- If required permission or consent is absent, the ride-start flow must stop and explain what is required.

## Recording lifecycle
1. Before ride start, show purpose, media types (audio/video), who can access recordings, retention, and safety-use terms.
2. Request camera/microphone runtime permissions as applicable.
3. Record only while the ride is active.
4. Show an always-visible recording indicator while recording.
5. Allow the rider to see that recording is active; do not provide a hidden/background mode.
6. Stop recording automatically when the ride ends or is cancelled.
7. Upload recordings only to private encrypted object storage using authenticated APIs.

## Security
- Store only private object references in the application database; do not expose public media URLs.
- Restrict access to authorized safety/support workflows and audit access.
- Encrypt in transit and at rest.
- Apply a configurable, bounded retention period and delete expired media.
- Validate ride membership/role server-side for every recording operation.
- Never treat a client-provided recording-success flag as authoritative.

## Terms & Conditions
By enabling ride recording, the user acknowledges that audio/video may be captured during the active ride for safety, incident investigation, and support purposes. Recording is limited to the active ride, protected access is used, and retention is limited according to the configured safety-retention policy. Required permissions and consent must be granted before recording starts. Where recording is mandatory for a driver or guide, that provider cannot start/accept the ride until the required permission and acknowledgement are complete.

## Implementation status
The backend policy and consent schema are now documented. Android camera/microphone runtime permission UI, recording lifecycle, encrypted upload, retention worker, and server-side recording endpoints must be wired to this policy before the feature is represented as production-ready.
