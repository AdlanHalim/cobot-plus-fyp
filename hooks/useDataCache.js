/**
 * @file useDataCache.js
 * @location cobot-plus-fyp/hooks/useDataCache.js
 * 
 * @description
 * Simple in-memory data caching hook for Supabase queries.
 * Prevents redundant database fetches when navigating between pages.
 * 
 * Features:
 * - Cache with TTL (time-to-live)
 * - Stale-while-revalidate pattern
 * - Manual cache invalidation
 * - Memory cleanup on unmount
 * 
 * @example
 * const { data, isLoading, refetch } = useDataCache({
 *   key: 'sections',
 *   fetcher: () => supabase.from('sections').select('*'),
 *   ttl: 60000, // 1 minute
 * });
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Global cache store (persists across component instances)
const cache = new Map();
const cacheTimestamps = new Map();

/**
 * Custom hook for caching Supabase query results.
 * 
 * @param {Object} options
 * @param {string} options.key - Unique cache key
 * @param {Function} options.fetcher - Async function that returns { data, error }
 * @param {number} options.ttl - Cache time-to-live in ms (default: 60000 = 1 min)
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {Array} options.dependencies - Extra dependencies to trigger refetch
 * 
 * @returns {{
 *   data: any,
 *   error: Error | null,
 *   isLoading: boolean,
 *   isStale: boolean,
 *   refetch: Function,
 *   clearCache: Function
 * }}
 */
export function useDataCache({
    key,
    fetcher,
    ttl = 60000, // 1 minute default
    enabled = true,
    dependencies = [],
}) {
    const [data, setData] = useState(cache.get(key) || null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(!cache.has(key));
    const [isStale, setIsStale] = useState(false);

    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    // Check if cached data is stale
    const isCacheStale = useCallback(() => {
        const timestamp = cacheTimestamps.get(key);
        if (!timestamp) return true;
        return Date.now() - timestamp > ttl;
    }, [key, ttl]);

    // Fetch data and update cache
    const fetchData = useCallback(async (showLoading = true) => {
        if (!enabled) return;

        if (showLoading && !cache.has(key)) {
            setIsLoading(true);
        }

        try {
            const result = await fetcherRef.current();

            if (result.error) {
                setError(result.error);
                console.error(`Cache fetch error for '${key}':`, result.error);
            } else {
                // Update cache
                cache.set(key, result.data);
                cacheTimestamps.set(key, Date.now());

                setData(result.data);
                setError(null);
                setIsStale(false);
            }
        } catch (err) {
            setError(err);
            console.error(`Cache fetch exception for '${key}':`, err);
        } finally {
            setIsLoading(false);
        }
    }, [key, enabled]);

    // Initial fetch / stale check
    useEffect(() => {
        if (!enabled) return;

        // If we have cached data, use it immediately
        if (cache.has(key)) {
            setData(cache.get(key));
            setIsLoading(false);

            // Check if stale and refetch in background
            if (isCacheStale()) {
                setIsStale(true);
                fetchData(false); // Background refetch
            }
        } else {
            // No cache, fetch fresh
            fetchData(true);
        }
    }, [key, enabled, fetchData, isCacheStale, ...dependencies]);

    // Manual refetch
    const refetch = useCallback(() => {
        cache.delete(key);
        cacheTimestamps.delete(key);
        return fetchData(true);
    }, [key, fetchData]);

    // Clear this cache entry
    const clearCache = useCallback(() => {
        cache.delete(key);
        cacheTimestamps.delete(key);
        setData(null);
        setIsStale(false);
    }, [key]);

    return {
        data,
        error,
        isLoading,
        isStale,
        refetch,
        clearCache,
    };
}

/**
 * Clear all cached data.
 * Useful after logout or critical data changes.
 */
export function clearAllCache() {
    cache.clear();
    cacheTimestamps.clear();
}

/**
 * Clear specific cache entries by key prefix.
 * @param {string} prefix - Key prefix to match
 */
export function clearCacheByPrefix(prefix) {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
            cacheTimestamps.delete(key);
        }
    }
}

export default useDataCache;
