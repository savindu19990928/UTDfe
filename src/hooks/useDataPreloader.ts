/**
 * Data preloader — intentionally empty.
 *
 * Data is loaded lazily by each page when needed.
 * Once loaded, the apiCache makes it available to other pages
 * via stale-while-revalidate, so e.g. if CatalogPage loads
 * sale products, QuickSale can reuse them from cache.
 */
export function useDataPreloader() {


  // No-op: each page fetches its own data on demand.
  // The shared apiCache ensures cross-page data reuse.
}