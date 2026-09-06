import fetch from "node-fetch";

/**
 * Forward-geocodes a free-text address into lat/lng using OpenStreetMap's
 * Nominatim service. No API key required, but it's rate-limited and asks
 * for a descriptive User-Agent — fine for this volume, swap for Google
 * Geocoding or Mapbox if you outgrow it.
 */
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "SahmTicketHub/1.0 (contact: hello@sahmtickethub.online)" },
  });

  if (!res.ok) throw new Error("Geocoding service unavailable.");

  const results = await res.json();
  if (!results.length) return { latitude: null, longitude: null };

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
}
