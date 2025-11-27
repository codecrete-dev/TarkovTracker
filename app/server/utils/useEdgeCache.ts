/**
 * Server-Side Caching Utility for Cloudflare Edge Cache
 *
 * This utility provides a centralized way to handle Cloudflare Cache API logic
 * with fallback for development environments where caches might not be available.
 */
import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
interface CacheOptions {
  ttl?: number;
  cacheKeyPrefix?: string;
}
/**
 * Helper function that handles Cloudflare Cache API logic
 *
 * @param event - H3 event object
 * @param key - Cache key (will be combined with prefix for uniqueness)
 * @param fetcher - Function that fetches fresh data when cache miss occurs
 * @param ttl - Time to live in seconds (default: 43200 = 12 hours)
 * @returns Promise resolving to cached or fresh data
 */
export async function useEdgeCache<T>(
  event: H3Event,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 43200,
  options: CacheOptions = {}
): Promise<T> {
  const { cacheKeyPrefix = "tarkovtracker" } = options;
  // Cloudflare Workers have a special caches.default property not in standard types
  // In Node.js dev mode, caches is not defined at all
  const isCacheAvailable =
    typeof globalThis.caches !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis.caches as any).default;
  const fullCacheKey = `${cacheKeyPrefix}-${key}`;
  try {
    // Only use Cloudflare Cache API in production (Cloudflare Pages/Workers)
    if (isCacheAvailable) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cache = (globalThis.caches as any).default as Cache;
      // Create a normalized cache key URL using the current host (avoids hardcoding a cache subdomain)
      const runtimeConfig = useRuntimeConfig();
      const appUrl = runtimeConfig?.public?.appUrl;
      const configuredHost = appUrl ? new URL(appUrl).host : null;
      const protocol = appUrl ? new URL(appUrl).protocol : "https:";
      const requestHost = event.node?.req?.headers?.host;
      const cacheHost = configuredHost || requestHost || "tarkovtracker.org";
      const cacheUrl = new URL(`${protocol}//${cacheHost}/__edge-cache/${cacheKeyPrefix}/${key}`);
      const cacheKeyRequest = new Request(cacheUrl.toString());
      // Check cache first
      const cachedResponse = await cache.match(cacheKeyRequest);
      if (cachedResponse) {
        // CACHE HIT - Return immediately
        const data = await cachedResponse.json();
        setResponseHeaders(event, {
          "X-Cache-Status": "HIT",
          "X-Cache-Key": fullCacheKey,
          "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
        });
        return data;
      }
      // CACHE MISS - Fetch fresh data using the provided fetcher function
      console.log(`[EDGE] Cache miss for ${fullCacheKey}`);
      const response = await fetcher();
      // Store in edge cache with TTL
      const cacheResponse = new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
          "X-Cache-Status": "MISS",
          "X-Cache-Key": fullCacheKey,
        },
      });
      // Non-blocking cache write if waitUntil available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfContext = (event.context as any).cloudflare?.context;
      if (cfContext?.waitUntil) {
        cfContext.waitUntil(cache.put(cacheKeyRequest, cacheResponse.clone()));
      } else {
        await cache.put(cacheKeyRequest, cacheResponse.clone());
      }
      setResponseHeaders(event, {
        "X-Cache-Status": "MISS",
        "X-Cache-Key": fullCacheKey,
        "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
      });
      return response;
    } else {
      // DEV MODE - No edge caching, direct fetch using provided fetcher
      console.log(`[DEV] Fetching data for ${fullCacheKey}`);
      const response = await fetcher();
      setResponseHeaders(event, {
        "X-Cache-Status": "DEV",
        "X-Cache-Key": fullCacheKey,
        "Cache-Control": "no-cache",
      });
      return response;
    }
  } catch (error) {
    console.error(`Error in useEdgeCache for ${fullCacheKey}:`, error);
    throw createError({
      statusCode: 502,
      statusMessage: `Failed to fetch data for ${fullCacheKey}`,
    });
  }
}
/**
 * Helper function create a GraphQL fetcher for tarkov.dev API
 */
export function createTarkovFetcher(query: string, variables: Record<string, unknown> = {}) {
  return async () => {
    return await $fetch("https://api.tarkov.dev/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        query,
        variables,
      },
    });
  };
}
