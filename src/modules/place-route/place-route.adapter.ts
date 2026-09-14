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

export class MockPlaceRouteAdapter implements PlaceRouteAdapter {
  async searchPlaces(query: string, location: Coordinate = { latitude: 30.9000, longitude: 75.8573 }) {
    return [{
      placeId: `mock-${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: query,
      address: query,
      location,
    }];
  }

  async getPlace(placeId: string) {
    return {
      placeId,
      name: placeId,
      address: placeId,
      location: { latitude: 30.9000, longitude: 75.8573 },
    };
  }

  async getRoute(origin: Coordinate, destination: Coordinate) {
    const distanceMeters = haversineMeters(origin, destination);
    return { distanceMeters, durationSeconds: Math.ceil(distanceMeters / 8.33) };
  }
}

function haversineMeters(a: Coordinate, b: Coordinate) {
  const earthRadius = 6371000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * earthRadius * Math.asin(Math.sqrt(x)));
}
