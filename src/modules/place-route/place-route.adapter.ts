export type Coordinate = { latitude: number; longitude: number };

export type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
  location: Coordinate;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
};

export interface PlaceRouteAdapter {
  searchPlaces(query: string, location?: Coordinate): Promise<PlaceSearchResult[]>;
  getPlace(placeId: string): Promise<PlaceSearchResult | null>;
  getRoute(origin: Coordinate, destination: Coordinate): Promise<RouteResult>;
}

/**
 * Google Maps Platform adapter.
 * GOOGLE_MAPS_API_KEY is server-side only and must never be shipped in the Android APK.
 */
export class GooglePlaceRouteAdapter implements PlaceRouteAdapter {
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  private requireApiKey() {
    if (!this.apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY_MISSING");
    }
    return this.apiKey;
  }

  async searchPlaces(query: string, location?: Coordinate): Promise<PlaceSearchResult[]> {
    const key = this.requireApiKey();
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        ...(location
          ? {
              locationBias: {
                circle: {
                  center: { latitude: location.latitude, longitude: location.longitude },
                  radius: 50000,
                },
              },
            }
          : {}),
      }),
    });

    const json = await this.readJson(response);
    return (json.places ?? []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? "",
      location: {
        latitude: Number(place.location?.latitude),
        longitude: Number(place.location?.longitude),
      },
    }));
  }

  async getPlace(placeId: string): Promise<PlaceSearchResult | null> {
    const key = this.requireApiKey();
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
      },
    });

    if (response.status === 404) return null;
    const place: any = await this.readJson(response);
    return {
      placeId: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? "",
      location: {
        latitude: Number(place.location?.latitude),
        longitude: Number(place.location?.longitude),
      },
    };
  }

  async getRoute(origin: Coordinate, destination: Coordinate): Promise<RouteResult> {
    const key = this.requireApiKey();
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    const json: any = await this.readJson(response);
    const route = json.routes?.[0];
    if (!route) throw new Error("GOOGLE_ROUTE_NOT_FOUND");

    return {
      distanceMeters: Number(route.distanceMeters),
      durationSeconds: parseDurationSeconds(route.duration),
      polyline: route.polyline?.encodedPolyline,
    };
  }

  private async readJson(response: Response): Promise<any> {
    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("GOOGLE_MAPS_INVALID_RESPONSE");
    }
    if (!response.ok) {
      const message = json?.error?.message || `Google Maps request failed (${response.status})`;
      throw new Error(`GOOGLE_MAPS_ERROR:${message}`);
    }
    return json;
  }
}

function parseDurationSeconds(value: unknown): number {
  if (typeof value !== "string") return 0;
  const match = value.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.ceil(Number(match[1])) : 0;
}
