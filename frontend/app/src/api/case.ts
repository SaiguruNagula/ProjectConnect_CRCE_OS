/**
 * snake_case ↔ camelCase for whole payloads.
 *
 * The backend read models are documented as mirroring types/domain.ts field for
 * field — every schema docstring names the domain type it answers — so the whole
 * translation between the two is a key rename. One converter here beats a
 * hand-written mapper per endpoint, and cannot drift the way sixty of them
 * would.
 *
 * Keys only. No value is inspected, parsed or reformatted, so stage payloads,
 * evaluation blobs and stored drafts round-trip through the same two calls.
 */

type Rename = (key: string) => string

const toCamel: Rename = (key) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const toSnake: Rename = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

function rename(value: unknown, key: Rename): unknown {
  if (Array.isArray(value)) return value.map((item) => rename(item, key))
  // Anything that is not a plain object is a value — null, a Date, a File —
  // and rebuilding it from its own enumerable keys would destroy it.
  if (value === null || typeof value !== 'object') return value
  if (Object.getPrototypeOf(value) !== Object.prototype) return value
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [key(k), rename(v, key)]))
}

/** A response body, in the frontend's casing. */
export function camelize<T>(body: unknown): T {
  return rename(body, toCamel) as T
}

/** A request body, in the backend's casing. */
export function decamelize(body: unknown): unknown {
  return rename(body, toSnake)
}
