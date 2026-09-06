// frontend/src/lib/queries.ts
import { apiGet, apiPost } from "./apiClient";
import type { EventWithTicketTypes } from "../types";

// ─── Helper: Derived flags ─────────────────────────────────────────
function withDerivedFlags(events: EventWithTicketTypes[]): EventWithFlags[] {
  const now = Date.now();
  return events.map((e) => {
    const start = new Date(e.start_at).getTime();
    const end = e.end_at ? new Date(e.end_at).getTime() : start + 8 * 60 * 60 * 1000;
    const createdRecently = Date.now() - new Date(e.created_at).getTime() < 21 * 24 * 60 * 60 * 1000;
    return {
      ...e,
      _isLive: now >= start && now <= end,
      _isNew: createdRecently,
    };
  });
}

interface EventWithFlags extends EventWithTicketTypes {
  _isLive: boolean;
  _isNew: boolean;
}

// ─── All published events ──────────────────────────────────────────
export async function fetchPublishedEvents(): Promise<EventWithFlags[]> {
  console.log("🔍 fetchPublishedEvents: Starting...");
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>("/api/events");
    const events = response.events || [];
    console.log(`✅ fetchPublishedEvents: Found ${events.length} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ fetchPublishedEvents error:", error);
    throw error;
  }
}

// ─── Single event by slug ──────────────────────────────────────────
export async function fetchEventBySlug(slug: string): Promise<EventWithFlags | null> {
  console.log(`🔍 fetchEventBySlug: Looking for slug: ${slug}`);
  try {
    const response = await apiGet<{ event: EventWithTicketTypes }>(`/api/events/slug/${slug}`);
    if (!response.event) {
      console.log(`⚠️ fetchEventBySlug: No event found for slug: ${slug}`);
      return null;
    }
    console.log(`✅ fetchEventBySlug: Found event: ${response.event.title}`);
    const events = withDerivedFlags([response.event]);
    return events[0] || null;
  } catch (error) {
    console.error(`❌ fetchEventBySlug error for ${slug}:`, error);
    throw error;
  }
}

// ─── Upcoming events ──────────────────────────────────────────────
export async function fetchUpcomingEvents(limit = 3): Promise<EventWithFlags[]> {
  console.log(`🔍 fetchUpcomingEvents: Fetching ${limit} upcoming events...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/upcoming?limit=${limit}`);
    const events = response.events || [];
    console.log(`✅ fetchUpcomingEvents: Found ${events.length} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ fetchUpcomingEvents error:", error);
    throw error;
  }
}

// ─── New events (just dropped) ────────────────────────────────────
export async function fetchNewEvents(limit = 8): Promise<EventWithFlags[]> {
  console.log(`🔍 fetchNewEvents: Fetching ${limit} new events...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/new?limit=${limit}`);
    const events = response.events || [];
    console.log(`✅ fetchNewEvents: Found ${events.length} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ fetchNewEvents error:", error);
    throw error;
  }
}

// ─── Trending events (by tickets sold) ────────────────────────────
export async function fetchTrendingEvents(limit = 6): Promise<EventWithFlags[]> {
  console.log(`🔍 fetchTrendingEvents: Fetching ${limit} trending events...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/trending?limit=${limit}`);
    const events = response.events || [];
    console.log(`✅ fetchTrendingEvents: Found ${events.length} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ fetchTrendingEvents error:", error);
    throw error;
  }
}

// ─── Featured event ────────────────────────────────────────────────
export async function fetchFeaturedEvent(): Promise<EventWithFlags | null> {
  console.log("🔍 fetchFeaturedEvent: Fetching featured event...");
  try {
    const response = await apiGet<{ event: EventWithTicketTypes | null }>("/api/events/featured");
    if (!response.event) {
      console.log("⚠️ fetchFeaturedEvent: No featured event found");
      return null;
    }
    console.log(`✅ fetchFeaturedEvent: Found event: ${response.event.title}`);
    const events = withDerivedFlags([response.event]);
    return events[0] || null;
  } catch (error) {
    console.error("❌ fetchFeaturedEvent error:", error);
    throw error;
  }
}

// ─── Sponsored events ──────────────────────────────────────────────
export async function fetchSponsoredEvents(limit = 10): Promise<EventWithFlags[]> {
  console.log(`🔍 fetchSponsoredEvents: Fetching sponsored events...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/sponsored?limit=${limit}`);
    const events = response.events || [];
    console.log(`✅ fetchSponsoredEvents: Found ${events.length} sponsored events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ fetchSponsoredEvents error:", error);
    throw error;
  }
}

// ─── Events by category ────────────────────────────────────────────
export async function fetchEventsByCategory(category: string): Promise<EventWithFlags[]> {
  console.log(`🔍 fetchEventsByCategory: Fetching ${category} events...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/category/${encodeURIComponent(category)}`);
    const events = response.events || [];
    console.log(`✅ fetchEventsByCategory: Found ${events.length} ${category} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error(`❌ fetchEventsByCategory error for ${category}:`, error);
    throw error;
  }
}

// ─── Search events ──────────────────────────────────────────────────
export async function searchEvents(query: string): Promise<EventWithFlags[]> {
  console.log(`🔍 searchEvents: Searching for "${query}"...`);
  try {
    const response = await apiGet<{ events: EventWithTicketTypes[] }>(`/api/events/search?q=${encodeURIComponent(query)}`);
    const events = response.events || [];
    console.log(`✅ searchEvents: Found ${events.length} events`);
    return withDerivedFlags(events);
  } catch (error) {
    console.error("❌ searchEvents error:", error);
    throw error;
  }
}

// ─── Sponsors ──────────────────────────────────────────────────────
export async function fetchSponsors(): Promise<{ id: string; name: string; logo_text: string }[]> {
  console.log("🔍 fetchSponsors: Fetching sponsors...");
  try {
    const response = await apiGet<{ sponsors: { id: string; name: string; logo_text: string }[] }>("/api/sponsors");
    const sponsors = response.sponsors || [];
    console.log(`✅ fetchSponsors: Found ${sponsors.length} sponsors`);
    return sponsors;
  } catch (error) {
    console.error("❌ fetchSponsors error:", error);
    throw error;
  }
}

// ─── Check if events exist ──────────────────────────────────────────
export async function checkEventsExist(): Promise<{ count: number; sample: any[] }> {
  console.log("🔍 checkEventsExist: Checking database...");
  try {
    const response = await apiGet<{ count: number; sample: any[] }>("/api/events/count");
    console.log(`✅ checkEventsExist: Found ${response.count || 0} total events`);
    return response;
  } catch (error) {
    console.error("❌ checkEventsExist error:", error);
    throw error;
  }
}

// ─── Check API connection ──────────────────────────────────────────
export async function checkApiConnection(): Promise<boolean> {
  console.log("🔍 checkApiConnection: Testing connection...");
  try {
    const response = await apiGet<{ ok: boolean }>("/health");
    console.log("✅ checkApiConnection: Connection successful");
    return response.ok === true;
  } catch (error) {
    console.error("❌ checkApiConnection error:", error);
    return false;
  }
}

// ─── Event stats (admin only) ──────────────────────────────────────
export async function getEventStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  cancelled: number;
  featured: number;
  sponsored: number;
  newDrops: number;
}> {
  console.log("🔍 getEventStats: Fetching stats...");
  try {
    const response = await apiGet<{
      stats: {
        total: number;
        published: number;
        draft: number;
        cancelled: number;
        featured: number;
        sponsored: number;
        newDrops: number;
      }
    }>("/api/admin/events/stats");
    return response.stats || {
      total: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
      featured: 0,
      sponsored: 0,
      newDrops: 0,
    };
  } catch (error) {
    console.error("❌ getEventStats error:", error);
    return {
      total: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
      featured: 0,
      sponsored: 0,
      newDrops: 0,
    };
  }
}

// ─── Create test event (admin only) ────────────────────────────────
export async function createTestEvent(organizerId: string): Promise<boolean> {
  console.log("🔍 createTestEvent: Creating test event...");
  try {
    const response = await apiPost<{ success: boolean }>("/api/admin/events/test", { organizerId });
    console.log("✅ createTestEvent: Success:", response.success);
    return response.success === true;
  } catch (error) {
    console.error("❌ createTestEvent error:", error);
    return false;
  }
}

// ─── Export all for convenience ──────────────────────────────────────
export default {
  fetchPublishedEvents,
  fetchEventBySlug,
  fetchUpcomingEvents,
  fetchNewEvents,
  fetchTrendingEvents,
  fetchFeaturedEvent,
  fetchSponsoredEvents,
  fetchEventsByCategory,
  searchEvents,
  fetchSponsors,
  checkEventsExist,
  checkApiConnection,
  getEventStats,
  createTestEvent,
};