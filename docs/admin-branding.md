# Admin app branding

Admin can manage the server-side branding configuration: app display name, logo URL and launcher icon URL.

These settings are protected by authentication + admin authorization. URLs must use HTTPS.

**Important Android limitation:** changing a runtime setting cannot replace the installed Android launcher icon or application label in an already-installed APK. The Android client should consume branding dynamically for in-app logo/name, while launcher icon/name changes require a build/release pipeline (or an enterprise-managed dynamic launcher strategy). The admin panel therefore stores the desired branding as the authoritative configuration; the release process applies launcher assets when producing a new build.
