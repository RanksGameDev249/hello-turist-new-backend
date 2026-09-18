# UX / UI Design Specification

## 1. Design direction
Premium, calm, trustworthy and operationally clear. Safety actions must be highly visible without making the interface alarmist.

## 2. Information hierarchy
During an active trip:
1. Safety
2. Trip status
3. Location/route
4. Driver/Guide identity
5. ETA
6. Payment/fare
7. Secondary actions

## 3. Design system
### Typography
Use a highly legible sans-serif typeface with clear scale:
- Display: 28–32sp
- H1: 24sp
- H2: 20sp
- Body: 16sp
- Secondary: 14sp
- Caption: 12sp

### Spacing
Use a 4dp base grid; common spacing: 4, 8, 12, 16, 24, 32.

### Components
Buttons, cards, bottom sheets, chips, status badges, map controls, search bars, segmented controls, dialogs, snackbars, skeletons, empty states and error states.

### Status semantics
Status must be conveyed through label + icon + shape/position, not color alone.

## 4. Rider navigation
Home / Trips / Explore / Safety / Profile.

## 5. Driver and Guide navigation
Home / Requests / Trips / Earnings / Profile.

## 6. Core screens
- Splash / session restore
- Login / OTP
- Google authentication
- Role selection
- Rider onboarding
- Driver onboarding step 1/2/3
- Guide onboarding step 1/2/3
- Rider home
- Location search
- Ride-purpose sheet
- Ride quote
- Driver matching
- Guide discovery
- Combined booking
- Active trip
- Safety Center
- SOS flow
- Trusted contacts
- Ride history
- Payment details
- Ratings
- Driver/Guide dashboard
- Verification status
- Admin web screens

## 7. Booking UX
1. Select pickup.
2. Select destination.
3. Choose ride purpose.
4. Select ride type.
5. Optionally add Guide.
6. Review quote.
7. Choose payment.
8. Confirm.
9. Show searching state.
10. Show assignment.
11. Show active trip.

## 8. SOS UX
SOS remains reachable during an active ride. Use a deliberate press/hold or confirmation countdown to reduce accidental activation. Once activated, immediately show incident state and available next actions.

## 9. Permission UX
Ask for permissions contextually, immediately before the feature needs them. Explain background location, notifications, camera, microphone and other permissions. Provide a useful degraded mode if permission is denied.

## 10. Accessibility
- Minimum touch target around 48dp.
- Dynamic text support.
- Screen-reader labels.
- Sufficient contrast.
- No color-only state communication.
- Reduced-motion consideration.
- Clear focus order.

## 11. Loading/error/empty states
Every network-backed screen must have loading, empty, retry and offline variants.

## 12. Design tokens
Centralize dimensions, typography, shapes, elevation, animation durations and semantic statuses so Rider/Driver/Guide experiences remain consistent.
## Language & Region UX
Add language selection during account creation and Settings → Language & Region. Recommend from device locale and coarse region without silently changing a selected language. Support search, native names, fallback states and future RTL layouts.
