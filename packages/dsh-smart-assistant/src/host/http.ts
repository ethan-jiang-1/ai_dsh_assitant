/**
 * The one JSON response surface for the host routes.
 *
 * Why: four routes carried byte-identical headers/failure/json helpers. A security header is a
 * policy, not a local detail — one owner means a future header cannot reach three routes and miss
 * the fourth.
 *
 * @module dsh-smart-assistant/host/http
 */

/** The headers every host JSON response carries. */
export function jsonHeaders(): Record<string, string> {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
}

/** Serialize one JSON response; 200 when no status is given. */
export function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders() })
}

/** A stable JSON error; `message` is only for action failures that expose a cause. */
export function failure(status: number, error: string, message?: string): Response {
  return json(message === undefined ? { error } : { error, message }, status)
}
