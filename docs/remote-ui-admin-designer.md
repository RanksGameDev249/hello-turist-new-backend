# Remote UI / UX Designer

## Purpose

The Admin Panel provides a visual UI/UX designer for configuring supported Android screens without deploying arbitrary Android code. The backend stores a validated, versioned screen schema and the Android client renders that schema using its trusted component library.

## Supported control model

Admins can configure, per app role and screen:

- theme tokens: colors, typography, spacing, corner radius and elevation
- screen background and safe-area presentation
- ordered sections and visibility
- banners, cards, lists, grids, buttons, text, images and quick actions
- navigation labels/icons and ordering
- copy/content references and localization keys
- role-specific variants for RIDER, DRIVER and GUIDE
- draft, preview, publish and rollback versions

The first-class screen identifiers are `RIDER_HOME`, `RIDER_TRIPS`, `RIDER_WALLET`, `RIDER_PROFILE`, `RIDE_DETAIL`, `DRIVER_HOME`, `DRIVER_RIDES`, `DRIVER_PROFILE`, `GUIDE_HOME`, `GUIDE_RIDES`, and `GUIDE_PROFILE`.

## Safety and security

The designer is **not** an arbitrary code execution system. Component types, actions, deep links, URLs and design-token ranges are allowlisted and validated server-side. Authentication and admin authorization are required for mutation. Every publish/rollback operation is audited.

Safety-critical flows such as SOS, verification, payment confirmation, ride state transitions, location permissions, recording consent and notification permission cannot be disabled or bypassed by a remote UI schema.

## Publishing

1. Admin edits a draft.
2. Backend validates schema and referenced assets/actions.
3. Admin previews the result.
4. Admin publishes a new immutable version.
5. Android fetches the latest compatible version and caches it.
6. If the schema is invalid or unavailable, Android falls back to the last known-good version and then to its bundled UI.

## Branding and ASO

Admin branding settings are separate from the screen schema and can configure in-app app name/logo/icon assets. Launcher icon/name changes for an already-installed APK require a new Android build/release. Store ASO metadata is likewise release/store controlled, not arbitrary runtime code.
