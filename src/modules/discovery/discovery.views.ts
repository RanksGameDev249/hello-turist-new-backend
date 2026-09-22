import { listPublishedDiscovery } from "./discovery.service";

export async function listMapPlaces(limit = 100) {
  const [sponsors, homestays] = await Promise.all([
    listPublishedDiscovery({ type: "SPONSOR", limit }),
    listPublishedDiscovery({ type: "HOMESTAY", limit }),
  ]);
  return [...sponsors, ...homestays].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

export async function listHomeDiscoveries(limit = 50) {
  const [homestays, historicalPlaces] = await Promise.all([
    listPublishedDiscovery({ type: "HOMESTAY", limit }),
    listPublishedDiscovery({ type: "HISTORICAL_PLACE", limit }),
  ]);
  return [...homestays, ...historicalPlaces].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}
