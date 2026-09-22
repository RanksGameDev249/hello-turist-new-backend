# Curated Discovery, Sponsors, Homestays & Historical Places

## Purpose
Hello Kurukshetra provides a curated discovery layer controlled by the Admin panel. This layer is separate from generic third-party merchant/shop search.

## Rider Home
The Home screen must show Admin-managed:
- Homestays
- Historical places

Historical-place cards should support name, image, location, description and historical information/history.

Homestay cards should support name, images, location/address, amenities and optional starting price/contact/website information.

## Curated Map
The curated discovery map must show only records managed by Hello Kurukshetra Admin:
- Sponsors
- Homestays

No generic merchant/shop records may be returned by the curated discovery API.

The normal underlying map provider may still render its own base-map labels according to the configured map style. The restriction applies to the application's curated markers/listings layer.

## Admin Panel
Admins can:
1. Add a Sponsor, Homestay or Historical Place.
2. Enter exact latitude and longitude.
3. Enter address/city.
4. Add description and images.
5. Add homestay amenities and optional starting price/contact/website.
6. Add historical information for historical places.
7. Mark a listing as featured.
8. Activate/deactivate a listing.
9. Edit existing listings.

Only active listings are exposed to Riders.

## Backend API contract
- `GET /api/v1/discovery/map` — only active Admin-managed Sponsors and Homestays.
- `GET /api/v1/discovery/home` — only active Admin-managed Homestays and Historical Places.
- `GET /api/v1/discovery/:id` — one curated record.
- `GET /api/v1/discovery/admin/list` — Admin listing management.
- `POST /api/v1/discovery/admin` — Admin creates a curated record.
- `PATCH /api/v1/discovery/admin/:id` — Admin edits a curated record.
- `DELETE /api/v1/discovery/admin/:id` — Admin deactivates a curated record.

## Data types
`SPONSOR`, `HOMESTAY`, `HISTORICAL_PLACE`.

## Acceptance criteria
- A third-party shop/merchant is never returned by the curated map endpoint.
- A Homestay created by Admin appears in both the curated map and Home listing while active.
- A Sponsor created by Admin appears in the curated map while active.
- A Historical Place created by Admin appears in Home discovery while active.
- Deactivated records disappear from Rider-facing discovery responses.
- Coordinates entered by Admin are returned to the client for map markers.
- Admin create/update/deactivate actions are audit logged.
