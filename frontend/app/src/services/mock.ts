/**
 * Mock transport helper — the single seam between the UI and data.
 *
 * `resolve()` mimics an async API call (latency + optional failure) so pages
 * exercise real loading/error states today. To go live, replace each service's
 * `resolve(MOCK)` with `apiClient.get(path)` — component code does not change.
 */

const DEFAULT_LATENCY_MS = 350

export function resolve<T>(data: T, latencyMs = DEFAULT_LATENCY_MS): Promise<T> {
  return new Promise((resolveFn) => {
    setTimeout(() => resolveFn(structuredClone(data)), latencyMs)
  })
}

/** Occasionally used in demos to show error states on demand. */
export function reject(message: string, latencyMs = DEFAULT_LATENCY_MS): Promise<never> {
  return new Promise((_, rejectFn) => {
    setTimeout(() => rejectFn(new Error(message)), latencyMs)
  })
}
